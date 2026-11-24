import type { jsPDF } from 'jspdf'
import type { Project } from '../model/types'
import { activeParts, Part } from './parts'
import { riderOf, pad2 } from './content'
import { Doc } from './pdfDoc'
import { styleOf } from './pdfStyles'

export { svgElement } from './pdfDoc'
export { inputColumns, outputColumns, fitInputs } from './content'
export interface PdfOptions { /** P&B / alto contraste (padrão: p.pdfMono). */ mono?: boolean }

const titleOf = (doc: Doc, part: Part) => ({ intro: '', outro: '', stage: doc.L.stage, inputs: doc.L.inputs, rider: doc.L.rider, light: doc.L.light } as Record<Part, string>)[part]

/**
 * Monta o documento. O motor só decide a ORDEM FIXA (1 introdução, 2 rider a partir da p.2, 3 mapa de palco, 4 input list + saídas,
 * 5 mapa de luz), omite o que não tem dado e abre a página de cada seção; o desenho de cada página é do modelo.
 */
export async function buildDoc(p: Project, opts: PdfOptions = {}): Promise<Doc> {
  const doc = new Doc(p, styleOf(p), opts.mono ?? p.pdfMono ?? false)
  const tpl = doc.tpl, nm = (p.band.name || p.name || '').trim()
  doc.d.setProperties({ title: `${nm} - ${tpl.name[p.lang]}`, subject: tpl.kicker[p.lang], author: nm, creator: 'Stage Plot' })
  let n = 0
  const parts = activeParts(p)
  for (const part of parts) {
    if (part === 'intro') { await tpl.intro(doc); continue }
    if (part === 'outro') { doc.part = 'outro'; doc.sec = { title: '', num: '' }; doc.addPage('portrait'); await tpl.intro(doc); continue } // conclusão: capa sem foto, tema escuro
    n++
    doc.part = part; doc.sec = { title: titleOf(doc, part), num: pad2(n) }
    doc.addPage(part === 'stage' || part === 'light' ? 'landscape' : 'portrait') // cada seção abre página própria; o rider nunca fica na 1
    if (part === 'rider') tpl.rider(doc, riderOf(p), doc.sec.num)
    else if (part === 'stage' || part === 'light') await tpl.board(doc, part, doc.sec.num)
    else if (part === 'inputs') tpl.inputs(doc, doc.sec.num)
  }
  doc.chrome()
  doc.d.setPage(1)
  return doc
}

export async function buildPdf(p: Project, opts: PdfOptions = {}): Promise<jsPDF> {
  return (await buildDoc(p, opts)).d
}
