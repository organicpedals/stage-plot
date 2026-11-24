import { drawBoard, fitInputs, pad2 } from '../content'
import type { Doc } from '../pdfDoc'
import type { TableLook } from '../pdfDoc'
import type { Style } from '../pdfStyles'
import { cover, DARK, LIGHT, pageThemeFor, pal } from './shared'

/**
 * ROCK FEST — sóbrio, só tipografia, grade e espaço. Uma cor de acento (oliva) para números e títulos, réguas finas funcionais.
 * Sem texturas, losangos, molduras, caixas, etiquetas ou contornos decorativos.
 * Página 1 (capa, tema escuro): só a foto da banda em sangria total, o nome e os contatos. Sem foto: fundo escuro liso.
 * Tema por página: só a 1ª (capa) escura; todas as demais claras. P&B: capa preta, resto branco. Sem press kit.
 * Capa só com foto, nome (caixa alta brutalista, centralizado) e os dois contatos; o Rider começa direto na página 2.
 */
const theme = LIGHT, dark = DARK

const table = (d0: Doc): TableLook => {
  const c = pal(d0)
  return {
    headH: 6.4,
    head(d, x, y, w, h) { d.hline(x, x + w, y + h, d.th.fg, 0.4); return d.th.muted },
    zebra: null, rule: { c: c.line, w: 0.15 }, chColor: c.accent,
  }
}

/** título de seção: número grande sem caixa em acento, régua fina, título gigante em sans bold cortado na sangria */
function head(d: Doc, tag?: string) {
  const y0 = d.y, c = pal(d), land = d.W > d.H
  d.txt(d.sec.num, d.M, y0 + 6.4, { size: 15, style: 'bold', color: c.accent })
  d.hline(d.M + 13, d.R - (tag ? 24 : 0), y0 + 4.6, c.line, 0.3)
  if (tag) d.txt(tag.toUpperCase(), d.R, y0 + 5.8, { size: 7, style: 'bold', cs: 1.4, color: d.th.muted, align: 'right' })
  const t = d.sec.title.toUpperCase(), maxW = d.cw * 1.3
  let size = land ? 40 : 60
  while (size > 24 && d.tw(t, { size, style: 'bold' }) > maxW) size -= 2
  const base = y0 + (land ? 21 : 28)
  d.txt(t, d.M - 0.6, base, { size, style: 'bold' })
  d.y = base + (land ? 6 : 8)
}

export const rockfest: Style = {
  id: 'rockfest',
  label: { pt: 'Rock Fest', en: 'Rock Fest' },
  desc: { pt: 'Sóbrio e tipográfico: capa escura só com foto, nome e contatos; miolo claro com um acento oliva.', en: 'Sober and typographic: dark cover with only photo, name and contacts; light body with one olive accent.' },
  name: { pt: 'Rider técnico', en: 'Technical rider' },
  kicker: { pt: 'Rider técnico', en: 'Technical rider' },
  theme, altTheme: dark, table,

  pageTheme: pageThemeFor,

  margins: d => ({ l: 14, r: 14, t: d.W > d.H ? 14 : 17, b: 18 }),

  subhead(d, text) {
    d.txt(text.toUpperCase(), d.M, d.y + 3.8, { size: 7.5, style: 'bold', cs: 1.2, color: pal(d).accent })
    d.hline(d.M, d.R, d.y + 6.2, pal(d).line, 0.3); d.y += 9.5
  },

  intro: cover,

  rider(d, secs) {
    head(d)
    const c = pal(d), size = 8.8, LW = 40, bx = d.M + LW + 5, bw = d.cw - LW - 5
    secs.forEach(s => {
      d.need(Math.min(26, d.blocksH(s.blocks, { size, w: bw, k: 1.38 }) + 8))
      const y0 = d.y, pg0 = d.page
      d.hline(d.M, d.R, y0, c.line, 0.3)
      const tl = d.wrap(s.title, LW, { size: 10.5, font: 'display' })
      tl.forEach((l, i) => d.txt(l, d.M, y0 + 5 + i * 4.2, { size: 10.5, font: 'display' }))
      const tb = y0 + 5 + tl.length * 4.2 - (tl.length ? 1.6 : 4.4) // base do título
      d.y = y0 + 1.4
      d.blocks(s.blocks, { x: bx, w: bw, size, k: 1.38, gap: 2.2, indent: 3.8, markerColor: c.accent })
      d.y = d.page === pg0 ? Math.max(d.y + 2.6, tb + 3.2) : d.y + 2.6
    })
    d.hline(d.M, d.R, d.y, c.line, 0.3)
  },

  async board(d, part) {
    head(d, part === 'stage' ? d.L.audioTag : d.L.lightTag)
    await drawBoard(d, part, d.M, d.y, d.cw, d.bottom - d.y)
  },

  inputs(d) { head(d, d.L.audioTag); fitInputs(d) },

  chrome(d, i, n, W, H) {
    if (i === 1 || d.part === 'outro') return // a capa é só foto, nome e contatos
    const c = pal(d), fy = H - 14
    d.hline(d.M, W - d.MR, fy, c.line, 0.3)
    const stub = d.band
    if (stub) d.txt(stub, d.M, fy + 4.6, { size: 6.8, style: 'bold', cs: 0.25 })
    d.txt(d.L.supersede, d.M, fy + 8.2, { size: 6.6, color: d.th.muted })
    d.txt(`${pad2(i)} / ${pad2(n)}`, W - d.MR, fy + 5.2, { size: 7.5, font: 'mono', style: 'bold', align: 'right' })
    d.txt(d.L.madeWith, W - d.MR, fy + 9.4, { size: 5.8, color: d.th.muted, align: 'right' })
  },
}
