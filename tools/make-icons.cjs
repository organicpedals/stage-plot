/* Gera o ícone do app (ICO/PNG) e o logo (SVG/PNG) a partir da geometria abaixo, sem dependências.
 *   node tools/make-icons.cjs
 * Saídas: build/icon.ico, build/icon.png, public/brand/*.svg, public/brand/*.png, public/favicon.svg */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ---- paleta (a mesma do PDF no tema claro) ----
const PAPER = '#FAF9F6', INK = '#1C1C1E', LINE = '#CFCABB', INK_LIGHT = '#F3F1EA'

// ---- geometria (unidades de um tile 150×150): três quadrados cheios + um vazado no canto inferior direito ----
const CELLS = [[25, 25], [80, 25], [25, 80]] // 45×45, raio 11
const HOLLOW = { x: 82.5, y: 82.5, s: 40, r: 9, stroke: 5 }

const svgCells = (c, tx = 0, ty = 0) =>
  `<g fill="${c}">${CELLS.map(([x, y]) => `<rect x="${x - tx}" y="${y - ty}" width="45" height="45" rx="11"/>`).join('')}</g>` +
  `<rect x="${HOLLOW.x - tx}" y="${HOLLOW.y - ty}" width="${HOLLOW.s}" height="${HOLLOW.s}" rx="${HOLLOW.r}" fill="none" stroke="${c}" stroke-width="${HOLLOW.stroke}"/>`

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect x=".75" y=".75" width="148.5" height="148.5" rx="33.25" fill="${PAPER}" stroke="${LINE}" stroke-width="1.5"/>${svgCells(INK)}</svg>\n`
const logoSvg = c => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${svgCells(c, 25, 25)}</svg>\n`

// ---- rasterizador mínimo (SDF + supersampling 4×4) ----
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const sdRound = (px, py, x, y, w, h, r) => { // distância com sinal a um retângulo arredondado (negativa dentro)
  const cx = x + w / 2, cy = y + h / 2, qx = Math.abs(px - cx) - (w / 2 - r), qy = Math.abs(py - cy) - (h / 2 - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}
/** layers: lista de {fn(px,py)->bool, color} em ordem de pintura; view = [x, y, w, h] em unidades do desenho */
function raster(size, view, layers) {
  const px = Buffer.alloc(size * size * 4), SS = 4, k = view[2] / size
  const cols = layers.map(l => hex(l.color))
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0, g = 0, b = 0, a = 0
    for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) {
      const x = view[0] + (i + (si + 0.5) / SS) * k, y = view[1] + (j + (sj + 0.5) / SS) * k
      let hit = -1
      layers.forEach((l, n) => { if (l.fn(x, y)) hit = n })
      if (hit >= 0) { r += cols[hit][0]; g += cols[hit][1]; b += cols[hit][2]; a++ }
    }
    const o = (j * size + i) * 4, n = SS * SS
    if (a) { px[o] = Math.round(r / a); px[o + 1] = Math.round(g / a); px[o + 2] = Math.round(b / a) }
    px[o + 3] = Math.round((a / n) * 255)
  }
  return px
}
const cellLayers = color => [
  ...CELLS.map(([x, y]) => ({ color, fn: (px, py) => sdRound(px, py, x, y, 45, 45, 11) <= 0 })),
  { color, fn: (px, py) => Math.abs(sdRound(px, py, HOLLOW.x, HOLLOW.y, HOLLOW.s, HOLLOW.s, HOLLOW.r)) <= HOLLOW.stroke / 2 },
]
const iconLayers = () => [
  { color: LINE, fn: (px, py) => sdRound(px, py, 0, 0, 150, 150, 34) <= 0 },
  { color: PAPER, fn: (px, py) => sdRound(px, py, 1.5, 1.5, 147, 147, 32.5) <= 0 },
  ...cellLayers(INK),
]

// ---- PNG / ICO ----
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}
function ico(sizes) {
  const imgs = sizes.map(s => png(s, raster(s, [0, 0, 150, 150], iconLayers())))
  const head = Buffer.alloc(6 + 16 * sizes.length); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4)
  let off = head.length
  sizes.forEach((s, i) => { const o = 6 + i * 16; head[o] = s >= 256 ? 0 : s; head[o + 1] = s >= 256 ? 0 : s; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(imgs[i].length, o + 8); head.writeUInt32LE(off, o + 12); off += imgs[i].length })
  return Buffer.concat([head, ...imgs])
}

const out = (p, d) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, d); console.log('✓', p) }
const root = path.join(__dirname, '..')
out(path.join(root, 'build/icon.ico'), ico([16, 24, 32, 48, 64, 128, 256]))
out(path.join(root, 'build/icon.png'), png(512, raster(512, [0, 0, 150, 150], iconLayers())))
out(path.join(root, 'public/favicon.svg'), iconSvg)
out(path.join(root, 'public/brand/icon.svg'), iconSvg)
out(path.join(root, 'public/brand/logo-dark.svg'), logoSvg(INK))
out(path.join(root, 'public/brand/logo-light.svg'), logoSvg(INK_LIGHT))
out(path.join(root, 'public/brand/icon.png'), png(1024, raster(1024, [0, 0, 150, 150], iconLayers())))
out(path.join(root, 'public/brand/logo-dark.png'), png(1024, raster(1024, [25, 25, 100, 100], cellLayers(INK))))
out(path.join(root, 'public/brand/logo-light.png'), png(1024, raster(1024, [25, 25, 100, 100], cellLayers(INK_LIGHT))))
