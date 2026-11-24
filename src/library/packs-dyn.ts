/* Pacote D · Semi-realista (contorno): glifos GERADOS a partir dos parâmetros do item, só em traço (sem preenchimento).
   O desenho muda com a configuração: marca e nº de alto-falantes do ampli, tons/surdos/bumbos/pratos da bateria,
   tipo e quantidade de peças de percussão, nº de teclas. Percussão em vista superior; amplis e teclados idem/frontal.
   Unidade = centímetros (a pegada no mapa acompanha a configuração). Itens sem gerador usam o glifo de contorno do pacote Figma. */
import type { Params } from './icons'
import type { Glyph } from './packs'

const N = (P: Params, k: string, d = 0) => (Number.isFinite(Number(P[k])) && P[k] !== '' && P[k] !== undefined ? Number(P[k]) : d)
const B = (P: Params, k: string) => P[k] === true || P[k] === 'true'
const S = (P: Params, k: string) => String(P[k] ?? '')

const sk = (d: string, m = 1, c = '$I') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="$L(${m})" stroke-linecap="round" stroke-linejoin="round"/>`
const R = (x: number, y: number, w: number, h: number, r = 1.5, m = 1, c = '$I') => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${r}" fill="none" stroke="${c}" stroke-width="$L(${m})" stroke-linejoin="round"/>`
const C = (x: number, y: number, r: number, m = 1, c = '$I') => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="none" stroke="${c}" stroke-width="$L(${m})"/>`
const L = (x1: number, y1: number, x2: number, y2: number, m = 1) => sk(`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`, m)
const place = (x: number, y: number, inner: string) => `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${inner}</g>`
const range = (n: number) => Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => i)
const knobs = (x: number, y: number, n: number, gap: number, r: number) => range(n).map(i => C(x + i * gap, y, r, 0.8) + L(x + i * gap, y, x + i * gap + Math.sin(i * 1.3) * r * 0.8, y - Math.cos(i * 1.3) * r * 0.8, 0.6)).join('')
const speaker = (cx: number, cy: number, d: number) => C(cx, cy, d / 2, 0.9) + C(cx, cy, d * 0.4, 0.5) + C(cx, cy, d * 0.12, 0.6)
const ledA = (x: number, y: number) => C(x, y, 1.2, 1, '$A')

// ---------- amplificadores ----------
function cabinet(n: number, inch: number, head: boolean, bass: boolean): Glyph {
  // o gabinete tem sempre o tamanho mínimo de 2 alto-falantes (guitarra: 2x12; baixo: 4 alto-falantes); com menos, só desenha menos falantes
  const [cols, rows] = bass ? ({ 1: [2, 2], 2: [2, 2], 4: [2, 2], 6: [2, 3], 8: [2, 4] } as Record<number, [number, number]>)[n] ?? [2, 2] : n >= 4 ? [2, 2] : [2, 1]
  const slots: [number, number][] = range(cols * rows).map(i => [i % cols, Math.floor(i / cols)])
  const used: [number, number][] = n >= cols * rows ? slots : n === 1 ? [[(cols - 1) / 2, (rows - 1) / 2]] : n === 2 && rows === 2 ? [[0, 0.5], [1, 0.5]] : slots.slice(0, n)
  const d = inch * 2.54 * 0.88, gap = 3.5, pad = 4.5
  const gw = cols * d + (cols - 1) * gap, gh = rows * d + (rows - 1) * gap
  const combo = !head, panelH = combo && !bass ? 13 : 0
  const bw = gw + pad * 2, bh = gh + pad * 2 + panelH
  const hh = head ? (bass ? 15 : 20) : 0, hw = head ? Math.min(Math.max(bw, 48), bass ? 56 : 72) : 0
  const W = Math.max(bw, hw) + 4, H = hh + bh + 7, x0 = (W - bw) / 2, y0 = hh
  let s = ''
  if (head) {
    const hx = (W - hw) / 2, kn = Math.min(6, Math.floor((hw - 24) / 7))
    s += R(hx, 0, hw, hh, 2.5) + sk(`M${hx + hw / 2 - 8} 0V-2.4h16V0`, 0.9)
    s += knobs(hx + 9, hh / 2 + 1, kn, (hw - 28) / Math.max(1, kn - 1), 2.1) + R(hx + hw - 16, hh / 2 - 2.6, 8, 5.2, 1, 0.6) + ledA(hx + hw - 4, hh / 2)
  }
  s += R(x0, y0, bw, bh, 3)
  if (panelH) {
    const kn = Math.min(6, Math.floor((bw - 24) / 7))
    s += L(x0 + 1.5, y0 + panelH, x0 + bw - 1.5, y0 + panelH, 0.8) + knobs(x0 + 9, y0 + panelH / 2, kn, (bw - 28) / Math.max(1, kn - 1), 2) + ledA(x0 + bw - 6, y0 + panelH / 2)
  }
  const gx = x0 + pad * 0.55, gy = y0 + panelH + pad * 0.55, gW = bw - pad * 1.1, gH = bh - panelH - pad * 1.1
  s += R(gx, gy, gW, gH, 1.5, 0.8)
  used.forEach(([c, r]) => { s += speaker(gx + (gW - gw) / 2 + d / 2 + c * (d + gap), gy + (gH - gh) / 2 + d / 2 + r * (d + gap), d) })
  s += R(x0 + 3, y0 + bh, 5, 3, 1, 0.8) + R(x0 + bw - 8, y0 + bh, 5, 3, 1, 0.8)
  return { w: W, h: H, d: s }
}

// ---------- bateria (vista superior; baterista embaixo) ----------
const drumTop = (cx: number, cy: number, r: number, lugs = 8, accent = false) =>
  C(cx, cy, r, 1) + C(cx, cy, r - 1.5, 0.5) + C(cx, cy, r * 0.42, 0.45, accent ? '$A' : '$I') + range(lugs).map(i => { const a = (i * 2 * Math.PI) / lugs + 0.2; return L(cx + Math.cos(a) * (r + 0.4), cy + Math.sin(a) * (r + 0.4), cx + Math.cos(a) * (r + 2.4), cy + Math.sin(a) * (r + 2.4), 0.9) }).join('')

// Montagem do kit posicionada à mão no editor (tools/drum-editor.html), em cm, com a bateria olhando para CIMA
// (origem = centro-topo do bumbo; x→direita, y→baterista). No mapa o baterista fica ao fundo olhando a plateia (para baixo),
// então o desenho inteiro é girado 180°. Só o shell pack: sem pratos, estantes, banco, pedais ou chimbal.
const KICK_POS: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-30, 0], [30, 0]] }
const TOM_POS: Record<number, [number, number][]> = { 0: [], 1: [[-12, 15]], 2: [[-17, 17], [17, 16]], 3: [[-47, 21], [-14, 9], [25, 11]], 4: [[-64, 37], [-46, 15], [-14, 6], [23, 10]] }
const TOM_IN: Record<number, number[]> = { 0: [], 1: [12], 2: [10, 12], 3: [10, 12, 13], 4: [8, 10, 12, 13] }
const SNARE_POS: [number, number] = [-28, 54]
const FLOOR_POS: Record<number, [number, number][]> = { 0: [], 1: [[37, 54]], 2: [[63, 85], [46, 44]] }
const FLOOR_IN = [16, 14]
function drums(P: Params): Glyph {
  const k = Math.min(2, Math.max(1, N(P, 'kick', 1))), t = Math.min(4, Math.max(0, N(P, 'toms', 2))), f = Math.min(2, Math.max(0, N(P, 'floors', 1)))
  const parts: { s: string; x0: number; y0: number; x1: number; y1: number }[] = []
  const add = (s: string, cx: number, cy: number, r: number) => parts.push({ s, x0: cx - r - 3, y0: cy - r - 3, x1: cx + r + 3, y1: cy + r + 3 })
  const kw = 56, kd = 40
  KICK_POS[k].forEach(([x]) => parts.push({ s: R(x - kw / 2, 0, kw, kd, 3) + L(x - kw / 2, 4, x + kw / 2, 4, 0.7) + L(x - kw / 2, kd - 4, x + kw / 2, kd - 4, 0.7) + range(5).map(j => L(x - 20 + j * 10, 4, x - 20 + j * 10, kd - 4, 0.4)).join(''), x0: x - kw / 2, y0: 0, x1: x + kw / 2, y1: kd }))
  TOM_POS[t].forEach(([x, y], i) => add(drumTop(x, y, (TOM_IN[t][i] * 2.54) / 2, 8, i === 0), x, y, (TOM_IN[t][i] * 2.54) / 2))
  add(drumTop(SNARE_POS[0], SNARE_POS[1], (14 * 2.54) / 2, 10), SNARE_POS[0], SNARE_POS[1], (14 * 2.54) / 2)
  FLOOR_POS[f].forEach(([x, y], i) => add(drumTop(x, y, (FLOOR_IN[i] * 2.54) / 2, 10), x, y, (FLOOR_IN[i] * 2.54) / 2))
  const minX = Math.min(...parts.map(p => p.x0)), minY = Math.min(...parts.map(p => p.y0)), maxX = Math.max(...parts.map(p => p.x1)), maxY = Math.max(...parts.map(p => p.y1))
  const inner = `<g transform="rotate(180 ${((minX + maxX) / 2).toFixed(2)} ${((minY + maxY) / 2).toFixed(2)})">${parts.map(p => p.s).join('')}</g>`
  return { w: maxX - minX + 4, h: maxY - minY + 4, d: place(2 - minX, 2 - minY, inner) }
}

// ---------- percussão (vista superior) ----------
function perc(P: Params): Glyph {
  const type = S(P, 'type') || 'Congas', n = Math.max(1, N(P, 'pieces', 3))
  const conga = (cx: number, cy: number, r: number) => C(cx, cy, r + 2, 0.9) + C(cx, cy, r, 1) + C(cx, cy, r - 3.2, 0.5) + C(cx, cy, (r - 3.2) * 0.35, 0.4) + range(5).map(i => { const a = (i * 2 * Math.PI) / 5; return L(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4), 0.9) }).join('')
  const perRow = type === 'Cajón' ? 3 : 4
  const row = (i: number) => Math.floor(i / perRow), col = (i: number) => i % perRow
  let s = '', cw = 0, ch = 0
  const cells = range(n).map(i => ({ i, c: col(i), r: row(i) }))
  const cell = type === 'Cajón' ? 40 : type === 'Pandeiro' ? 38 : type === 'Bongô' ? 56 : type === 'Timbal' ? 40 : 42
  cells.forEach(({ i, c, r }) => {
    const cx = c * cell + cell / 2, cy = r * cell + cell / 2
    if (type === 'Congas') s += conga(cx, cy, 15 - Math.min(i, 3) * 1.2)
    else if (type === 'Bongô') s += conga(cx - 13, cy, 9) + conga(cx + 13, cy, 11) + L(cx - 1, cy - 2, cx + 1, cy - 2, 1.2)
    else if (type === 'Timbal') s += C(cx, cy, 16 - (i % 2), 1) + C(cx, cy, 14 - (i % 2), 0.5) + C(cx, cy, 7, 0.4) + range(8).map(j => { const a = (j * Math.PI) / 4; return L(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, cx + Math.cos(a) * 18.2, cy + Math.sin(a) * 18.2, 0.9) }).join('')
    else if (type === 'Pandeiro') s += C(cx, cy, 16, 1) + C(cx, cy, 13, 0.5) + range(4).map(j => { const a = (j * Math.PI) / 2 + 0.5; return R(cx + Math.cos(a) * 14.6 - 3, cy + Math.sin(a) * 14.6 - 1.2, 6, 2.4, 1, 0.6) }).join('')
    else if (type === 'Cajón') s += R(cx - 15, cy - 15, 30, 30, 2.5, 1) + R(cx - 12, cy - 12, 24, 24, 1.5, 0.5) + C(cx, cy, 3.6, 0.5) + L(cx - 15, cy - 9, cx + 15, cy - 9, 0.5)
    else s += C(cx, cy, 11 - (i % 3) * 1.5, 1) + C(cx, cy, 8.5 - (i % 3) * 1.5, 0.5) + C(cx, cy, 3, 0.4)
    cw = Math.max(cw, (c + 1) * cell); ch = Math.max(ch, (r + 1) * cell)
  })
  if (type === 'Rack misto') s += L(cell / 2, ch - 3, Math.min(n, perRow) * cell - cell / 2, ch - 3, 1.2)
  return { w: cw + 2, h: ch + 2, d: place(1, 1, s) }
}

// ---------- teclado (vista superior) ----------
function keys(P: Params): Glyph {
  const size = N(P, 'size', 88), units = Math.max(1, N(P, 'units', 1))
  const whites = Math.round((size * 7) / 12), kw = 2.35, W = whites * kw + 14, D = 34
  let one = R(0, 0, W, D, 3) + R(7, 12, whites * kw, D - 15, 0.8, 0.7) + knobs(11, 6, 4, 6, 1.6) + R(W - 28, 3.4, 18, 5.4, 1, 0.6) + ledA(W - 5, 6)
  for (let i = 1; i < whites; i++) one += L(7 + i * kw, 12, 7 + i * kw, D - 3, 0.3)
  for (let i = 0; i < whites - 1; i++) { const m = i % 7; if (m === 2 || m === 6) continue; one += R(7 + (i + 1) * kw - 0.7, 12, 1.4, 11, 0.3, 0.6) }
  const gap = D + 3
  return { w: W + 2, h: units * gap + 0, d: place(1, 1, range(units).map(u => place(0, u * gap, one)).join('')) }
}

// ---------- spot / retorno de palco (vista superior) ----------
function wedge(P: Params): Glyph {
  const inch = N(P, 'size', 12), w = inch * 2.54 * 1.85, d = w * 0.72, tw = w * 0.72, x0 = (w - tw) / 2
  const sx = 3, sy = 3.6 // folga da grelha
  const outer = `M${x0 + 3} 0H${x0 + tw - 3}Q${x0 + tw} 0 ${x0 + tw + 1.6} 3L${w - 0.6} ${d - 4}Q${w + 0.4} ${d} ${w - 3.6} ${d}H3.6Q-0.4 ${d} 0.6 ${d - 4}L${x0 - 1.6} 3Q${x0} 0 ${x0 + 3} 0Z`
  const gx = (k: number) => x0 + sx + k, inner = `M${x0 + sx + 2} ${sy}H${x0 + tw - sx - 2}L${w - sx - 3.4} ${d - sy - 4}H${sx + 3.4}Z`
  const r = Math.min(inch * 2.54 * 0.4, d * 0.34), cy = d * 0.58
  let s = sk(outer, 1) + sk(inner, 0.8)
  s += C(w / 2, cy, r, 0.9) + C(w / 2, cy, r * 0.78, 0.5) + C(w / 2, cy, r * 0.3, 0.6)
  if (inch >= 12) s += R(w / 2 - 6, sy + 3, 12, 3.4, 1.4, 0.7)
  s += R(w / 2 - 9, d - 2.2, 18, 1.8, 0.9, 0.7) + C(sx + 9, d - sy - 6.5, 1.2, 1, '$A')
  void gx
  return { w: w + 2, h: d + 2, d: place(1, 1, s) }
}

export const DYN: Record<string, (P: Params) => Glyph> = {
  guitar_amp: P => cabinet(N(P, 'speakers', 2), N(P, 'size', 12), B(P, 'head'), false),
  bass_amp: P => cabinet(N(P, 'speakers', 4), N(P, 'size', 10), B(P, 'head'), true),
  drums, perc, keys, wedge,
}
