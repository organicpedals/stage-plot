import { cropToRatio } from '../pdfDoc'
import type { Doc } from '../pdfDoc'
import { bandName } from '../content'

/** Utilitários de desenho compartilhados pelos modelos (nenhum é decoração: só foto, logo e ajuste de texto). */
export function drawLogo(d: Doc, x: number, y: number, maxW: number, maxH: number) {
  const src = d.p.press.logo; if (!src) return 0
  try {
    const pr = d.d.getImageProperties(src), k = Math.min(maxW / pr.width, maxH / pr.height)
    d.d.addImage(src, pr.fileType, x, y, pr.width * k, pr.height * k, undefined, 'FAST'); d.mark(y + pr.height * k)
    return pr.width * k
  } catch { return 0 }
}

/** Foto do usuário recortada (cover, sem distorcer) para a caixa; P&B em escala de cinza. Só as páginas 1 e última chamam isto. */
export async function photo(d: Doc, x: number, y: number, w: number, h: number) {
  const src = d.p.press.photo; if (!src) return false
  try { d.d.addImage(await cropToRatio(src, w / h, d.mono), 'JPEG', x, y, w, h, undefined, 'FAST'); d.mark(y + h); return true } catch { return false }
}

export const name = (d: Doc) => bandName(d.p)

/** Maior corpo (entre min e max) em que o texto cabe em `maxLines` linhas na largura `w`. */
export const fitSize = (d: Doc, s: string, w: number, max: number, min: number, o: { style?: 'bold' | 'normal'; maxLines?: number; font?: 'sans' | 'display' } = {}) => {
  let size = max, lines: string[] = []
  const to = { style: o.style ?? 'bold', font: o.font }
  for (; size > min; size -= 1) { lines = d.wrap(s, w, { size, ...to }); if (lines.length <= (o.maxLines ?? 2) && lines.every(l => d.tw(l, { size, ...to }) <= w)) break }
  if (size <= min) { size = min; lines = d.wrap(s, w, { size, ...to }) }
  return { size, lines }
}
