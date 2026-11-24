/* Pacote R · Realista (silhueta): ilustrações em tinta, em vista frontal/3-4, dos equipamentos como eles são
   (kit com ferragens, guitarra com braço e tarraxas, gabinete com grelha, cabeça de luz com lente...).
   Desenho original; só usa tinta ($I) — furos (evenodd) dão os detalhes — e um ponto de destaque ($A) nos LEDs/indicadores.
   Tokens: $I tinta, $A destaque, $L(m) espessura de linha × m. */
import type { Glyph } from './packs'

const G = (w: number, h: number, d: string): Glyph => ({ w, h, d })
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`
const circ = (cx: number, cy: number, r: number) => ell(cx, cy, r, r)
const rr = (x: number, y: number, w: number, h: number, r: number) => `M${x + r} ${y}H${x + w - r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h - r}a${r} ${r} 0 0 1 ${-r} ${r}H${x + r}a${r} ${r} 0 0 1 ${-r} ${-r}V${y + r}a${r} ${r} 0 0 1 ${r} ${-r}Z`
const bar = (x1: number, y1: number, x2: number, y2: number, w: number) => {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * (w / 2), ny = (dx / l) * (w / 2)
  return `M${x1 + nx} ${y1 + ny}L${x2 + nx} ${y2 + ny}L${x2 - nx} ${y2 - ny}L${x1 - nx} ${y1 - ny}Z`
}
const fp = (d: string, op = 1) => `<path d="${d}" fill="$I" fill-opacity="${op}" fill-rule="evenodd" stroke="none"/>`
const ac = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="$A" stroke="none"/>`
const ls = (d: string, m = 1) => `<path d="${d}" fill="none" stroke="$I" stroke-width="$L(${m})" stroke-linecap="round" stroke-linejoin="round"/>`
/** n furos em linha */
const dots = (x: number, y: number, n: number, gap: number, r: number) => Array.from({ length: n }, (_, i) => circ(x + i * gap, y, r)).join('')
/** n barras finas (furo) horizontais ou verticais */
const slats = (x: number, y: number, n: number, gap: number, len: number, t: number, vert = false) => Array.from({ length: n }, (_, i) => vert ? rr(x + i * gap, y, t, len, t / 2) : rr(x, y + i * gap, len, t, t / 2)).join('')

// drum: casco com aro e pele
const drumHead = (cx: number, cy: number, rx: number, ry: number, depth: number, lugs = 0) =>
  fp(`M${cx - rx} ${cy}v${depth}a${rx} ${ry} 0 0 0 ${2 * rx} 0v${-depth}a${rx} ${ry} 0 0 0 ${-2 * rx} 0Z` + slats(cx - rx + 2.2, cy + ry * 0.3, lugs, (2 * rx - 4.4) / Math.max(1, lugs - 1), depth - ry * 0.2, 1.1, true), 1) +
  fp(ell(cx, cy, rx, ry) + ell(cx, cy, rx - 1.4, ry - 0.9)) + fp(ell(cx, cy, rx - 1.4, ry - 0.9), 0.06)
const cymbal = (cx: number, cy: number, rx: number) => fp(ell(cx, cy, rx, rx * 0.2)) + fp(ell(cx, cy - 0.3, rx * 0.12, rx * 0.06) , 0)
const micR = (x = 0, y = 0, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">${fp(ell(24, 12, 9, 10) + dots(20, 8, 2, 8, 1.1) + dots(18, 12, 3, 6, 1.1) + dots(20, 16, 2, 8, 1.1))}${fp('M17 21h14l-2 5h-10zM19 26h10l-2 17a3 3 0 0 1-6 0z' + circ(24, 33, 1.3))}${ac(24, 29, 1.4)}</g>`
const speakerR = (cx: number, cy: number, r: number) => fp(ell(cx, cy, r, r) + ell(cx, cy, r * 0.78, r * 0.78)) + fp(ell(cx, cy, r * 0.62, r * 0.62) + ell(cx, cy, r * 0.5, r * 0.5), 0.5) + fp(circ(cx, cy, r * 0.26))
const rackR = (w: number, h: number, n: number): string => fp(rr(0, 0, w, h, 2.5) + slats(w * 0.16, h * 0.08, n, (h * 0.84) / n, w * 0.68, (h * 0.84) / n - 2.4) + dots(w * 0.07, h * 0.12, n, 0, 0)) + Array.from({ length: n }, (_, i) => fp(rr(w * 0.2, h * 0.08 + i * ((h * 0.84) / n) + 0.8, w * 0.6, (h * 0.84) / n - 4, 1.2), 0.5)).join('')
const deskR = (n: number): Glyph => G(100, 66, fp('M6 10h88l6 54H0z' + slats(10, 26, 1, 0, 0, 0) + Array.from({ length: n }, (_, i) => { const x = 14 + i * (72 / Math.max(1, n - 1)); return rr(x - 1.2, 28, 2.4, 28, 1.2) }).join('') + Array.from({ length: n }, (_, i) => circ(14 + i * (72 / Math.max(1, n - 1)), 17, 2.6)).join('')) + Array.from({ length: n }, (_, i) => fp(rr(14 + i * (72 / Math.max(1, n - 1)) - 4.5, i % 2 ? 34 : 42, 9, 7, 1.5))).join('') + ac(92, 58, 2))
const lensCan = (r: number, rings: number, flange = 0): string => ls('M7 30V12h34v18', 1.3) + fp(circ(24, 30, r + 2.5) + circ(24, 30, r)) + Array.from({ length: rings }, (_, i) => fp(circ(24, 30, r - 1.5 - i * ((r - 3) / rings)) + circ(24, 30, r - 2.6 - i * ((r - 3) / rings)), 0.85)).join('') + fp(circ(24, 30, 2.4)) + (flange ? fp(rr(14, 4, 20, 8, 2)) : fp(rr(18, 6, 12, 6, 2)))
const moverR = (lens: string): Glyph => G(52, 56, fp(rr(14, 47, 24, 7, 3)) + fp(rr(3, 16, 8, 34, 3)) + fp(rr(41, 16, 8, 34, 3)) + fp(rr(11, 5, 30, 38, 13) + slats(15, 36, 3, 3, 22, 1.2)) + lens)

export const REAL: Record<string, Glyph> = {
  drums: G(66, 58,
    drumHead(32, 39, 17, 15, 3, 0) + fp(ell(32, 39, 4, 3.6), 0.9) + ac(32, 39, 1.4) +
    drumHead(19, 21, 8.5, 3.6, 8, 6) + drumHead(38, 19, 8.5, 3.6, 8, 6) + drumHead(55, 33, 8, 3.4, 11, 5) + drumHead(10, 34, 8, 3.2, 6, 5) +
    cymbal(7, 11, 9) + cymbal(59, 8, 9) + cymbal(26, 5, 7) +
    ls('M7 12L11 54M59 9L56 54M26 6V16M10 38V54M4 54h13M50 54h13') + ls('M20 12l-3 30M38 28v8', 0.8)),
  edrums: G(56, 48, fp(ell(14, 18, 12, 5) + ell(14, 18, 9, 3.2)) + fp(ell(42, 18, 12, 5) + ell(42, 18, 9, 3.2)) + fp(ell(28, 8, 9, 3.4) + ell(28, 8, 6.5, 2)) + fp(rr(22, 24, 12, 9, 2) + dots(25, 28.5, 3, 3, 1)) + ls('M14 23V44M42 23V44M28 12V24M8 44h12M36 44h12M20 33h16', 1.1)),
  perc: G(56, 52, fp('M5 14h20l-3.5 36h-13z' + ell(15, 14, 10, 3.4) + slats(10, 22, 1, 0, 0, 0)) + fp(ell(15, 14, 10, 3.4) + ell(15, 14, 8, 2.2), 0.9) + fp('M30 20h19l-3.2 30H33.2z' + ell(39.5, 20, 9.5, 3.2)) + fp(ell(39.5, 20, 9.5, 3.2) + ell(39.5, 20, 7.5, 2), 0.9) + fp(rr(5, 30, 20, 2, 1), 0) + ls('M7 30h16M8 40h13', 0.7)),
  pads: G(48, 48, [[3, 3], [26, 3], [3, 26], [26, 26]].map(([x, y]) => fp(rr(x, y, 19, 19, 4) + circ(x + 9.5, y + 9.5, 6.4)) + fp(circ(x + 9.5, y + 9.5, 3), 0.55)).join('') + ac(40, 8, 1.6)),
  keys: G(100, 40, fp(rr(0, 0, 100, 40, 3.5) + rr(5, 12, 90, 25, 1)) + Array.from({ length: 26 }, (_, i) => fp(rr(5.6 + i * 3.46, 12, 0.5, 25, 0.2))).join('') + [0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15, 17, 18, 19].map(i => fp(rr(9 + i * 3.46, 12, 2.2, 15, 0.6))).join('') + fp(dots(10, 6, 6, 4, 1.3) + rr(64, 4.4, 22, 3.2, 1)) + ac(92, 6, 1.4)),
  organ: G(100, 70, fp(rr(0, 0, 100, 26, 3) + rr(5, 10, 90, 13, 1)) + Array.from({ length: 24 }, (_, i) => fp(rr(5.7 + i * 3.7, 10, 0.5, 13, 0.2))).join('') + fp(rr(0, 29, 100, 26, 3) + rr(5, 39, 90, 13, 1)) + Array.from({ length: 24 }, (_, i) => fp(rr(5.7 + i * 3.7, 39, 0.5, 13, 0.2))).join('') + fp(rr(12, 59, 76, 4, 2)) + ls('M18 63v6M82 63v6', 1.4)),
  piano: G(62, 56, fp('M3 22L46 4l13 18z' + 'M12 20l30-10-2 10z') + fp(rr(2, 24, 58, 11, 2) + rr(8, 28, 28, 4, 0.5) + slats(10.4, 28.4, 8, 3.2, 3.2, 0.5, true)) + fp(rr(6, 36, 3.4, 15, 1.4) + rr(33, 36, 3.4, 15, 1.4) + rr(52, 36, 3.4, 15, 1.4)) + fp(rr(38, 38, 12, 3, 1.4)) + ac(54, 28, 1.3)),
  accordion: G(60, 50, fp(rr(0, 6, 13, 38, 3) + dots(4, 15, 2, 5, 1.2) + dots(4, 22, 2, 5, 1.2) + dots(4, 29, 2, 5, 1.2)) + fp(rr(47, 6, 13, 38, 3) + slats(51, 12, 5, 6, 24, 1.8, false)) + fp('M13 9h34v32H13z' + slats(16.4, 11.5, 8, 4, 27, 1.4, true)) + ac(6.5, 11, 1.2)),
  guitar_amp: G(56, 50, fp(rr(2, 4, 52, 44, 4) + rr(7, 14, 42, 30, 2) + dots(10, 9, 6, 6.8, 1.7)) + fp(rr(7, 14, 42, 30, 2), 0.14) + Array.from({ length: 7 }, (_, i) => fp(rr(8.5, 16 + i * 4, 39, 0.9, 0.4), 0.7)).join('') + ls('M18 4a10 5 0 0 1 20 0', 1.2) + ac(46, 9, 1.5)),
  bass_amp: G(46, 64, fp(rr(2, 2, 42, 60, 4) + rr(6, 7, 34, 51, 2)) + fp(rr(6, 7, 34, 51, 2), 0.14) + speakerR(23, 22, 11) + speakerR(23, 44, 11) + fp(rr(18, 56, 10, 3, 1.4), 0) + ac(38, 60, 1.3)),
  acoustic_amp: G(52, 44, fp(rr(2, 8, 48, 34, 5) + rr(7, 16, 38, 22, 2)) + fp(rr(7, 16, 38, 22, 2), 0.14) + speakerR(26, 27, 8.5) + fp(dots(10, 12, 5, 8, 1.2)) + ls('M16 8a10 6 0 0 1 20 0', 1.3)),
  multifx: G(60, 30, fp('M4 2h52l4 28H0z' + dots(10, 8, 6, 8, 2) + rr(22, 14, 16, 7, 1.2)) + fp(circ(11, 25, 2.6) + circ(22, 25, 2.6) + circ(33, 25, 2.6) + circ(44, 25, 2.6) + circ(55, 25, 2.2), 0.55)),
  pedalboard: G(64, 40, fp(rr(0, 24, 64, 14, 2)) + [4, 25, 46].map(x => fp(rr(x, 4, 15, 27, 2.5) + circ(x + 4, 10, 2) + circ(x + 11, 10, 2) + circ(x + 7.5, 24, 3.4) + rr(x + 4.5, 15, 6, 2, 1))).join('') + ac(11, 4.8, 0.9) + ac(32, 4.8, 0.9) + ac(53, 4.8, 0.9)),
  acoustic: G(36, 72, fp(rr(15, 1, 6, 4, 1)) + fp(bar(18, 4, 18, 28, 3.6) + circ(15, 7, 1) + circ(21, 7, 1) + circ(15, 12, 1) + circ(21, 12, 1) + circ(15, 17, 1) + circ(21, 17, 1)) + fp('M18 25c9 0 12 8 8 13 6 4 6 14-3 20h-10c-9-6-9-16-3-20-4-5-1-13 8-13z' + circ(18, 40, 5.2)) + fp(circ(18, 40, 5.2), 0.12) + fp(rr(11, 52, 14, 2.6, 1.2)) + ls('M18 38v14', 0.5)),
  horn: G(70, 46, fp('M2 22h20l12-3 20-12c3-2 6 0 6 3v36c0 3-3 5-6 3L34 35 22 32H2c-1.6 0-1.6-10 0-10z' + circ(11, 27, 0)) + fp(ell(56, 24, 3, 14), 0.5) + [14, 19, 24].map(x => fp(rr(x, 10, 3.2, 12, 1.6))).join('') + ls('M9 22V9M2 14h14', 1.2)),
  strings: G(34, 72, fp(circ(17, 4, 3.4)) + fp(bar(17, 6, 17, 28, 2.6)) + fp('M17 24c9-2 11 6 8 11 7 4 8 17-8 17S2 39 9 35c-3-5-1-13 8-11z' + rr(10, 36, 1.2, 8, 0.6) + rr(22.8, 36, 1.2, 8, 0.6)) + fp(rr(12, 40, 10, 1.6, 0.8), 0.3) + fp(rr(11, 52, 12, 3.4, 1.4)) + ls('M17 8v44', 0.5)),
  dj: G(104, 60, [[4, 56], [60, 56]].map(([x]) => fp(ell(x + 20, 30, 22, 12) + ell(x + 20, 30, 20, 10.4)) + fp(ell(x + 20, 30, 17, 8.8) + ell(x + 20, 30, 7, 3.6), 0.55) + fp(ell(x + 20, 30, 1.4, 0.8)) + fp(bar(x + 38, 24, x + 26, 34, 1.6)) + ac(x + 40, 40, 1.2)).join('') + fp(rr(41, 6, 22, 44, 3) + dots(45, 12, 3, 6, 1.5) + rr(46, 26, 12, 1.4, 0.7) + rr(46, 34, 12, 1.4, 0.7)) + fp(rr(48, 38, 3.4, 8, 1)) + fp(rr(54, 40, 3.4, 8, 1))),
  laptop: G(56, 44, fp('M8 2h40l2 26H6z' + 'M11 5v20h34V5z') + fp('M11 5h34v20H11z', 0.1) + fp('M3 30h50l3 10c0 2-1 3-3 3H3c-2 0-3-1-3-3z' + slats(6, 32.5, 3, 3, 44, 1.2) + rr(20, 38, 16, 2.4, 1.2)) + ac(28, 15, 1.5)),
  vocal: G(48, 52, micR(0, 3)),
  backing: G(64, 52, micR(-4, 5, 0.82) + micR(18, 2, 1)),
  choir: G(100, 30, micR(2, -1, 0.66) + micR(35, -1, 0.66) + micR(68, -1, 0.66)),
  talkback: G(48, 52, fp(rr(8, 40, 32, 8, 4) + circ(32, 44, 2.4)) + ls('M18 40c0-14 6-12 8-22', 1.8) + fp(ell(28, 12, 6, 8) + dots(26, 9, 2, 4, 0.9) + dots(25, 13, 3, 3.4, 0.9)) + ac(14, 44, 1.5)),
  stool: G(48, 52, fp(ell(24, 12, 18, 5.5)) + fp('M6 12c0 6 6 9 18 9s18-3 18-9v2c0 7-7 10-18 10S6 21 6 14z', 0.55) + fp(rr(22, 22, 4, 18, 1.4)) + ls('M24 38L8 50M24 38l16 12M24 38v13', 1.6)),
  chair: G(48, 52, fp(rr(11, 2, 26, 22, 4) + slats(15, 6, 3, 5.4, 18, 1.8)) + fp(rr(8, 26, 32, 7, 2.5)) + fp(bar(12, 33, 9, 50, 3) + bar(36, 33, 39, 50, 3) + bar(15, 33, 17, 46, 2.4) + bar(33, 33, 31, 46, 2.4))),
  musicstand: G(52, 50, fp(rr(4, 3, 44, 28, 2) + slats(9, 8, 4, 5, 34, 1.4)) + fp(rr(4, 3, 44, 28, 2), 0.1) + fp(rr(4, 28, 44, 3, 1.2)) + ls('M26 31v12M13 48l13-7 13 7', 1.6)),
  micstand: G(52, 56, ls('M26 52V16M26 52L10 54M26 52l16 2M26 52v-0', 1.8) + ls('M26 18L44 6', 1.6) + fp(ell(46, 7, 3, 5.4) + circ(46, 5, 0.9)) + fp(rr(23, 28, 6, 4, 1.4)) + fp(circ(21, 14, 3.6)) + ls('M18 16l8 2', 1.2)),
  fan: G(52, 56, fp(circ(26, 22, 20) + circ(26, 22, 18.2)) + [0, 120, 240].map(a => `<g transform="rotate(${a} 26 22)">${fp('M26 22c-5-3-6-10-3-15 3-3 8-3 10 0 2 4 0 11-7 15z')}</g>`).join('') + fp(circ(26, 22, 3.2) + circ(26, 22, 1.2)) + ls('M26 43v9M16 54h20', 2.2) + ls('M26 22m-12 0a12 12 0 1 0 24 0a12 12 0 1 0-24 0', 0.4)),
  wedge: G(66, 46, fp('M2 42L12 10c1-3 3-5 6-5h30c3 0 5 2 6 5l10 32c1 2-1 4-3 4H5c-2 0-4-2-3-4z' + rr(26, 8.2, 14, 2, 1) + circ(33, 29, 11) + circ(33, 29, 8.6) + rr(14, 40, 38, 2, 1)) + fp(circ(33, 29, 8.6) + circ(33, 29, 4.4), 0.45) + fp(circ(33, 29, 2.2)) + fp(circ(33, 29, 8.6), 0.08) + ac(50, 38, 1.2)),
  sidefill: G(44, 76, fp(rr(2, 2, 40, 72, 4) + rr(6, 6, 32, 64, 2)) + fp(rr(6, 6, 32, 64, 2), 0.12) + speakerR(22, 24, 12) + speakerR(22, 53, 12) + fp(rr(14, 4.4, 16, 1.6, 0.8), 0)),
  iem: G(52, 50, fp(rr(14, 14, 24, 32, 4) + rr(18, 19, 16, 10, 1.4) + circ(22, 37, 2.4) + circ(30, 37, 2.4)) + ls('M32 14V3M18 3h14', 1.6) + fp(ell(8, 10, 4, 5.2)) + fp(ell(44, 10, 4, 5.2), 0.5) + ac(26, 24, 1.4)),
  pmix: G(48, 40, fp(rr(2, 4, 44, 32, 4) + rr(7, 8, 18, 9, 1.4) + circ(34, 13, 4.2) + circ(15, 28, 3.6) + circ(26, 28, 3.6) + circ(37, 28, 3.6)) + fp(circ(34, 13, 1.4)) + ac(10, 12, 1.2)),
  mon_desk: deskR(5), foh_desk: deskR(8), lxdesk: deskR(4),
  rack: G(44, 56, rackR(44, 56, 4)),
  dimmer: G(44, 56, rackR(44, 56, 4) + ac(38, 6, 1.5)),
  wireless: G(52, 52, fp(rr(2, 28, 48, 22, 3) + rr(6, 33, 18, 7, 1) + circ(34, 36, 2.6) + circ(43, 36, 2.6)) + ls('M12 28L7 4M40 28l5-24', 2.2) + fp(circ(7, 4, 2.4) + circ(45, 4, 2.4)) + ac(10, 45, 1.3)),
  snake: G(60, 42, fp(rr(2, 2, 56, 30, 3) + [10, 20, 30, 40, 50].flatMap(x => [circ(x, 11, 3.8), circ(x, 24, 3.8)]).join('')) + [10, 20, 30, 40, 50].map(x => fp(circ(x, 11, 1.3) + circ(x, 24, 1.3), 0)).join('') + ls('M30 32c0 6 12 4 12 10', 2)),
  di: G(48, 36, fp(rr(2, 4, 44, 28, 4) + circ(14, 18, 7) + circ(14, 18, 4.6) + circ(34, 18, 4)) + fp(dots(11.4, 18, 3, 2.6, 0.7)) + fp(rr(30, 7, 8, 1.6, 0.8), 0) + ac(40, 9, 1.3)),
  pa_main: G(52, 44, fp(rr(2, 4, 48, 38, 4) + rr(8, 8, 36, 5, 1.6) + circ(26, 27, 10.5) + circ(26, 27, 8)) + fp(circ(26, 27, 8) + circ(26, 27, 4.4), 0.55) + fp(circ(26, 27, 2.2)) + ls('M16 4V1h20v3', 1.4) + ac(46, 38, 1.2)),
  sub: G(56, 56, fp(rr(2, 2, 52, 52, 4) + circ(28, 28, 19) + circ(28, 28, 16.4)) + fp(circ(28, 28, 16.4) + circ(28, 28, 12), 0.55) + fp(circ(28, 28, 12) + circ(28, 28, 6), 0.9) + fp(circ(28, 28, 3.4)) + fp(rr(22, 50, 12, 2, 1), 0)),
  amp_rack: G(44, 56, fp(rr(0, 0, 44, 56, 3) + slats(5, 5, 5, 9.4, 34, 6.2) + dots(4, 53, 1, 0, 0)) + Array.from({ length: 5 }, (_, i) => fp(rr(7, 6 + i * 9.4, 30, 3.6, 1.2), 0.5) + fp(dots(32, 7.8 + i * 9.4, 2, 3, 0.9))).join('')),
  ac: G(48, 48, fp(rr(3, 3, 42, 42, 9) + rr(15, 10, 4.4, 13, 1.4) + rr(28.6, 10, 4.4, 13, 1.4) + circ(24, 32, 3.4)) + fp(circ(24, 24, 20), 0.07) + ac(24, 32, 1.4)),
  strip: G(104, 28, fp(rr(0, 4, 104, 20, 4) + [8, 28, 48, 68].map(x => rr(x, 8, 16, 12, 2.4)).join('') + rr(90, 9, 9, 10, 2)) + [8, 28, 48, 68].map(x => fp(rr(x + 3, 10.4, 2.2, 5, 0.6) + rr(x + 10.4, 10.4, 2.2, 5, 0.6) + circ(x + 8, 17.5, 1.1), 0.9)).join('') + ac(94.5, 14, 1.8)),
  power: G(48, 48, fp('M16 2h6v10H16zM26 2h6v10h-6zM10 12h28v12c0 7-5 12-14 12S10 31 10 24z') + fp(rr(22, 34, 4, 12, 2)) + ac(24, 20, 2)),
  lpower: G(48, 48, fp('M16 2h6v10H16zM26 2h6v10h-6zM10 12h28v12c0 7-5 12-14 12S10 31 10 24z') + fp(rr(22, 34, 4, 12, 2)) + ac(24, 20, 2)),
  breaker: G(44, 56, fp(rr(2, 2, 40, 52, 3) + rr(6, 6, 32, 6, 1) + [0, 1].flatMap(r => [0, 1, 2].map(c => rr(7 + c * 10.4, 17 + r * 17, 7, 13, 1.4))).join('')) + [0, 1].flatMap(r => [0, 1, 2].map(c => fp(rr(8.6 + c * 10.4, 18.6 + r * 17, 3.8, 5, 0.8), 0.9))).join('') + ac(22, 9, 1.3)),
  generator: G(64, 46, fp('M4 4h56v6H4z') + ls('M6 4v34M58 4v34M6 8h52', 1.8) + fp(rr(8, 12, 30, 24, 3) + dots(12, 20, 2, 7, 2.2) + rr(12, 27, 22, 3, 1)) + fp(rr(40, 12, 16, 24, 3) + circ(48, 22, 5) + circ(48, 22, 2.4)) + fp(circ(14, 42, 4) + circ(50, 42, 4) + circ(14, 42, 1.4) + circ(50, 42, 1.4)) + ac(33, 18, 1.4)),
  net: G(60, 34, fp(rr(2, 4, 56, 26, 3) + [0, 1, 2, 3, 4].map(i => rr(7 + i * 10, 11, 7, 7, 1)).join('') + dots(9, 25, 5, 10, 1)) + ac(54, 8, 1.2) + ac(54, 26, 1.2)),
  teleprompter: G(56, 52, fp(rr(4, 3, 48, 28, 3) + rr(8, 7, 40, 20, 1.6)) + fp(rr(8, 7, 40, 20, 1.6), 0.12) + fp(circ(28, 37, 5) + circ(28, 37, 2.6), 1) + ls('M28 42v6M16 52l12-6 12 6', 1.6)),
  // luz
  par64: G(48, 48, lensCan(18, 4, 1)), par56: G(48, 48, lensCan(16, 3, 1)), par38: G(48, 48, lensCan(13, 3)), pinspot: G(48, 48, lensCan(9, 1)),
  ledpar: G(48, 48, ls('M7 30V12h34v18', 1.3) + fp(rr(18, 6, 12, 6, 2)) + fp(circ(24, 30, 17) + circ(24, 30, 14.4)) + fp(circ(24, 30, 14.4), 0.12) + [0, 1, 2, 3, 4, 5].map(i => fp(circ(24 + Math.cos(i * 1.047) * 8, 30 + Math.sin(i * 1.047) * 8, 2.6))).join('') + fp(circ(24, 30, 3)) + ac(24, 30, 1.2)),
  ledpanel: G(48, 48, fp(rr(2, 2, 44, 44, 4) + rr(6, 6, 36, 36, 2)) + [0, 1, 2, 3].flatMap(r => [0, 1, 2, 3].map(c => fp(circ(12.5 + c * 7.7, 12.5 + r * 7.7, 2.6)))).join('') + ac(24, 24, 1.6)),
  fresnel: G(48, 48, lensCan(17, 5, 1)),
  pc: G(48, 48, ls('M7 30V12h34v18', 1.3) + fp(rr(14, 4, 20, 8, 2)) + fp(circ(24, 30, 19.5) + circ(24, 30, 17)) + fp(circ(24, 30, 15) + circ(24, 30, 3), 0.28) + fp(circ(24, 30, 2.4))),
  ellips: G(64, 44, ls('M14 6h12v6', 1.3) + fp(rr(4, 11, 36, 24, 4) + slats(8, 15, 3, 6, 28, 1.6)) + fp('M40 11l14-5c2-1 4 1 4 3v26c0 2-2 4-4 3L40 35z' + ell(54, 22, 2.6, 9)) + fp(rr(2, 14, 4, 18, 1.5)) + ac(14, 30, 1.2)),
  moving_spot: moverR(fp(circ(26, 22, 8) + circ(26, 22, 5.6)) + ac(26, 22, 2.6)),
  moving_beam: moverR(fp(circ(26, 22, 6.5) + circ(26, 22, 4)) + ac(26, 22, 1.8) + ls('M20 28l-5 22M32 28l5 22', 0.8)),
  moving_wash: moverR([[26, 15], [32, 21], [20, 21], [26, 27], [26, 21]].map(([x, y]) => fp(circ(x, y, 2.8) + circ(x, y, 1.3))).join('') + ac(26, 21, 1)),
  ledbar: G(104, 24, fp(rr(0, 2, 104, 20, 4) + rr(4, 6, 96, 12, 2)) + Array.from({ length: 12 }, (_, i) => fp(circ(10 + i * 7.7, 12, 2.6))).join('') + ac(52, 12, 1)),
  uvbar: G(104, 24, fp(rr(0, 2, 104, 20, 4) + rr(4, 6, 96, 12, 2)) + Array.from({ length: 12 }, (_, i) => fp(circ(10 + i * 7.7, 12, 2.6), 0.6)).join('') + ac(52, 12, 1.4)),
  scanner: G(48, 48, fp(rr(4, 4, 40, 40, 5)) + fp(rr(9, 9, 30, 30, 2.4), 0) + `<g transform="rotate(-35 24 24)">${fp(rr(8, 17, 32, 14, 3))}</g>` + ac(24, 24, 2) + fp(dots(8, 41, 4, 3, 0.8), 0)),
  strobe: G(64, 44, fp(rr(2, 4, 60, 36, 4) + rr(7, 9, 50, 26, 2)) + [0, 1, 2, 3].map(i => fp(rr(9, 11 + i * 6, 46, 3.6, 1.6), 0.8)).join('') + ac(58, 8, 1.2)),
  blinder: G(64, 40, fp(rr(2, 3, 60, 34, 4) + rr(7, 8, 50, 24, 2)) + fp(circ(21, 20, 9.4) + circ(21, 20, 7.6) + circ(43, 20, 9.4) + circ(43, 20, 7.6)) + fp(circ(21, 20, 3) + circ(43, 20, 3)) + ac(32, 6, 1)),
  cyc: G(64, 44, fp('M2 38L9 8c.6-2 2-4 4-4h38c2 0 3.4 2 4 4l7 30c.4 2-.8 4-3 4H5c-2.2 0-3.4-2-3-4z' + rr(10, 29, 44, 4, 1.4)) + fp(rr(8, 12, 48, 14, 2), 0.14) + ls('M32 6v6', 1.2)),
  follow: G(52, 76, fp('M6 6c0-3 2-4 5-4h22c4 0 8 6 8 18v8H6z' + circ(30, 20, 8)) + fp(ell(30, 20, 8, 8), 0.2) + ls('M20 24l-7 12M30 28v24M14 72l16-20 16 20', 1.6) + fp(rr(18, 34, 8, 6, 1.4)) + ac(8, 14, 1.2)),
  mirrorball: G(48, 56, ls('M24 1v11', 1.2) + fp(rr(20, 10, 8, 4, 1.4)) + fp(circ(24, 34, 20) + [-14, -7, 0, 7, 14].map(dy => { const hw = Math.sqrt(400 - dy * dy) - 1.8; return rr(24 - hw, 34 + dy - 0.55, 2 * hw, 1.1, 0.5) }).join('') + [-14, -7, 0, 7, 14].map(dx => { const hh = Math.sqrt(400 - dx * dx) - 1.8; return rr(24 + dx - 0.55, 34 - hh, 1.1, 2 * hh, 0.5) }).join('')) + ac(16, 26, 1.4)),
  laser: G(56, 46, fp(rr(2, 14, 36, 24, 4) + rr(6, 18, 14, 8, 1) + dots(25, 22, 3, 4.4, 1.2) + circ(31, 31, 2)) + fp(rr(38, 21, 8, 10, 2)) + ls('M46 26L56 10M46 26h10M46 26l10 16', 1) + ac(10, 33, 1.6)),
  fog: G(64, 46, fp(rr(2, 12, 40, 26, 4) + rr(7, 17, 20, 8, 1) + circ(34, 21, 2.4) + dots(8, 31, 6, 5, 1)) + fp(rr(42, 20, 10, 8, 2)) + fp(circ(56, 14, 5) + circ(60, 24, 3.2) + circ(54, 5, 2.6), 0.4) + ls('M6 38v6M38 38v6', 1.6) + ac(22, 33, 1.3)),
  haze: G(64, 40, fp(rr(2, 6, 42, 28, 4) + rr(7, 11, 22, 8, 1) + circ(37, 14, 2.4) + dots(8, 26, 6, 5.4, 1)) + fp(rr(44, 15, 8, 8, 2)) + ls('M54 12c3-3 5 3 8 0M54 18c3-3 5 3 8 0M54 24c3-3 5 3 8 0', 1) + ac(22, 29, 1.3)),
  cannon: G(32, 64, fp(rr(8, 16, 16, 44, 4) + circ(16, 26, 2.2) + rr(14, 34, 4, 14, 1.4)) + fp(rr(5, 8, 22, 10, 4)) + fp(circ(9, 3, 1.8) + circ(16, 2, 1.8) + circ(23, 3, 1.8), 0.6) + fp(rr(6, 58, 20, 4, 2)) + ac(16, 52, 1.4)),
  lightstand: G(56, 56, ls('M28 54V14M10 14h36M16 54l12-8 12 8', 1.8) + fp(rr(25, 26, 6, 5, 1.4)) + [10, 46].map(x => fp(circ(x, 9, 7) + circ(x, 9, 5)) + fp(circ(x, 9, 2.4)) + ls(`M${x - 6} 14h12`, 1.2)).join('')),
  dmxsplit: G(56, 30, fp(rr(2, 3, 52, 24, 3) + [0, 1, 2, 3].map(i => circ(10 + i * 10, 20, 2.6)).join('') + rr(8, 7, 24, 5, 1) + circ(46, 19, 4.6)) + fp(circ(46, 19, 1.6)) + ac(44, 9, 1.4)),
}
