import { buildItem, ICON_MAP, itemParams, paint } from '../library/icons'
import { itemName, legend } from '../model/derive'
import type { Board, Item, Project } from '../model/types'

export interface Theme { bg: string; fg: string; muted: string; grid: string; accent: string; audio: string; stage: string; font: string }

export const THEMES: Record<'paper' | 'dark' | 'mono', Theme> = {
  paper: { bg: '#F5F4F0', fg: '#16181D', muted: '#5F636B', grid: '#DAD8D2', accent: '#9A5B00', audio: '#0A7A82', stage: '#FFFFFF', font: 'helvetica, Arial, sans-serif' },
  dark: { bg: '#0E1013', fg: '#ECEDEF', muted: '#7C828C', grid: '#23272E', accent: '#FFB020', audio: '#28C7C9', stage: '#14171B', font: 'helvetica, Arial, sans-serif' },
  mono: { bg: '#FFFFFF', fg: '#000000', muted: '#555555', grid: '#CCCCCC', accent: '#000000', audio: '#000000', stage: '#FFFFFF', font: 'helvetica, Arial, sans-serif' },
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Itens cujo tamanho É a medida real (não escalam com o palco). */
const FIXED = new Set(['riser', 'rug', 'screen', 'backdrop', 'truss', 'text', 'arrow'])

/** Fator automático dos ícones conforme o palco: 1× num palco ~9 m de "lado médio";
 *  palcos maiores ampliam os ícones e rótulos para manter leitura, palcos pequenos reduzem um pouco para dar respiro. */
export const autoK = (stage: { w: number; d: number; k?: number }) => Math.max(0.1, (Math.sqrt(stage.w * stage.d) / 9) * (stage.k ?? 1))

const kOf = (it: Item, auto: number) => (it.scale / 100) * (FIXED.has(it.kind) ? 1 : auto)

/** Tamanho do item em metros (com escala do usuário e fator automático do palco). */
export function itemSize(it: Item, auto = 1) {
  const b = buildItem(it)
  const k = kOf(it, auto)
  return { w: (b?.w ?? 40) * k, h: (b?.h ?? 40) * k }
}

/** Meia-largura/meia-altura da caixa envolvente, já considerando a rotação. */
export function itemExtent(it: Item, auto = 1) {
  const { w, h } = itemSize(it, auto), a = (it.rot * Math.PI) / 180, c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a))
  return { hw: (w * c + h * sn) / 2, hh: (w * sn + h * c) / 2 }
}

/** Grupo SVG de um item (sem rótulo). Coordenadas em metros. */
export function itemShape(it: Item, theme: Theme, strokeM = 0.02, auto = 1): string {
  const b = buildItem(it); if (!b) return ''
  const k = kOf(it, auto)
  const accent = it.board === 'light' ? theme.accent : theme.audio
  const sw = strokeM / k
  const inner = paint(b.svg, theme.fg, accent, sw)
  return `<g transform="translate(${it.x} ${it.y}) rotate(${it.rot}) scale(${k}) translate(${-b.w / 2} ${-b.h / 2})" fill="none" stroke="${theme.fg}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`
}

export function itemLabel(it: Item, p: Project, theme: Theme, fs = 0.17, badge?: string, auto = 1): string {
  const { hh } = itemExtent(it, auto), h = hh * 2
  const text = it.kind === 'text' ? (it.label || it.note) : itemName(it, p.lang)
  const ty = it.kind === 'text' ? it.y + fs * 0.35 : it.y + h / 2 + fs * 1.2
  let out = '', y = ty
  if (text) out += `<text x="${it.x}" y="${ty}" font-size="${fs}" font-family="${theme.font}" fill="${theme.fg}" text-anchor="middle">${esc(text)}</text>`
  if (badge && it.kind !== 'text') {
    const w = 0.2 + badge.length * 0.1, by = (text ? y : it.y + h / 2) + 0.07
    out += `<rect x="${it.x - w / 2}" y="${by}" width="${w}" height="0.22" rx="0.11" fill="${theme.audio}"/><text x="${it.x}" y="${by + 0.165}" font-size="0.14" font-weight="bold" font-family="${theme.font}" fill="${theme.bg}" text-anchor="middle">${esc(badge)}</text>`
  }
  return out
}


/** Marca de cor da posição do equipamento de luz: aéreo (azul) ou chão (laranja). */
export const MOUNT = { aereo: { color: '#2F7DE1', pt: 'Aéreo', en: 'Overhead' }, chao: { color: '#E8590C', pt: 'Chão', en: 'Floor' } }
export const mountOf = (it: Item): 'aereo' | 'chao' | '' => { const m = String(itemParams(it).mount ?? ''); return m === 'Chão' ? 'chao' : m === 'Aéreo' ? 'aereo' : '' }

/** Bolinha colorida no canto inferior esquerdo de cada refletor, conforme a posição (aéreo/chão). */
export function mountMarks(items: Item[], theme: Theme, auto = 1): string {
  let out = ''
  for (const it of items.filter(i => i.board === 'light' && mountOf(i))) {
    const { hw, hh } = itemExtent(it, auto), m = mountOf(it) as 'aereo' | 'chao'
    out += `<circle cx="${it.x - hw}" cy="${it.y + hh}" r="${0.1 * auto}" fill="${MOUNT[m].color}" stroke="${theme.bg}" stroke-width="${0.025 * auto}"/>`
  }
  return out
}

export interface BoardOpts { theme: Theme; showGrid?: boolean; showLegend?: boolean; /** régua/escala com as dimensões do palco (padrão: sim) */ showScale?: boolean; title?: string; width?: number; margin?: number }

/** SVG completo e autocontido (unidades = metros). */
export function boardSvg(p: Project, board: Board, o: BoardOpts): { svg: string; w: number; h: number } {
  const { theme } = o
  if (p.items.some(i => i.hidden)) p = { ...p, items: p.items.filter(i => !i.hidden) } // itens ocultos não vão para o desenho
  const sw = p.stage.w, sd = p.stage.d
  const ak = autoK(p.stage), K = ak
  const m = (o.margin ?? 0.9) * K
  const legRows = o.showLegend ? legend(p, board) : []
  const legH = legRows.length ? 0.6 + Math.ceil(legRows.length / 4) * 0.4 * K : 0
  // Itens fora do palco (ex.: luz na plateia, treliça além da borda) ampliam a área: nada é cortado.
  let eL = 0, eR = 0, eT = 0, eB = 0
  for (const it of p.items.filter(i => i.board === board || (board === 'light' && i.board === 'stage' && !['text', 'arrow'].includes(i.kind)))) {
    const ext = itemExtent(it, ak), own = it.board === board, lab = own && it.kind !== 'text' ? 0.35 * K : 0
    // o rótulo (centralizado) também não pode ser cortado
    const txt = own ? (it.kind === 'text' ? (it.label || it.note) : itemName(it, p.lang)) : '', lw = (txt.length * 0.55 * 0.17 * K) / 2 + 0.1 * K
    const hw = Math.max(ext.hw, lw), hh = ext.hh
    eL = Math.max(eL, hw - it.x + 0.2 * K); eR = Math.max(eR, it.x + hw - sw + 0.3 * K)
    eT = Math.max(eT, hh - it.y + 0.2 * K); eB = Math.max(eB, it.y + hh + lab - sd)
  }
  eL = Math.max(0, eL - m * 0.5); eR = Math.max(0, eR - m * 0.5); eT = Math.max(0, eT - m * 0.5); eB = Math.max(0, eB - 0.4 * K)
  // legenda de posição (aéreo/chão): coluna na lateral direita, fora do palco, para não cobrir equipamentos
  const used = board === 'light' ? (['aereo', 'chao'] as const).filter(k => p.items.some(i => i.board === 'light' && mountOf(i) === k)) : []
  const mLabel = (k: 'aereo' | 'chao') => (p.lang === 'pt' ? MOUNT[k].pt : MOUNT[k].en)
  const legW = used.length ? (0.45 + Math.max(...used.map(k => mLabel(k).length)) * 0.13) * K : 0
  eR += legW
  const W = sw + m * 2 + eL + eR
  const H = sd + m * 2 + 0.7 * K + legH + eT + eB
  const parts: string[] = []
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${theme.bg}"/>`)
  parts.push(`<g transform="translate(${m + eL} ${m + 0.5 * K + eT})">`)
  parts.push(`<rect x="0" y="0" width="${sw}" height="${sd}" fill="${theme.stage}" stroke="${theme.fg}" stroke-width="${0.04 * K}"/>`)
  if (o.showGrid !== false) {
    for (let x = 1; x < sw; x++) parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${sd}" stroke="${theme.grid}" stroke-width="${0.012 * K}"/>`)
    for (let y = 1; y < sd; y++) parts.push(`<line x1="0" y1="${y}" x2="${sw}" y2="${y}" stroke="${theme.grid}" stroke-width="${0.012 * K}"/>`)
  }
  parts.push(`<text x="${sw / 2}" y="${sd + 0.38 * K}" font-size="${0.22 * K}" font-family="${theme.font}" fill="${theme.muted}" text-anchor="middle">${p.lang === 'pt' ? 'PLATEIA' : 'AUDIENCE'}</text>`)
  const items = p.items.filter(i => i.board === board).sort((a, b) => Number(b.kind === 'riser') - Number(a.kind === 'riser'))
  if (board === 'light') {
    parts.push(`<g opacity="0.35">`)
    for (const it of p.items.filter(i => i.board === 'stage' && !['text', 'arrow'].includes(i.kind))) parts.push(itemShape(it, { ...theme, fg: theme.muted, audio: theme.muted }, 0.02 * K, ak))
    parts.push(`</g>`)
  }
  for (const it of items) { parts.push(itemShape(it, theme, 0.02 * K, ak)); parts.push(itemLabel(it, p, theme, 0.17 * ak, undefined, ak)) }
  if (board === 'light') {
    parts.push(mountMarks(items, theme, ak))
    used.forEach((k, i) => { // legenda: canto inferior direito, ao lado do palco
      const lx = sw + eR - legW + 0.15 * K, ly = sd - (used.length - i) * 0.34 * K + 0.1 * K
      parts.push(`<circle cx="${lx + 0.1 * K}" cy="${ly}" r="${0.1 * K}" fill="${MOUNT[k].color}"/><text x="${lx + 0.3 * K}" y="${ly + 0.06 * K}" font-size="${0.2 * K}" font-family="${theme.font}" fill="${theme.fg}">${mLabel(k)}</text>`)
    })
  }
  if (o.showScale !== false) parts.push(`<g transform="translate(0 ${sd + 0.6 * K})"><line x1="0" y1="0" x2="${K}" y2="0" stroke="${theme.fg}" stroke-width="${0.04 * K}"/><text x="${1.12 * K}" y="${0.07 * K}" font-size="${0.18 * K}" font-family="${theme.font}" fill="${theme.fg}">1 m  ·  ${sw} × ${sd} m</text></g>`)
  if (legRows.length) {
    parts.push(`<g transform="translate(0 ${sd + 1.2 * K})">`)
    legRows.forEach((r, i) => {
      const x = (i % 4) * (sw / 4), y = Math.floor(i / 4) * 0.4 * K
      parts.push(`<text x="${x}" y="${y}" font-size="${0.18 * K}" font-family="${theme.font}" fill="${theme.fg}">${r.n}× ${esc(r.name)}</text>`)
    })
    parts.push(`</g>`)
  }
  parts.push(`</g>`)
  const title = o.title ? `<text x="${m}" y="${0.55 * K}" font-size="${0.3 * K}" font-weight="bold" font-family="${theme.font}" fill="${theme.fg}">${esc(o.title)}</text>` : ''
  const pxW = o.width ?? 1000
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${pxW}" height="${(pxW * H) / W}">${title}${parts.join('')}</svg>`
  return { svg, w: W, h: H }
}
export { ICON_MAP }
