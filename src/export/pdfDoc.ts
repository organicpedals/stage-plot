import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'
import type { Project } from '../model/types'
import { THEMES, Theme } from './boardSvg'
import type { Block } from './textFormat'
import type { Style } from './pdfStyles'
import type { Part } from './parts'

/** sans = corpo; display = títulos em caixa alta condensada (Tz 80%); mono = Courier. */
export type FontKind = 'sans' | 'display' | 'mono'

export const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const
/** Luminância relativa (WCAG) de uma cor #rrggbb. */
export function lum(h: string) {
  const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const [r, g, b] = hex(h); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

const MM = 25.4 / 72 // 1 pt em mm
/** Escala horizontal dos títulos display (Helvetica Bold a 80% lê como condensada). */
export const COND = 0.8
const NB = / /g

export const T = {
  pt: { lineup: 'Formação', stage: 'Mapa de palco', inputs: 'Input list', light: 'Mapa de luz', press: 'Press kit', rider: 'Rider técnico', ch: 'CH', name: 'Canal', src: 'Fonte', mic: 'Microfone / DI', stand: 'Suporte', who: 'Músico', lbl: 'Obs.', power: 'Pontos de energia', point: 'Ponto', qty: 'Tomadas', volt: 'Tensão', req: 'Necessário', opt: 'Desejável', ver: 'Versão', tech: 'Coordenador Técnico', mgmt: 'Produtor', contact: 'Contato', supersede: 'Este documento substitui todas as versões anteriores.', bio: 'Biografia', disc: 'Discografia', ach: 'Destaques', links: 'Links', genre: 'Gênero', origin: 'Origem', madeWith: 'Feito com Stage Plot', empty: 'Não informado', audioTag: 'Áudio', lightTag: 'Luz', access: 'Acesso técnico', outputs: 'Saídas', mix: 'Mix', type: 'Tipo' },
  en: { lineup: 'Line-up', stage: 'Stage plot', inputs: 'Input list', light: 'Light plot', press: 'Press kit', rider: 'Technical rider', ch: 'CH', name: 'Channel', src: 'Source', mic: 'Mic / DI', stand: 'Stand', who: 'Player', lbl: 'Notes', power: 'Power points', point: 'Point', qty: 'Outlets', volt: 'Voltage', req: 'Required', opt: 'Preferred', ver: 'Version', tech: 'Technical Coordinator', mgmt: 'Producer', contact: 'Contact', supersede: 'This document supersedes all previous versions.', bio: 'Biography', disc: 'Discography', ach: 'Highlights', links: 'Links', genre: 'Genre', origin: 'Origin', madeWith: 'Made with Stage Plot', empty: 'Not provided', audioTag: 'Audio', lightTag: 'Light', access: 'Technical access', outputs: 'Outputs', mix: 'Mix', type: 'Type' },
}
export type Labels = typeof T.pt

export interface TxtOpts { /** texto girado (graus) */ angle?: number; size?: number; style?: 'normal' | 'bold' | 'italic' | 'bolditalic'; font?: FontKind; color?: string; align?: 'left' | 'right' | 'center'; cs?: number; /** escala horizontal (Tz, 1 = normal; <1 condensa); 'display' usa COND */ tz?: number; /** engrossa o texto: contorno fino (mm) na cor do preenchimento (fill+stroke) */ heavy?: number }
export interface Col { h: string; w: number; mono?: boolean; bold?: boolean; align?: 'left' | 'right' }
/** Aparência das tabelas (cada modelo define a sua). */
export interface TableLook {
  headH?: number
  /** desenha o cabeçalho (fundo/réguas) e devolve a cor do texto dos títulos de coluna */
  head?(d: Doc, x: number, y: number, w: number, h: number): string
  headFont?: 'sans' | 'mono'
  zebra?: string | null
  /** filete entre linhas (null = nenhum) */
  rule?: { c: string; w: number } | null
  /** todas as células em Courier */
  cellMono?: boolean
  chColor?: string
  /** desenho por linha (ex.: cartão) antes do texto */
  row?(d: Doc, ri: number, x: number, y: number, w: number, h: number, n: number): void
}
export interface TableOpts { size?: number; pad?: number; x?: number; width?: number; zebra?: boolean; head?: boolean; minRow?: number; maxLines?: number; bottom?: number }
export interface BlockOpts { x?: number; w?: number; size?: number; k?: number; /** espaço entre parágrafos (mm) */ gap?: number; /** recuo do texto de itens de lista (mm) */ indent?: number; color?: string; style?: TxtOpts['style']; markerColor?: string; after?: number }

export class Doc {
  d: jsPDF
  W: number
  H: number
  /** margem esquerda / direita (cada modelo pode ter as suas por página) */
  M: number
  MR = 14
  topY = 17
  botY = 18
  y: number
  /** parte do PDF em desenho e dados da seção corrente (lidos pelo modelo ao montar cada página) */
  part: Part = 'intro'
  sec = { title: '', num: '' }
  pages: { part: string; l: number; r: number }[] = []
  quiet = false
  th: Theme
  /** tema de cada página (o modelo pode alternar claro/escuro) */
  pageTh: Theme[] = []
  mono: boolean
  L: Labels
  /** Dimensões de cada página (as de mapa são paisagem). */
  dims: { W: number; H: number }[] = [{ W: 210, H: 297 }]
  /** Maior y desenhado por página (sem rodapé), para medir áreas vazias. */
  fillY: number[] = []
  mark(y: number) { if (!this.quiet && y < this.H - 16) this.fillY[this.page] = Math.max(this.fillY[this.page] ?? 0, y) }
  constructor(public p: Project, public tpl: Style, mono = false) {
    this.d = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    this.W = 210; this.H = 297; this.M = 14
    this.mono = mono
    this.th = mono ? THEMES.mono : tpl.theme
    this.base = this.th
    this.L = T[p.lang]
    this.paint()
    this.y = this.top
  }
  private base: Theme
  get lang() { return this.p.lang }
  get cw() { return this.W - this.M - this.MR }
  /** borda direita da área útil */
  get R() { return this.W - this.MR }
  get top() { return this.topY }
  get bottom() { return this.H - this.botY }
  get page() { return this.d.getNumberOfPages() }
  /** cor de acento do modelo (preto no P&B) */
  get acc() { return this.mono ? '#000000' : this.th.accent }
  get ink() { return this.th.fg }

  paint() {
    this.th = this.tpl.pageTheme?.(this) ?? this.base
    this.pageTh[this.page - 1] = this.th
    this.fill(this.th.bg); this.d.rect(0, 0, this.W, this.H, 'F')
    const m = this.tpl.margins(this)
    this.M = m.l; this.MR = m.r; this.topY = m.t; this.botY = m.b ?? 18
    this.pages[this.page - 1] = { part: this.part, l: this.M, r: this.MR }
    this.quiet = true; try { this.tpl.page?.(this) } finally { this.quiet = false }
  }
  setInk(c: string) { const [r, g, b] = hex(c); this.d.setTextColor(r, g, b) }
  fill(c: string) { const [r, g, b] = hex(c); this.d.setFillColor(r, g, b) }
  line(c: string, w: number) { const [r, g, b] = hex(c); this.d.setDrawColor(r, g, b); this.d.setLineWidth(w) }
  hline(x1: number, x2: number, y: number, c = this.th.grid, w = 0.15) { this.mark(y); this.line(c, w); this.d.line(x1, y, x2, y) }
  vline(x: number, y1: number, y2: number, c = this.th.grid, w = 0.15) { this.line(c, w); this.d.line(x, y1, x, y2) }
  setFont(font: FontKind = 'sans', style: TxtOpts['style'] = 'normal', size?: number) {
    const fam = font === 'mono' ? 'courier' : 'helvetica'
    this.d.setFont(fam, font === 'display' ? 'bold' : style); if (size) this.d.setFontSize(size)
  }
  /** Largura em mm de um texto com a fonte/tamanho indicados. */
  tw(s: string, o: TxtOpts = {}) {
    const str = (o.font === 'display' ? s.toUpperCase() : s).replace(NB, ' ')
    this.setFont(o.font, o.style, o.size ?? 9)
    return (this.d.getTextWidth(str) + Math.max(0, str.length - 1) * (o.cs ?? 0) * MM) * (o.tz ?? (o.font === 'display' ? COND : 1))
  }
  txt(s: string, x: number, y: number, o: TxtOpts = {}) {
    const disp = o.font === 'display', str = (disp ? s.toUpperCase() : s).replace(NB, ' ')
    if (o.angle) { this.setFont(o.font, o.style, o.size ?? 9); this.setInk(o.color ?? this.th.fg); this.d.text(str, x, y, { angle: o.angle, charSpace: (o.cs ?? 0) * MM } as never); return this.tw(s, o) }
    this.setFont(o.font, o.style, o.size ?? 9); this.setInk(o.color ?? this.th.fg)
    const w = this.tw(s, o)
    const xx = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x
    this.mark(y + 1)
    const w3 = (this.d.internal as unknown as { write: (s: string) => void }).write
    const z = o.tz ?? (disp ? COND : 1)
    if (z !== 1) w3.call(this.d.internal, `${z * 100} Tz`)
    if (o.heavy) { this.line(o.color ?? this.th.fg, o.heavy); this.d.text(str, xx, y, { charSpace: (o.cs ?? 0) * MM, renderingMode: 'fillThenStroke' } as never) }
    else if (o.cs) this.d.text(str, xx, y, { charSpace: o.cs * MM } as never); else this.d.text(str, xx, y)
    if (z !== 1) w3.call(this.d.internal, '100 Tz')
    return w
  }
  /** Quebra de linha gulosa (NBSP não quebra; palavra maior que a largura é cortada). */
  wrap(s: string, w: number, o: TxtOpts = {}): string[] {
    this.setFont(o.font, o.style, o.size ?? 9)
    const eff = w / (o.tz ?? (o.font === 'display' ? COND : 1))
    const m = (t: string) => this.d.getTextWidth(t.replace(NB, ' '))
    const sp = m(' '), out: string[] = []
    for (const par of String(s ?? '').split(/\r?\n/)) {
      if (!par.trim()) { out.push(''); continue }
      let line = '', lw = 0
      for (const word of (o.font === 'display' ? par.toUpperCase() : par).split(' ').filter(Boolean)) {
        const ww = m(word)
        if (line && lw + sp + ww <= eff) { line += ' ' + word; lw += sp + ww; continue }
        if (line) { out.push(line); line = ''; lw = 0 }
        if (ww <= eff) { line = word; lw = ww; continue }
        let chunk = ''
        for (const ch of word) { if (chunk && m(chunk + ch) > eff) { out.push(chunk); chunk = '' } chunk += ch }
        line = chunk; lw = m(chunk)
      }
      if (line) out.push(line)
    }
    return out
  }
  /** Como wrap, mas evita última linha de uma palavra só (estreita a medida até 8% se o número de linhas não mudar). */
  flow(s: string, w: number, o: TxtOpts = {}): string[] {
    const base = this.wrap(s, w, o), n = base.length
    const one = (l: string[]) => l.length > 1 && l[l.length - 1].trim().split(/\s+/).length < 2
    if (!one(base)) return base
    for (let k = 1; k <= 8; k++) { const t = this.wrap(s, w * (1 - 0.01 * k), o); if (t.length === n && !one(t)) return t }
    return base
  }
  lh(size: number, k = 1.38) { return size * MM * k }

  addPage(orient: 'portrait' | 'landscape' = 'portrait') {
    this.d.addPage('a4', orient)
    this.W = orient === 'landscape' ? 297 : 210; this.H = orient === 'landscape' ? 210 : 297
    this.dims[this.page - 1] = { W: this.W, H: this.H }
    this.paint(); this.y = this.top
  }
  /** Descarta as páginas de `from` até a atual (para refazer uma seção com outra decisão de tema). */
  truncate(from: number) {
    for (let i = this.page; i >= from; i--) this.d.deletePage(i)
    this.pages.length = from - 1; this.dims.length = from - 1; this.pageTh.length = from - 1; this.fillY.length = from
    const l = this.dims[from - 2] ?? { W: 210, H: 297 }; this.W = l.W; this.H = l.H
  }
  need(h: number) { if (this.y + h > this.bottom) this.addPage() }

  bar(x: number, y: number, w: number, h: number, c = this.acc) { this.mark(y + h); this.fill(c); this.d.rect(x, y, w, h, 'F') }

  /** Texto corrido já formatado (blocos de textFormat): parágrafos e listas com recuo, sem viúva/órfã na quebra de página. */
  blocks(bs: Block[], o: BlockOpts = {}) {
    const size = o.size ?? 9.2, x = o.x ?? this.M, w = o.w ?? this.cw, lh = this.lh(size, o.k ?? 1.4), ind = o.indent ?? 4, gap = o.gap ?? 2.6
    bs.forEach((b, i) => {
      if (i > 0 && b.gap) this.y += gap
      const tx = b.kind === 'li' ? x + ind : x, lines = this.flow(b.text, w - (tx - x), { size, style: o.style })
      this.need(Math.min(lines.length, 2) * lh + 0.5)
      if (b.kind === 'li') this.txt(b.marker ?? '•', x, this.y + lh * 0.78, { size, color: o.markerColor ?? o.color, style: 'bold' })
      lines.forEach((ln, k) => {
        if (k > 0 && this.y + lh > this.bottom) this.addPage()
        if (ln) this.txt(ln, tx, this.y + lh * 0.78, { size, color: o.color, style: o.style })
        this.y += lh
      })
    })
    this.y += o.after ?? 0
  }
  /** Altura (mm) que `blocks` ocupa sem quebra de página. */
  blocksH(bs: Block[], o: BlockOpts = {}) {
    const size = o.size ?? 9.2, w = o.w ?? this.cw, lh = this.lh(size, o.k ?? 1.4), ind = o.indent ?? 4, gap = o.gap ?? 2.6
    return bs.reduce((a, b, i) => a + (i > 0 && b.gap ? gap : 0) + this.flow(b.text, w - (b.kind === 'li' ? ind : 0), { size, style: o.style }).length * lh, 0) + (o.after ?? 0)
  }

  /** svg2pdf desloca textos com text-anchor="middle"; aqui o centro é calculado com a métrica do próprio jsPDF. */
  centerTexts(el: SVGSVGElement, widthMm: number) {
    const vbw = el.viewBox.baseVal.width || 1, mmPerUnit = widthMm / vbw
    for (const t of Array.from(el.querySelectorAll('text'))) {
      const anchor = t.getAttribute('text-anchor'); if (anchor !== 'middle' && anchor !== 'end') continue
      const fs = parseFloat(t.getAttribute('font-size') || '0'), x = parseFloat(t.getAttribute('x') || '0')
      if (!fs || !Number.isFinite(x)) continue
      const bold = t.getAttribute('font-weight') === 'bold', italic = t.getAttribute('font-style') === 'italic'
      this.d.setFont('helvetica', bold ? (italic ? 'bolditalic' : 'bold') : (italic ? 'italic' : 'normal'))
      const pt = fs * mmPerUnit * (72 / 25.4)
      this.d.setFontSize(pt)
      const wMm = this.d.getTextWidth(t.textContent || '')
      const w = wMm / mmPerUnit
      t.setAttribute('x', String(x - (anchor === 'middle' ? w / 2 : w))); t.setAttribute('text-anchor', 'start')
    }
  }
  /** Desenha um SVG (viewBox w:h = ratio) dentro de uma caixa, encaixando sem distorcer. */
  async svgFit(svg: string, ratio: number, x: number, y: number, boxW: number, boxH: number, align: 'left' | 'center' = 'center') {
    let w = boxW, h = w / ratio
    if (h > boxH) { h = boxH; w = h * ratio }
    const xx = align === 'center' ? x + (boxW - w) / 2 : x
    const el = svgElement(svg)
    this.centerTexts(el, w)
    this.mark(y + h)
    try { await svg2pdf(el, this.d, { x: xx, y, width: w, height: h }) } finally { el.parentElement?.remove() }
    return { w, h, x: xx }
  }

  private get look(): TableLook { const t = this.tpl.table; return typeof t === 'function' ? t(this) : t }
  /** Altura total (mm) que uma tabela ocupa sem quebrar de página. */
  tableH(cols: Col[], rows: string[][], o: TableOpts = {}) {
    const g = this.tableGeom(cols, o)
    return (this.look.headH ?? 6.4) + rows.reduce((a, r) => a + g.measure(r), 0)
  }
  private tableGeom(cols: Col[], o: TableOpts) {
    const size = o.size ?? 8.2, pad = o.pad ?? 1.3, x0 = o.x ?? this.M, width = o.width ?? this.cw
    const tot = cols.reduce((a, c) => a + c.w, 0), ws = cols.map(c => (c.w / tot) * width)
    const px = 1.6, lh = this.lh(size, 1.25), mono = !!this.look.cellMono
    const cell = (c: Col, v: string, w: number) => this.wrap(v || '', w - px * 2, { size, font: c.mono || mono ? 'mono' : 'sans', style: c.bold ? 'bold' : 'normal' }).slice(0, o.maxLines ?? 6)
    const measure = (row: string[]) => Math.max(o.minRow ?? 0, Math.max(...row.map((v, i) => cell(cols[i], v, ws[i]).length), 1) * lh + pad * 2)
    return { size, pad, x0, width, ws, px, lh, cell, measure, mono }
  }

  /** Tabela: cabeçalho, zebra e filetes conforme `tpl.table`; quebra de linha nas células; cabeçalho repetido. */
  table(cols: Col[], rows: string[][], o: TableOpts = {}) {
    const { size, pad, x0, width, ws, px, lh, cell, measure, mono } = this.tableGeom(cols, o), L = this.look, headH = L.headH ?? 6.4
    const bot = o.bottom ?? this.bottom
    const drawHead = () => {
      if (o.head === false) return
      const hf = L.head ? L.head(this, x0, this.y, width, headH - 0.8) : this.th.fg
      let x = x0
      cols.forEach((c, i) => { this.txt(c.h.toUpperCase(), c.align === 'right' ? x + ws[i] - px : x + px, this.y + headH * 0.58, { size: Math.max(5.4, size - 1.6), style: 'bold', font: L.headFont ?? 'sans', color: hf, cs: 0.35, align: c.align }); x += ws[i] })
      this.y += headH
    }
    if (this.y + headH + (rows.length ? measure(rows[0]) : 0) + 2 > bot) this.addPage()
    drawHead()
    rows.forEach((row, ri) => {
      const rh = measure(row)
      if (this.y + rh > bot) { this.addPage(); drawHead() }
      if (L.row) L.row(this, ri, x0, this.y, width, rh, rows.length)
      else if (o.zebra !== false && L.zebra && ri % 2 === 1) { this.fill(this.mono ? '#F1F1F1' : L.zebra); this.d.rect(x0, this.y, width, rh, 'F') }
      let x = x0
      row.forEach((v, i) => {
        const c = cols[i], lines = cell(c, v, ws[i])
        lines.forEach((ln, li) => { if (ln) this.txt(ln, c.align === 'right' ? x + ws[i] - px : x + px, this.y + pad + lh * (li + 0.78), { size, font: c.mono || mono ? 'mono' : 'sans', style: c.bold ? 'bold' : 'normal', align: c.align, color: c.mono && L.chColor ? (this.mono ? this.th.fg : L.chColor) : undefined }) })
        x += ws[i]
      })
      if (L.rule) this.hline(x0, x0 + width, this.y + rh, this.mono ? '#999999' : L.rule.c, L.rule.w)
      this.y += rh
    })
    this.y += 4
  }

  /** "VERSÃO v1.0 · 2026-11-24" só com o que existe. */
  verDate() { const v = this.p.version.trim(), d = (this.p.updated || '').trim(); return [v && `${this.L.ver.toUpperCase()} ${v}`, d].filter(Boolean).join('  ·  ') }
  get band() { return (this.p.band.name || this.p.name || '').trim().toUpperCase() }
  /** Cabeçalho/rodapé corrente de cada página, desenhado no fim (conhece o total de páginas). */
  chrome() {
    const n = this.page
    for (let i = 1; i <= n; i++) {
      this.d.setPage(i)
      const { W, H } = this.dims[i - 1] ?? { W: 210, H: 297 }
      this.W = W; this.H = H
      const pg = this.pages[i - 1]; if (pg) { this.M = pg.l; this.MR = pg.r; this.part = pg.part as Part }
      this.th = this.pageTh[i - 1] ?? this.base
      this.tpl.chrome(this, i, n, W, H)
    }
    const l = this.dims[n - 1]; if (l) { this.W = l.W; this.H = l.H }
  }
}

export function svgElement(svg: string): SVGSVGElement {
  const el = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement as unknown as SVGSVGElement
  const holder = document.createElement('div')
  holder.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden'
  holder.appendChild(document.importNode(el, true))
  document.body.appendChild(holder)
  return holder.firstElementChild as SVGSVGElement
}

/** Recorta uma imagem (data URL) para uma proporção, centralizada (cover). Opcional: escala de cinza (P&B). */
export async function cropToRatio(src: string, ratio: number, gray = false, maxPx = 2000): Promise<string> {
  const img = new Image()
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('img')); img.src = src })
  const r = img.width / img.height
  const cw = r > ratio ? img.height * ratio : img.width, ch = r > ratio ? img.height : img.width / ratio
  const k = Math.min(1, maxPx / cw), c = document.createElement('canvas')
  c.width = Math.round(cw * k); c.height = Math.round(ch * k)
  const g = c.getContext('2d')!
  if (gray) g.filter = 'grayscale(1) contrast(1.1)'
  g.drawImage(img, (img.width - cw) / 2, (img.height - ch) / 2, cw, ch, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.88)
}

