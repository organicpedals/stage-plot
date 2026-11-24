/* Pacotes de ícones desenhados do zero (não derivam da "planta detalhada"):
   - P · Apple / SF Symbols: pictogramas SÓLIDOS (preenchidos), cantos arredondados, camada primária opaca +
     secundária translúcida (renderização "hierárquica"), um único selo de destaque preenchido.
   - F · Figma: pictogramas de CONTORNO fino sobre grade, só círculos/retângulos/linhas com pontas retas e
     o destaque como âncora de vetor (quadradinho branco com borda colorida).
   Cada glifo tem caixa de desenho própria (w×h) e é ajustado ao tamanho do item no mapa. Tokens: $I tinta,
   $A destaque, $L(m) espessura de linha × m (resolvida em withPack). */

import { REAL } from './packs-real'

export interface Glyph { w: number; h: number; d: string }
export type Pack = Record<string, Glyph>

// ---------- Apple ----------
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
const rrect = (x: number, y: number, w: number, h: number, r: number) => `M${x + r} ${y}H${x + w - r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h - r}a${r} ${r} 0 0 1 ${-r} ${r}H${x + r}a${r} ${r} 0 0 1 ${-r} ${-r}V${y + r}a${r} ${r} 0 0 1 ${r} ${-r}Z`
const fp = (d: string, op = 1) => `<path d="${d}" fill="$I" fill-opacity="${op}" fill-rule="evenodd" stroke="none"/>`
const fr = (x: number, y: number, w: number, h: number, r = 4, op = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="$I" fill-opacity="${op}" stroke="none"/>`
const fc = (x: number, y: number, r: number, op = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="$I" fill-opacity="${op}" stroke="none"/>`
const ac = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="$A" stroke="none"/>`
const ap = (d: string) => `<path d="${d}" fill="$A" stroke="none"/>`
const ls = (d: string, m = 1, c = '$I') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="$L(${m})" stroke-linecap="round" stroke-linejoin="round"/>`
const ringP = (cx: number, cy: number, R: number, r: number) => circ(cx, cy, R) + circ(cx, cy, r)
const G = (w: number, h: number, d: string): Glyph => ({ w, h, d })

const micA = (x = 0, y = 0, k = 1, op = 1) => `<g transform="translate(${x} ${y}) scale(${k})">${fr(17, 4, 14, 24, 7, op)}${ls('M10 22v2a14 14 0 0 0 28 0v-2', 1.4)}${ls('M24 38v6M17 44h14', 1.4)}${op === 1 ? ac(24, 13, 3) : ''}</g>`
const slotsA = (x: number, y: number, w: number, n: number, gap: number, h = 5) => Array.from({ length: n }, (_, i) => fr(x, y + i * gap, w, h, 2)).join('')
const deskA = (n: number): Glyph => G(96, 64, fr(0, 0, 96, 64, 8, 0.26) + Array.from({ length: n }, (_, i) => { const x = 12 + i * (72 / Math.max(1, n - 1)); return ls(`M${x} 18V52`, 0.9) + fr(x - 5, i % 2 ? 24 : 36, 10, 11, 3.5) + fc(x, 10, 2.6, 0.7) }).join('') + ac(88, 56, 3))
const parA = (R: number, r: number, dots = 0): Glyph => G(48, 48, ls('M8 30V13a7 7 0 0 1 7-7h18a7 7 0 0 1 7 7v17', 1.2) + fp(ringP(24, 31, R, r)) + (dots ? [0, 1, 2, 3, 4, 5].map(i => fc(24 + Math.cos(i * 1.047) * (r * 0.62), 31 + Math.sin(i * 1.047) * (r * 0.62), 1.5)).join('') : '') + ac(24, 31, Math.max(2.4, r * 0.4)))
const moverA = (head: string): Glyph => G(48, 52, fr(15, 43, 18, 6, 3, 0.4) + fr(5, 14, 6, 32, 3, 0.4) + fr(37, 14, 6, 32, 3, 0.4) + fp(rrect(13, 6, 22, 34, 11)) + head)

export const APPLE: Pack = {
  drums: G(56, 52, fp(ringP(28, 34, 15, 11)) + ac(28, 34, 4.2) + fp(ringP(11, 14, 9, 6.4)) + fp(ringP(45, 14, 9, 6.4)) + ls('M20 8l16-4', 1.2, '$I')),
  edrums: G(48, 48, fr(3, 24, 19, 19, 6) + fr(26, 24, 19, 19, 6, 0.3) + fr(14, 3, 20, 17, 6, 0.6) + ac(12.5, 33.5, 3.4)),
  perc: G(48, 48, fp('M5 12h18l-3 31H8z') + `<ellipse cx="14" cy="12" rx="9" ry="3.4" fill="$A" stroke="none"/>` + fp('M26 17h17l-2.6 26H28.6z', 0.35) + `<ellipse cx="34.5" cy="17" rx="8.5" ry="3.2" fill="$I" fill-opacity=".55" stroke="none"/>`),
  pads: G(48, 48, fr(3, 3, 19, 19, 6) + fr(26, 3, 19, 19, 6, 0.3) + fr(3, 26, 19, 19, 6, 0.3) + fr(26, 26, 19, 19, 6) + ac(12.5, 12.5, 3.4)),
  keys: G(96, 34, fr(0, 0, 96, 34, 8, 0.26) + [1, 2, 3, 4, 5, 6, 7].map(i => ls(`M${i * 12} 14V32`, 0.8)).join('') + [10, 22, 46, 58, 70, 82].map(x => fr(x - 3.5, 4, 7, 17, 2.4)).join('') + ac(90, 8, 2.6)),
  organ: G(96, 60, fr(0, 0, 96, 24, 7, 0.26) + fr(0, 28, 96, 24, 7, 0.26) + [10, 22, 46, 58, 70, 82].map(x => fr(x - 3.5, 3, 7, 12, 2.2) + fr(x - 3.5, 31, 7, 12, 2.2)).join('') + ac(90, 9, 2.6) + ls('M18 56h60', 1.6)),
  piano: G(48, 48, fp('M5 8a4 4 0 0 1 4-4h18c11 0 18 8 18 18 0 8-6 13-14 14l-3 8h-5l2-8H9a4 4 0 0 1-4-4z') + ac(31, 20, 4)),
  accordion: G(56, 48, fr(1, 6, 11, 36, 4.5) + fr(44, 6, 11, 36, 4.5) + fr(15, 10, 26, 28, 2, 0.28) + [21, 28, 35].map(x => ls(`M${x} 13v22`, 1)).join('') + ac(6.5, 14, 2.6)),
  guitar_amp: G(48, 44, fp(rrect(3, 3, 42, 38, 8) + circ(24, 25, 11)) + ac(24, 25, 4.4) + [11, 19, 27].map(x => fc(x, 10, 1.6, 0.3)).join('')),
  bass_amp: G(40, 54, fp(rrect(2, 2, 36, 50, 8) + circ(20, 17, 8.5) + circ(20, 38, 8.5)) + ac(20, 17, 3) + ac(20, 38, 3)),
  acoustic_amp: G(48, 44, ls('M17 9a7 5 0 0 1 14 0', 1.3) + fp(rrect(3, 9, 42, 32, 8) + circ(24, 26, 9)) + ac(24, 26, 3.6)),
  multifx: G(56, 28, fr(0, 0, 56, 28, 8, 0.28) + [8, 20, 32, 44].map((x, i) => fr(x - 3.5, 5, 7, 18, 2.5, i === 3 ? 0.55 : 1)).join('') + ac(44, 14, 2.4)),
  pedalboard: G(56, 36, fr(0, 0, 56, 36, 7, 0.26) + [4, 20, 36].map(x => fr(x, 5, 16, 26, 4.5)).join('') + [12, 28, 44].map(x => fc(x, 11, 2.2, 0.35)).join('') + ac(12, 25, 2.4)),
  acoustic: G(34, 56, fr(15, 2, 6, 24, 2.6) + fr(13, 0, 10, 5, 2) + fp('M18 22c10 0 12 8 8 12 6 4 6 14-8 14S4 38 10 34C6 30 8 22 18 22z' + circ(18, 38, 4.6)) + ac(18, 38, 2.2)),
  horn: G(56, 40, fp('M3 17h24L51 6v28L27 23H3a3 3 0 0 1 0-6z') + [10, 16, 22].map(x => fr(x, 6, 3.4, 11, 1.7, 0.55)).join('') + ac(5.5, 20, 2.6)),
  strings: G(30, 56, fc(15, 3, 3.2) + fr(13, 4, 4, 15, 2) + fp('M15 18c8-2 10 6 7 10 6 4 5 16-7 16S2 32 8 28c-3-4-1-12 7-10z') + ac(15, 34, 2.4)),
  dj: G(96, 52, fp(ringP(24, 26, 22, 17)) + fp(ringP(72, 26, 22, 17)) + ac(24, 26, 3.6) + ac(72, 26, 3.6) + fr(41, 6, 14, 40, 5, 0.3) + ls('M48 14v24', 1) + fr(44, 22, 8, 6, 2.2)),
  laptop: G(48, 36, fr(7, 2, 34, 24, 4.5) + ac(24, 14, 3.2) + fr(1, 28, 46, 6, 3, 0.55)),
  vocal: G(48, 48, micA(0, 2, 1)),
  backing: G(56, 48, micA(-6, 4, 0.82, 0.3) + micA(10, 2, 1)),
  choir: G(96, 44, micA(-2, 0, 0.9, 0.35) + micA(30, 0, 0.9, 1) + micA(62, 0, 0.9, 0.35)),
  talkback: G(48, 48, fr(7, 6, 14, 22, 7) + ls('M2 22v1a12 12 0 0 0 12 12', 1.3) + fp('M26 8h16a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-6l-6 6v-6h-4a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z', 0.4) + ac(14, 15, 2.8)),
  stool: G(48, 48, fr(6, 12, 36, 9, 4.5) + ls('M13 22L9 44M35 22l4 22M24 22v22', 1.4) + ac(24, 16.5, 2.2)),
  chair: G(48, 48, fr(11, 2, 26, 20, 6, 0.3) + fr(8, 25, 32, 8, 4) + ls('M13 33L10 46M35 33l3 13', 1.4) + ac(24, 12, 2.4)),
  musicstand: G(48, 40, fr(4, 3, 40, 24, 3.5, 0.28) + ls('M11 10h26M11 15h26M11 20h18', 0.9) + ls('M24 27v10M14 38h20', 1.4) + ac(38, 21, 2.2)),
  micstand: G(48, 48, ls('M24 44V14l14-8', 1.6) + ls('M12 44h24', 1.6) + fc(39, 6, 5) + ac(39, 6, 2)),
  fan: G(48, 48, fp(circ(24, 24, 20) + circ(24, 24, 17), 0.5) + [0, 120, 240].map(a => `<ellipse cx="24" cy="14" rx="5" ry="9" transform="rotate(${a} 24 24)" fill="$I" stroke="none"/>`).join('') + ac(24, 24, 3.4)),
  wedge: G(56, 42, fp('M2 38L10 6a3 3 0 0 1 3-2h30a3 3 0 0 1 3 2l8 32a2 2 0 0 1-2 3H4a2 2 0 0 1-2-3z' + circ(28, 22, 9)) + ac(28, 22, 3.6)),
  sidefill: G(40, 66, fp(rrect(2, 2, 36, 62, 8) + circ(20, 19, 9) + circ(20, 47, 9)) + ac(20, 19, 3.4) + ac(20, 47, 3.4)),
  iem: G(48, 48, fc(14, 15, 9) + fr(12, 20, 5, 20, 2.5) + fc(34, 15, 9, 0.35) + fr(32, 20, 5, 20, 2.5, 0.35) + ac(14, 15, 3)),
  pmix: G(44, 36, fr(2, 4, 40, 28, 8, 0.28) + fc(15, 18, 7.5) + ls('M15 13v5', 1.2, '#FFFFFF') + fr(27, 9, 11, 4, 2) + fr(27, 17, 11, 4, 2, 0.5) + ac(32, 26, 2.2)),
  mon_desk: deskA(5), foh_desk: deskA(7), lxdesk: deskA(4),
  rack: G(44, 52, fr(3, 2, 38, 48, 6, 0.28) + slotsA(8, 8, 28, 4, 10, 6) + ac(32, 11, 2)),
  dimmer: G(44, 52, fr(3, 2, 38, 48, 6, 0.28) + slotsA(8, 8, 28, 4, 10, 6) + ap('M24 12l-5 9h4l-1 6 6-9h-4z')),
  wireless: G(48, 48, ls('M14 26L9 6M34 26l5-20', 1.8) + fc(9, 6, 3.2) + fc(39, 6, 3.2) + fr(3, 25, 42, 20, 7) + ac(36, 35, 3)),
  snake: G(54, 40, fr(2, 6, 50, 24, 7, 0.3) + [10, 20, 30, 40].map(x => fc(x + 1, 18, 3.8)).join('') + ls('M27 30c0 8 10 6 10 10', 1.3) + ac(46, 12, 2)),
  di: G(44, 32, fr(2, 3, 40, 26, 8, 0.28) + fc(13, 16, 5) + fc(31, 16, 5, 0.6) + ac(22, 16, 2.4)),
  pa_main: G(40, 56, fr(10, 2, 20, 13, 4) + fr(8, 17, 24, 13, 4, 0.6) + fr(6, 32, 28, 13, 4, 0.3) + ls('M20 45v7', 1.4) + ac(20, 8.5, 2.6)),
  sub: G(48, 48, fp(rrect(2, 2, 44, 44, 9) + circ(24, 24, 15)) + ac(24, 24, 6)),
  amp_rack: G(44, 52, fr(3, 2, 38, 48, 6, 0.28) + slotsA(8, 7, 28, 5, 8, 5) + fc(13, 46, 1.4) + ac(31, 46, 1.9)),
  ac: G(48, 48, fp(rrect(3, 3, 42, 42, 12) + rrect(14, 12, 4.4, 11, 2.2) + rrect(29.6, 12, 4.4, 11, 2.2)) + ac(24, 33, 3.4)),
  strip: G(96, 26, fr(0, 0, 96, 26, 9, 0.28) + [0, 1, 2, 3].map(i => fr(8 + i * 21, 6, 15, 14, 4)).join('') + ac(88, 13, 2.8)),
  power: G(48, 48, ap('M29 2L8 28h13l-4 18 23-28H26z')),
  lpower: G(48, 48, ap('M29 2L8 28h13l-4 18 23-28H26z')),
  breaker: G(44, 52, fr(3, 2, 38, 48, 6, 0.28) + [0, 1].flatMap(r => [0, 1, 2].map(c => fr(9 + c * 10, 9 + r * 17, 6, 11, 2))).join('') + ac(22, 44, 2.4)),
  generator: G(56, 40, fr(2, 4, 52, 28, 8, 0.28) + ap('M30 8l-9 12h6l-2 10 10-13h-6z') + fc(11, 36, 3.6) + fc(45, 36, 3.6)),
  net: G(48, 44, ls('M24 14L10 33M24 14l14 19M12 36h24', 1.3) + fc(24, 10, 6) + fc(9, 36, 6) + fc(39, 36, 6) + ac(24, 10, 2.4)),
  teleprompter: G(48, 42, fr(3, 3, 42, 27, 5, 0.28) + fr(8, 8, 32, 17, 2.5, 0.4) + fc(24, 36, 5) + ac(24, 36, 2)),
  // luz
  par64: parA(18, 12), par56: parA(16, 11), par38: parA(14, 9), pinspot: parA(10, 5), ledpar: parA(16, 11, 1),
  ledpanel: G(48, 48, fr(2, 2, 44, 44, 9, 0.28) + [0, 1, 2].flatMap(r => [0, 1, 2].map(c => fc(10 + c * 14, 10 + r * 14, 3.8))).join('') + ac(24, 24, 3.8)),
  fresnel: G(48, 48, ls('M8 30V13a7 7 0 0 1 7-7h18a7 7 0 0 1 7 7v17', 1.2) + fp(ringP(24, 31, 17, 13) + ringP(24, 31, 9, 6)) + ac(24, 31, 3)),
  pc: G(48, 48, ls('M8 30V13a7 7 0 0 1 7-7h18a7 7 0 0 1 7 7v17', 1.2) + fp(ringP(24, 31, 17, 12)) + fc(24, 31, 8, 0.28) + ac(24, 31, 3)),
  ellips: G(52, 40, fr(2, 8, 26, 24, 6) + fp('M30 9l17-5v32l-17-5z', 0.55) + ls('M30 9v22', 1.2) + ac(40, 20, 3.2)),
  moving_spot: moverA(ac(24, 20, 5.5)),
  moving_beam: moverA(ac(24, 20, 3) + ls('M17 28l-3 14M31 28l3 14', 1, '$A')),
  moving_wash: moverA([[24, 14], [30, 20], [18, 20], [24, 26]].map(([x, y]) => ac(x, y, 3)).join('')),
  ledbar: G(96, 22, fr(0, 0, 96, 22, 8, 0.28) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => i === 4 ? ac(8 + i * 11.4, 11, 3.8) : fc(8 + i * 11.4, 11, 3.8)).join('')),
  uvbar: G(96, 22, fr(0, 0, 96, 22, 8, 0.28) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => i === 4 ? ac(8 + i * 11.4, 11, 3.8) : fc(8 + i * 11.4, 11, 3.8, 0.6)).join('')),
  scanner: G(48, 48, fr(3, 3, 42, 42, 9, 0.28) + `<rect x="9" y="19" width="30" height="10" rx="3" transform="rotate(-35 24 24)" fill="$I" stroke="none"/>` + ac(24, 24, 3)),
  strobe: G(56, 40, fr(2, 3, 52, 34, 7, 0.28) + [0, 1, 2].map(i => fr(8, 9 + i * 8, 40, 4.6, 2.3)).join('') + ac(44, 11.3, 2.3)),
  blinder: G(56, 36, fr(2, 2, 52, 32, 8, 0.28) + fp(ringP(17, 18, 10, 6.5)) + fp(ringP(39, 18, 10, 6.5)) + ac(17, 18, 3) + ac(39, 18, 3)),
  cyc: G(56, 40, fp('M2 36L9 6a3 3 0 0 1 3-2h32a3 3 0 0 1 3 2l7 30a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z', 0.28) + fr(10, 28, 36, 5, 2.5) + ac(28, 16, 4)),
  follow: G(40, 64, fr(5, 4, 30, 20, 9) + ac(20, 14, 5) + ls('M20 24v26M8 58l12-8 12 8', 1.5)),
  mirrorball: G(48, 50, ls('M24 1v9', 1.3) + fc(24, 29, 17, 0.28) + ls('M7 29h34M24 12v34M10 20c9 4 19 4 28 0M10 38c9-4 19-4 28 0', 0.9) + ac(17, 21, 2.8)),
  laser: G(48, 44, fr(3, 17, 30, 20, 6, 0.3) + ls('M33 22l13-12M33 27h13M33 32l13 10', 1.2, '$A') + ac(10, 27, 2.6)),
  fog: G(56, 40, fr(2, 14, 34, 20, 7, 0.28) + fr(36, 21, 10, 6, 2.4) + fc(47, 12, 4.4, 0.55) + fc(52, 24, 3, 0.3) + ac(10, 24, 2.6)),
  haze: G(56, 36, fr(2, 8, 34, 22, 7, 0.28) + ls('M40 14c4-3 6 3 10 0M40 20c4-3 6 3 10 0M40 26c4-3 6 3 10 0', 1, '$I') + ac(10, 19, 2.6)),
  cannon: G(28, 56, fr(7, 14, 14, 40, 6, 0.3) + fr(4, 8, 20, 9, 4.5) + ac(14, 3, 2.5) + fc(7, 4, 1.8, 0.6) + fc(21, 4, 1.8, 0.6)),
  lightstand: G(48, 48, ls('M24 46V12M8 12h32M14 46l10-6 10 6', 1.5) + fc(9, 12, 6) + fc(39, 12, 6) + ac(9, 12, 2.2) + ac(39, 12, 2.2)),
  dmxsplit: G(48, 26, fr(1, 2, 46, 22, 7, 0.28) + [0, 1, 2, 3].map(i => fc(9 + i * 10, 13, 3.2)).join('') + ac(41, 13, 2.6)),
}

// ---------- Figma ----------
const sr = (x: number, y: number, w: number, h: number, r = 1.5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="$I" stroke-width="$L(1)"/>`
const sc = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="$I" stroke-width="$L(1)"/>`
const sp = (d: string, m = 1) => `<path d="${d}" fill="none" stroke="$I" stroke-width="$L(${m})"/>`
const an = (x: number, y: number) => `<rect x="${x - 2.4}" y="${y - 2.4}" width="4.8" height="4.8" fill="#FFFFFF" stroke="$A" stroke-width="$L(1)"/>`
const guide = (x1: number, y1: number, x2: number, y2: number) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="$A" stroke-width="$L(.8)" stroke-dasharray="2 2"/>`
const micF = (x = 0, y = 0, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">${sr(17, 3, 14, 24, 7)}${sp('M11 22v2a13 13 0 0 0 26 0v-2')}${sp('M24 37v7M17 44h14')}${an(24, 15)}</g>`
const deskF = (n: number): Glyph => G(96, 64, sr(1, 1, 94, 62, 3) + sp('M1 14h94') + Array.from({ length: n }, (_, i) => { const x = 12 + i * (72 / Math.max(1, n - 1)); return sp(`M${x} 22V54`, 0.8) + sr(x - 4, i % 2 ? 28 : 38, 8, 8, 1) }).join('') + an(88, 7))
const slotsF = (x: number, y: number, w: number, n: number, gap: number) => Array.from({ length: n }, (_, i) => sr(x, y + i * gap, w, 6, 1)).join('')
const parF = (R: number, r: number): Glyph => G(48, 48, sp('M7 31V12h34v19') + sc(24, 31, R) + sc(24, 31, r) + an(24, 31))
const moverF = (head: string): Glyph => G(48, 52, sr(15, 44, 18, 5, 1) + sr(5, 14, 5, 32, 1) + sr(38, 14, 5, 32, 1) + sr(13, 5, 22, 33, 11) + head)
const rowF = (n: number, w: number, accentAt: number) => Array.from({ length: n }, (_, i) => i === accentAt ? an(8 + i * ((w - 16) / (n - 1)), 11) : sc(8 + i * ((w - 16) / (n - 1)), 11, 3)).join('')

export const FIGMA: Pack = {
  drums: G(56, 52, sc(28, 34, 16) + sc(28, 34, 10) + an(28, 34) + sc(11, 14, 8) + sc(45, 14, 8) + sp('M20 8l16-4')),
  edrums: G(48, 48, sr(3, 24, 19, 19, 2) + sr(26, 24, 19, 19, 2) + sr(14, 3, 20, 17, 2) + an(12.5, 33.5)),
  perc: G(48, 48, sp('M6 12h17l-3 31H9zM6 12a8.5 3 0 0 0 17 0a8.5 3 0 0 0-17 0') + sp('M27 17h16l-2.6 26H29.6zM27 17a8 3 0 0 0 16 0a8 3 0 0 0-16 0') + an(14.5, 25)),
  pads: G(48, 48, sr(3, 3, 19, 19, 2) + sr(26, 3, 19, 19, 2) + sr(3, 26, 19, 19, 2) + sr(26, 26, 19, 19, 2) + an(12.5, 12.5)),
  keys: G(96, 34, sr(1, 1, 94, 32, 2) + [1, 2, 3, 4, 5, 6, 7].map(i => sp(`M${i * 12} 18V33`, 0.8)).join('') + [10, 22, 46, 58, 70, 82].map(x => sr(x - 3, 1, 6, 17, 0.5)).join('') + an(90, 26)),
  organ: G(96, 60, sr(1, 1, 94, 22, 2) + sr(1, 28, 94, 22, 2) + [10, 22, 46, 58, 70, 82].map(x => sp(`M${x} 1v13M${x} 28v13`, 0.8)).join('') + sp('M16 56h64') + an(90, 8)),
  piano: G(48, 48, sp('M5 8a3 3 0 0 1 3-3h18c11 0 18 8 18 17 0 8-6 13-14 14l-3 8h-5l2-8H8a3 3 0 0 1-3-3z') + an(30, 20)),
  accordion: G(56, 48, sr(1, 6, 11, 36, 2) + sr(44, 6, 11, 36, 2) + sp('M12 11h32M12 37h32') + [19, 25, 31, 37].map(x => sp(`M${x} 11v26`, 0.8)).join('') + an(6.5, 14)),
  guitar_amp: G(48, 44, sr(3, 3, 42, 38, 2) + sc(24, 25, 11) + sc(24, 25, 4) + an(10, 10) + sp('M17 10h20', 0.8)),
  bass_amp: G(40, 54, sr(2, 2, 36, 50, 2) + sc(20, 17, 8) + sc(20, 38, 8) + an(20, 17)),
  acoustic_amp: G(48, 44, sp('M17 9a7 5 0 0 1 14 0') + sr(3, 9, 42, 32, 2) + sc(24, 26, 9) + an(24, 26)),
  multifx: G(56, 28, sr(1, 1, 54, 26, 2) + [9, 21, 33].map(x => sr(x - 3.5, 6, 7, 16, 1)).join('') + an(46, 14)),
  pedalboard: G(56, 36, sr(1, 1, 54, 34, 2) + [4, 20, 36].map(x => sr(x, 6, 16, 24, 2)).join('') + an(12, 23)),
  acoustic: G(34, 56, sr(15, 1, 5, 24, 0.5) + sp('M17.5 22c9 0 12 8 8 12 6 4 6 14-8 14S3 38 9 34C5 30 8 22 17.5 22z') + sc(17.5, 38, 4.5) + an(17.5, 38)),
  horn: G(56, 40, sp('M3 17h24L51 6v28L27 23H3z') + [10, 16, 22].map(x => sp(`M${x} 7v10`, 0.8)).join('') + an(5, 20)),
  strings: G(30, 56, sr(13, 1, 4, 18, 0.5) + sp('M15 18c8-2 10 6 7 10 6 4 5 16-7 16S2 32 8 28c-3-4-1-12 7-10z') + an(15, 34)),
  dj: G(96, 52, sc(24, 26, 22) + sc(24, 26, 15) + sc(72, 26, 22) + sc(72, 26, 15) + sr(41, 6, 14, 40, 2) + sp('M48 14v24', 0.8) + an(24, 26) + an(72, 26)),
  laptop: G(48, 36, sr(7, 2, 34, 24, 2) + sp('M1 31h46l-3 4H4z') + an(24, 14)),
  vocal: G(48, 48, micF(0, 2)),
  backing: G(56, 48, micF(-6, 4, 0.8) + micF(10, 2)),
  choir: G(96, 44, micF(-2, 0, 0.9) + micF(30, 0, 0.9) + micF(62, 0, 0.9)),
  talkback: G(48, 48, sr(7, 5, 14, 22, 7) + sp('M3 22v1a11 11 0 0 0 11 11') + sp('M26 8h18v16h-8l-5 6v-6h-5z') + an(14, 14)),
  stool: G(48, 48, sr(6, 12, 36, 8, 1) + sp('M13 20L9 44M35 20l4 24M24 20v24') + an(24, 16)),
  chair: G(48, 48, sr(11, 2, 26, 20, 2) + sr(8, 25, 32, 7, 1) + sp('M13 32L10 46M35 32l3 14') + an(24, 12)),
  musicstand: G(48, 40, sr(4, 3, 40, 24, 1) + sp('M11 10h26M11 15h26M11 20h18', 0.8) + sp('M24 27v10M14 38h20') + an(38, 21)),
  micstand: G(48, 48, sp('M24 45V14l14-8M12 45h24') + sc(40, 5, 5) + an(40, 5)),
  fan: G(48, 48, sc(24, 24, 20) + [0, 120, 240].map(a => `<ellipse cx="24" cy="14" rx="4.5" ry="8" transform="rotate(${a} 24 24)" fill="none" stroke="$I" stroke-width="$L(1)"/>`).join('') + an(24, 24)),
  wedge: G(56, 42, sp('M2 39L10 6h36l8 33z') + sc(28, 23, 9) + an(28, 23)),
  sidefill: G(40, 66, sr(2, 2, 36, 62, 2) + sc(20, 19, 9) + sc(20, 47, 9) + an(20, 19) + an(20, 47)),
  iem: G(48, 48, sc(14, 15, 9) + sr(12, 24, 4, 16, 1) + sc(34, 15, 9) + sr(32, 24, 4, 16, 1) + an(14, 15)),
  pmix: G(44, 36, sr(1, 3, 42, 30, 2) + sc(15, 18, 7) + sp('M15 12v6') + sr(27, 9, 12, 4, 0.5) + sr(27, 17, 12, 4, 0.5) + an(33, 27)),
  mon_desk: deskF(5), foh_desk: deskF(7), lxdesk: deskF(4),
  rack: G(44, 52, sr(3, 2, 38, 48, 2) + slotsF(8, 8, 28, 4, 10) + an(34, 11)),
  dimmer: G(44, 52, sr(3, 2, 38, 48, 2) + slotsF(8, 8, 28, 4, 10) + sp('M24 12l-5 9h5l-2 7 7-10h-5z') + an(34, 11)),
  wireless: G(48, 48, sp('M14 26L9 6M34 26l5-20') + sc(9, 5, 2.5) + sc(39, 5, 2.5) + sr(3, 26, 42, 19, 2) + an(36, 35)),
  snake: G(54, 40, sr(2, 6, 50, 24, 2) + [11, 21, 31, 41].map(x => sc(x, 18, 3.4)).join('') + sp('M27 30c0 8 10 6 10 10') + an(46, 12)),
  di: G(44, 32, sr(2, 3, 40, 26, 2) + sc(13, 16, 5) + sc(31, 16, 5) + an(22, 16)),
  pa_main: G(40, 56, sr(10, 2, 20, 13, 1) + sr(8, 17, 24, 13, 1) + sr(6, 32, 28, 13, 1) + sp('M20 45v7') + an(20, 8.5)),
  sub: G(48, 48, sr(2, 2, 44, 44, 2) + sc(24, 24, 16) + sc(24, 24, 8) + an(24, 24)),
  amp_rack: G(44, 52, sr(3, 2, 38, 48, 2) + slotsF(8, 7, 28, 5, 8) + an(31, 46)),
  ac: G(48, 48, sr(3, 3, 42, 42, 6) + sr(14, 12, 4.4, 11, 0.5) + sr(29.6, 12, 4.4, 11, 0.5) + an(24, 33)),
  strip: G(96, 26, sr(1, 1, 94, 24, 4) + [0, 1, 2, 3].map(i => sr(8 + i * 21, 6, 15, 14, 1)).join('') + an(89, 13)),
  power: G(48, 48, sp('M29 2L8 28h13l-4 18 23-28H26z') + an(29, 2)),
  lpower: G(48, 48, sp('M29 2L8 28h13l-4 18 23-28H26z') + an(29, 2)),
  breaker: G(44, 52, sr(3, 2, 38, 48, 2) + [0, 1].flatMap(r => [0, 1, 2].map(c => sr(9 + c * 10, 9 + r * 17, 6, 11, 0.5))).join('') + an(22, 44)),
  generator: G(56, 40, sr(2, 4, 52, 28, 2) + sp('M30 8l-9 12h6l-2 10 10-13h-6z') + sc(11, 36, 3.4) + sc(45, 36, 3.4) + an(28, 8)),
  net: G(48, 44, sp('M24 14L10 33M24 14l14 19M12 36h24') + sc(24, 10, 5) + sc(9, 36, 5) + sc(39, 36, 5) + an(24, 10)),
  teleprompter: G(48, 42, sr(3, 3, 42, 27, 2) + sr(8, 8, 32, 17, 1) + sc(24, 36, 4.5) + an(24, 36)),
  // luz
  par64: parF(18, 12), par56: parF(16, 11), par38: parF(14, 9), pinspot: parF(10, 5), ledpar: parF(16, 11),
  ledpanel: G(48, 48, sr(2, 2, 44, 44, 2) + [0, 1, 2].flatMap(r => [0, 1, 2].map(c => (r === 1 && c === 1 ? '' : sc(10 + c * 14, 10 + r * 14, 3.4)))).join('') + an(24, 24)),
  fresnel: G(48, 48, sp('M7 31V12h34v19') + sc(24, 31, 17) + sc(24, 31, 11) + sc(24, 31, 5) + an(24, 31)),
  pc: G(48, 48, sp('M7 31V12h34v19') + sc(24, 31, 17) + sp('M24 14v34M7 31h34', 0.7) + an(24, 31)),
  ellips: G(52, 40, sr(2, 8, 26, 24, 1) + sp('M30 9l17-5v32l-17-5zM30 9v22') + an(40, 20)),
  moving_spot: moverF(an(24, 21)),
  moving_beam: moverF(an(24, 21) + guide(18, 40, 12, 50) + guide(30, 40, 36, 50)),
  moving_wash: moverF([[24, 15], [30, 21], [18, 21], [24, 27]].map(([x, y]) => sc(x, y, 2.4)).join('') + an(24, 21)),
  ledbar: G(96, 22, sr(1, 1, 94, 20, 2) + rowF(8, 96, 4)),
  uvbar: G(96, 22, sr(1, 1, 94, 20, 2) + rowF(8, 96, 4)),
  scanner: G(48, 48, sr(3, 3, 42, 42, 2) + `<rect x="9" y="19" width="30" height="10" fill="none" stroke="$I" stroke-width="$L(1)" transform="rotate(-35 24 24)"/>` + an(24, 24)),
  strobe: G(56, 40, sr(2, 3, 52, 34, 2) + [0, 1, 2].map(i => sp(`M8 ${11 + i * 8}h40`)).join('') + an(48, 11)),
  blinder: G(56, 36, sr(2, 2, 52, 32, 2) + sc(17, 18, 10) + sc(39, 18, 10) + an(17, 18) + an(39, 18)),
  cyc: G(56, 40, sp('M2 37L9 5h38l7 32z') + sp('M10 29h36') + an(28, 16)),
  follow: G(40, 64, sr(5, 4, 30, 20, 8) + an(20, 14) + sp('M20 24v26M8 58l12-8 12 8')),
  mirrorball: G(48, 50, sp('M24 1v10') + sc(24, 29, 17) + sp('M7 29h34M24 12v34M10 20c9 4 19 4 28 0M10 38c9-4 19-4 28 0', 0.8) + an(24, 29)),
  laser: G(48, 44, sr(3, 17, 30, 20, 2) + guide(33, 22, 46, 10) + guide(33, 27, 46, 27) + guide(33, 32, 46, 43) + an(10, 27)),
  fog: G(56, 40, sr(2, 14, 34, 20, 2) + sr(36, 21, 10, 6, 0.5) + sc(47, 12, 4) + sc(52, 24, 2.6) + an(10, 24)),
  haze: G(56, 36, sr(2, 8, 34, 22, 2) + sp('M40 14c4-3 6 3 10 0M40 20c4-3 6 3 10 0M40 26c4-3 6 3 10 0', 0.9) + an(10, 19)),
  cannon: G(28, 56, sr(7, 14, 14, 40, 1) + sr(4, 8, 20, 6, 0.5) + an(14, 3) + guide(14, 6, 14, 8)),
  lightstand: G(48, 48, sp('M24 46V12M8 12h32M14 46l10-6 10 6') + sc(9, 12, 6) + sc(39, 12, 6) + an(9, 12) + an(39, 12)),
  dmxsplit: G(48, 26, sr(1, 2, 46, 22, 2) + [0, 1, 2, 3].map(i => sc(9 + i * 10, 13, 3)).join('') + an(41, 13)),
}

export const PACKS: Record<'P' | 'F' | 'R', Pack> = { P: APPLE, F: FIGMA, R: REAL }

/** Posiciona o glifo (caixa de desenho própria) dentro da caixa w×h do item, preservando proporção. */
export function packSvg(g: Glyph, w: number, h: number): string {
  const s = Math.min(w / g.w, h / g.h), tx = (w - g.w * s) / 2, ty = (h - g.h * s) / 2
  const d = g.d.replace(/\$L\(([\d.]+)\)/g, (_m, m) => `$W(${(s / Number(m)).toFixed(4)})`)
  return `<g data-pk="1" transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(4)})">${d}</g>`
}
