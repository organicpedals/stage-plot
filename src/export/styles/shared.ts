import { THEMES } from '../boardSvg'
import type { Theme } from '../boardSvg'
import { fitText, introOf } from '../content'
import { contrast, lum } from '../pdfDoc'
import type { Doc } from '../pdfDoc'
import { photo } from './tools'

/**
 * Paleta, esquema de temas por página e capa/“sobre” compartilhados pelos modelos Rock Fest e Sidebar.
 * Tema por página: 1ª e última (fechamento da imprensa) escuras; as intermediárias claras. P&B: miolo branco, 1ª e última pretas.
 */
export const MM = 25.4 / 72
/** escala horizontal do nome da capa (condensado simulado) */
const NAME_TZ = 0.7
const F = 'helvetica, Arial, sans-serif'
export const LIGHT: Theme = { bg: '#FAF9F6', fg: '#1C1C1E', muted: '#5A5850', grid: '#E0DDD3', accent: '#6F6620', audio: '#6F6620', stage: '#FFFFFF', font: F }
export const DARK: Theme = { bg: '#1C1C1E', fg: '#F3F1EA', muted: '#B3B0A4', grid: '#38383B', accent: '#B8AB63', audio: '#B8AB63', stage: '#242427', font: F }
export const MONO_DARK: Theme = { bg: '#111111', fg: '#FFFFFF', muted: '#BDBDBD', grid: '#333333', accent: '#FFFFFF', audio: '#DDDDDD', stage: '#1C1C1C', font: F }
export const isDark = (d: Doc) => lum(d.th.bg) < 0.3

/** Cor de destaque escolhida pelo usuário (hex válido) ou undefined. */
export const customAccent = (d: Doc) => (/^#[0-9a-f]{6}$/i.test(d.p.pdfAccent ?? '') ? d.p.pdfAccent!.toUpperCase() : undefined)
/** Ajusta a cor (clareando ou escurecendo) até ter contraste >= 4,5:1 sobre o fundo, mantendo o matiz. */
export function tone(hex: string, bg: string, min = 4.5): string {
  const h = hex.replace('#', ''), rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)), toward = lum(bg) < 0.3 ? 255 : 0
  let c = hex
  for (let k = 1; k <= 20 && contrast(c, bg) < min; k++) c = '#' + rgb.map(v => Math.round(v + (toward - v) * k * 0.05).toString(16).padStart(2, '0')).join('').toUpperCase()
  return c
}

/** tema da página que está sendo criada: SÓ a capa (página 1) é escura; todas as demais, claras */
export function pageThemeFor(d: Doc): Theme {
  const base = d.page === 1 || d.part === 'outro' ? (d.mono ? MONO_DARK : DARK) : (d.mono ? THEMES.mono : LIGHT), c = d.mono ? undefined : customAccent(d)
  return c ? { ...base, accent: tone(c, base.bg), audio: tone(c, base.bg) } : base
}

/** acento único e cor das réguas finas, conforme a página (clara/escura, cor/P&B) */
export const pal = (d: Doc) => {
  const dk = isDark(d)
  if (d.mono) return dk ? { accent: '#FFFFFF', line: '#555555' } : { accent: '#000000', line: '#9A9A9A' }
  const c = customAccent(d)
  return dk ? { accent: c ? tone(c, DARK.bg) : '#B8AB63', line: '#4A4A4E' } : { accent: c ? tone(c, LIGHT.bg) : '#6F6620', line: '#CFCABB' }
}

type GS = { GState: new (o: Record<string, number>) => unknown; setGState(g: unknown): void }
export function alpha(d: Doc, a: number) { const D = d.d as unknown as GS; D.setGState(new D.GState({ opacity: a, 'stroke-opacity': a })) }

/** Capa: foto em sangria total (ou fundo escuro liso), nome da banda e contatos. Nada mais. */
export async function cover(d: Doc) {
  const it = introOf(d), c = pal(d), { W, H, M, cw } = d
  if (it.hasPhoto && d.part !== 'outro' && await photo(d, 0, 0, W, H)) {
    // gradiente escuro suave de baixo para cima, para o texto ficar legível
    // camadas cumulativas (cada uma até o pé da página): rampa suave, sem faixas visíveis
    const n = 70, y0 = H * 0.3, a = 1 - Math.pow(0.08, 1 / n)
    d.fill('#000000'); alpha(d, a)
    for (let i = 0; i < n; i++) { const y = y0 + (H - y0) * Math.pow(i / n, 0.9); d.d.rect(0, y, W, H - y, 'F') }
    alpha(d, 1)
  }
  // contatos centralizados (rótulo, nome, telefone e e-mail), em colunas simétricas em torno do centro da página
  const hOf = (k: (typeof it.contacts)[number]) => 5 + (k.name ? 7 : 0) + [k.tel, k.mail].filter(Boolean).length * 4.6
  const ch = Math.max(0, ...it.contacts.map(hOf)), base = H - 20, cx = W / 2
  const ruleY = it.contacts.length ? base - ch - 6 : base + 4
  // nome brutalista: caixa alta, Helvetica Bold condensada (Tz), tracking negativo, peso reforçado, entrelinha apertada, 1-2 linhas na largura útil
  const nm = it.name.toUpperCase(), o = (size: number) => ({ size, style: 'bold' as const, tz: NAME_TZ, cs: -size * 0.012, heavy: size * 0.0085 })
  const fits = (ls: string[], sz: number) => ls.every(l => d.tw(l, o(sz)) <= cw - sz * 0.02)
  let size = 130, lines: string[] = []
  // prefere 1 linha (a partir de ~56 pt); senão, 2 linhas no maior corpo que couber
  for (let sz = 130; sz >= 56; sz -= 2) if (d.wrap(nm, 9999, o(sz)).length === 1 && fits([nm], sz)) { size = sz; lines = [nm]; break }
  if (!lines.length) for (size = 130; size >= 20; size -= 2) { lines = d.wrap(nm, cw - size * 0.02, o(size)); if (lines.length <= 2 && fits(lines, size)) break }
  const lh = size * MM * 0.86
  // de baixo para cima: contatos, ano de vigência (se houver), nome, "RIDER TÉCNICO"
  let y = ruleY - 10 - (lines.length - 1) * lh
  if (it.year) {
    y = ruleY - 9 - 12 - (lines.length - 1) * lh
  }
  const top = y - size * MM * 0.74 // topo das maiúsculas da 1ª linha
  d.txt(d.tpl.kicker[d.lang].toUpperCase(), cx, top - 6, { size: 8, style: 'bold', cs: 3.2, align: 'center' })
  for (const l of lines) { d.txt(l, cx, y, { ...o(size), align: 'center' }); y += lh }
  if (it.year) d.txt(it.year, cx, ruleY - 9, { size: 13, style: 'bold', cs: 3.5, color: c.accent, align: 'center' })
  if (!it.contacts.length) return
  d.hline(M, W - M, ruleY, c.accent, 0.5)
  const n = it.contacts.length, colW = Math.min(76, (cw - (n - 1) * 8) / n), x0 = cx - (n * colW + (n - 1) * 8) / 2
  it.contacts.forEach((k, i) => {
    const mx = x0 + i * (colW + 8) + colW / 2; let z = ruleY + 6
    d.txt(k.title.toUpperCase(), mx, z, { size: 6.8, style: 'bold', cs: 1.2, color: c.accent, align: 'center' }); z += 2
    if (k.name) { d.txt(fitText(d, k.name, colW, { size: 13, font: 'display' }), mx, z + 5.5, { size: 13, font: 'display', align: 'center' }); z += 7 }
    for (const s of [k.tel, k.mail].filter(Boolean)) { d.txt(fitText(d, s, colW, { size: 8.8 }), mx, z + 4.4, { size: 8.8, align: 'center' }); z += 4.6 }
  })
}
