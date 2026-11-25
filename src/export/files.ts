import { styleOf } from './pdfStyles'
import { boardSvg, THEMES } from './boardSvg'
import { buildPdf, PdfOptions } from './pdf'
import { exportPayload } from '../model/io'
import type { Board, Project } from '../model/types'

export function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

const slug = (s: string) => (s || 'banda').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

export type Look = 'paper' | 'dark' | 'mono'

export function exportSvg(p: Project, board: Board, look: Look) {
  const { svg } = boardSvg(p, board, { theme: THEMES[look], showLegend: false, showScale: false })
  download(new Blob([svg], { type: 'image/svg+xml' }), `${slug(p.band.name || p.name)}-${board}-${p.version}.svg`)
}

export async function exportPng(p: Project, board: Board, look: Look, width = 2400) {
  const { svg, w, h } = boardSvg(p, board, { theme: THEMES[look], showLegend: false, showScale: false, width })
  const img = new Image()
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg')); img.src = url })
  const c = document.createElement('canvas'); c.width = width; c.height = Math.round((width * h) / w)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  URL.revokeObjectURL(url)
  const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), 'image/png'))
  download(blob, `${slug(p.band.name || p.name)}-${board}-${p.version}.png`)
}

export async function pdfBlob(p: Project, opts?: PdfOptions) {
  const doc = await buildPdf(p, opts)
  return doc.output('blob') as Blob
}

export async function exportPdf(p: Project, opts?: PdfOptions) {
  const blob = await pdfBlob(p, opts)
  const mono = opts?.mono ?? p.pdfMono
  download(blob, `${slug(p.band.name || p.name)}-rider-${slug(p.version)}-${styleOf(p).id}${mono ? '-pb' : ''}.pdf`)
}

export function exportJson(p: Project) {
  download(new Blob([JSON.stringify(exportPayload([p]), null, 2)], { type: 'application/json' }), `${slug(p.name)}.stageplot.json`)
}

/** Backup de todos os projetos num único arquivo. */
export function exportAllJson(ps: Project[]) {
  download(new Blob([JSON.stringify(exportPayload(ps), null, 2)], { type: 'application/json' }), `stageplot-backup-${new Date().toISOString().slice(0, 10)}.stageplot.json`)
}
