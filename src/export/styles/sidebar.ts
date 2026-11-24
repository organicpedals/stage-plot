import { drawBoard, fitInputs, fitText } from '../content'
import { activeParts } from '../parts'
import type { Doc, TableLook } from '../pdfDoc'
import type { Style } from '../pdfStyles'
import { cover, customAccent, DARK, LIGHT, MONO_DARK, pageThemeFor, pal, tone } from './shared'

/**
 * SIDEBAR — barra lateral sólida no preto da capa do Rock Fest nas páginas internas, com nome da banda, índice das seções com a atual marcada e
 * número da página, e uma coluna de conteúdo larga à direita. Mesma paleta e mesmo esquema de temas do Rock Fest: página 1 (capa
 * idêntica à do Rock Fest, sem barra) em grafite, demais páginas em off-white, acento oliva. Rider em largura total com divisores finos.
 */
const BAR = 34
/** barra lateral: o mesmo preto/grafite da capa escura (texto branco ~16:1, apoio e acento oliva >= 4,5:1) */
export const BAR_BG = DARK.bg, BAR_MONO = MONO_DARK.bg
const barColor = (d: Doc) => (d.mono ? BAR_MONO : BAR_BG)
const dim = (d: Doc) => (d.mono ? MONO_DARK.muted : DARK.muted)
const mark = (d: Doc) => (d.mono ? '#FFFFFF' : customAccent(d) ? tone(customAccent(d)!, DARK.bg) : DARK.accent)
const titleOf = (d: Doc, part: string) => ({ intro: d.lang === 'pt' ? 'Capa' : 'Cover', rider: d.L.rider, stage: d.L.stage, inputs: d.L.inputs, light: d.L.light, outro: '' } as Record<string, string>)[part] ?? ''

const table = (d0: Doc): TableLook => ({
  headH: 6.4,
  head(d, x, y, w, h) { d.hline(x, x + w, y + h, pal(d).accent, 0.5); return pal(d).accent },
  zebra: null, rule: { c: d0.th.grid, w: 0.15 }, chColor: pal(d0).accent,
})

/** título da página interna: grande, com divisor */
function title(d: Doc, tag?: string) {
  d.txt(d.sec.num, d.M, d.y + 4, { size: 8, style: 'bold', color: pal(d).accent, cs: 0.8 })
  if (tag) d.txt(tag.toUpperCase(), d.R, d.y + 4, { size: 6.4, style: 'bold', color: d.th.muted, align: 'right', cs: 0.8 })
  d.txt(d.sec.title, d.M, d.y + 14, { size: 22, style: 'bold' })
  d.hline(d.M, d.R, d.y + 19, d.th.grid, 0.2)
  d.y += 26
}

function field(d: Doc, label: string, lines: string[], x: number, y: number, w: number) {
  d.txt(label.toUpperCase(), x, y + 3, { size: 6.2, style: 'bold', color: d.th.muted, cs: 0.7 })
  lines.forEach((l, i) => d.txt(fitText(d, l, w, { size: 9, style: i === 0 ? 'bold' : 'normal' }), x, y + 8 + i * 4.4, { size: 9, style: i === 0 ? 'bold' : 'normal' }))
  return 8 + lines.length * 4.4
}

export const sidebar: Style = {
  id: 'sidebar',
  label: { pt: 'Sidebar', en: 'Sidebar' },
  desc: { pt: 'Barra lateral oliva com índice e página, coluna larga e divisores finos; capa em grafite, miolo claro.', en: 'Olive side bar with index and page number, wide column and thin dividers; graphite cover, light body.' },
  name: { pt: 'Rider técnico', en: 'Technical rider' },
  kicker: { pt: 'Rider técnico', en: 'Technical rider' },
  theme: LIGHT, altTheme: DARK, table, pageTheme: pageThemeFor,

  margins: d => (d.page === 1 || d.part === 'outro' ? { l: 14, r: 14, t: 17, b: 18 } : d.W > d.H ? { l: BAR + 12, r: 12, t: 14, b: 18 } : { l: BAR + 16, r: 16, t: 20, b: 24 }),

  page(d) {
    if (d.page === 1 || d.part === 'outro') return // capa: só foto, nome e contatos
    d.fill(barColor(d)); d.d.rect(0, 0, BAR, d.H, 'F')
    d.txt(d.band, 6, 17, { size: 7.6, style: 'bold', color: '#FFFFFF', cs: 0.6 })
    const parts = activeParts(d.p).filter(x => x !== 'outro'), cur = d.part
    let y = d.W > d.H ? 56 : 74, n = 0
    parts.forEach(pt => {
      const num = pt === 'intro' ? '' : String(++n).padStart(2, '0'), on = pt === cur
      if (on) d.bar(2.8, y - 3.6, 0.8, 5, mark(d))
      if (num) d.txt(num, 6, y, { size: 6.6, font: 'mono', style: on ? 'bold' : 'normal', color: on ? mark(d) : dim(d) })
      d.txt(fitText(d, titleOf(d, pt), BAR - (num ? 17 : 11), { size: 6.8, style: on ? 'bold' : 'normal' }), num ? 14 : 6, y, { size: 6.8, style: on ? 'bold' : 'normal', color: on ? '#FFFFFF' : dim(d) })
      y += 7
    })
  },

  subhead(d, text) {
    d.txt(text.toUpperCase(), d.M, d.y + 4, { size: 7, style: 'bold', color: pal(d).accent, cs: 0.8 })
    d.hline(d.M, d.R, d.y + 6.4, d.th.grid, 0.2); d.y += 10
  },

  intro: cover,
  rider(d, secs) {
    title(d)
    secs.forEach(s => {
      d.need(Math.min(26, d.blocksH(s.blocks, { size: 9, k: 1.46 }) + 12))
      d.hline(d.M, d.R, d.y, d.th.grid, 0.2)
      d.txt(s.title, d.M, d.y + 7, { size: 10.5, style: 'bold' })
      d.y += 10.5
      d.blocks(s.blocks, { size: 9, k: 1.46, gap: 2.6, markerColor: pal(d).accent, after: 5 })
    })
  },

  async board(d, part) {
    title(d, part === 'stage' ? d.L.audioTag : d.L.lightTag)
    d.y -= 6
    await drawBoard(d, part, d.M, d.y, d.cw, d.bottom - d.y)
  },

  inputs(d) { title(d, d.L.audioTag); d.y -= 1; fitInputs(d) },

  chrome(d, i, n, W, H) { chromeOf(d, i, n, W, H) },
}

function chromeOf(d: Doc, i: number, n: number, W: number, H: number) {
    if (i === 1 || d.part === 'outro') return // a capa não tem barra, índice nem rodapé
    d.txt(String(i).padStart(2, '0'), 6, H - (W > H ? 24 : 28), { size: 24, style: 'bold', color: '#FFFFFF' })
    d.txt(`/ ${String(n).padStart(2, '0')}`, 6, H - (W > H ? 18 : 22), { size: 7, color: dim(d) })
    const fy = H - 14
    d.hline(d.M, d.R, fy, d.th.grid, 0.2)
    d.txt(d.L.supersede, d.M, fy + 5, { size: 6, color: d.th.muted })
  }
