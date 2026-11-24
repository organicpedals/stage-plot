import { inputList, outputList, powerList } from '../model/derive'
import type { Project } from '../model/types'
import type { Col, Doc } from './pdfDoc'
import { people, riderSections } from './parts'
import { boardSvg } from './boardSvg'
import { Block, fmtBlocks, fmtCell, fmtLabel } from './textFormat'

/**
 * Conteúdo do documento já preparado (formatado) para qualquer modelo desenhar. Os modelos decidem a composição;
 * aqui ficam só os dados, a omissão do que não foi informado e o ajuste de tabelas em uma página.
 */
export const f = (s?: string) => (s ?? '').trim()
export const pad2 = (n: number) => String(n).padStart(2, '0')
export const fitText = (doc: Doc, s: string, w: number, o: Parameters<Doc['tw']>[1]) => { let t = s; while (t.length > 1 && doc.tw(t, o) > w) t = t.slice(0, -1); return t.length < s.length ? t.trimEnd() + '…' : t }

export const bandName = (p: Project) => f(p.band.name) || f(p.name)

export interface Contact { title: string; name: string; tel: string; mail: string }
export interface Intro { name: string; year: string; contacts: Contact[]; hasPhoto: boolean }
export function introOf(d: Doc): Intro {
  const { p, L } = d
  const contacts = [{ title: L.tech, name: f(p.band.techName), tel: f(p.band.techPhone), mail: f(p.band.techEmail) }, { title: L.mgmt, name: f(p.band.mgmtName), tel: f(p.band.mgmtPhone), mail: f(p.band.mgmtEmail) }].filter(c => c.name || c.tel || c.mail)
  return { name: bandName(p), year: f(p.band.year), contacts, hasPhoto: !!p.press.photo
  }
}

export interface RiderSec { title: string; required: boolean; blocks: Block[] }
export const riderOf = (p: Project): RiderSec[] => riderSections(p).map(s => ({ title: fmtLabel(f(s.title), p.lang), required: !!s.required, blocks: fmtBlocks(s.body, p.lang) }))

/* ------------------------------------------------------------------ input list e saídas */

type Row = ReturnType<typeof inputList>[number]
/** Colunas da input list em 4 densidades; colunas sem nenhum valor são omitidas e células vazias ficam em branco. */
export function inputColumns(rows: Row[], L: { ch: string; name: string; src: string; mic: string; stand: string; who: string; lbl: string }, level: 1 | 2 | 3 | 4, lang: 'pt' | 'en' = 'pt'): { cols: Col[]; data: string[][] } {
  const c = (s: string) => fmtCell(s, lang)
  const mic = (r: Row) => c(f(r.mic)) + (r.phantom ? (f(r.mic) ? '  +48V' : '+48V') : '')
  const join = (a: string, b: string) => (b ? (a ? `${a} (${b})` : b) : a)
  type Def = { h: string; w: number; get: (r: Row) => string; bold?: boolean }
  const defs: Def[] = level === 1
    ? [{ h: L.name, w: 24, bold: true, get: r => c(f(r.name)) }, { h: L.src, w: 22, get: r => c(f(r.source)) }, { h: L.mic, w: 30, get: mic }, { h: L.stand, w: 21, get: r => c(f(r.stand)) }, { h: L.who, w: 21, get: r => c(f(r.who)) }, { h: L.lbl, w: 20, get: r => c(f(r.note)) }]
    : level === 2
      ? [{ h: L.name, w: 34, bold: true, get: r => join(c(f(r.name)), c(f(r.note))) }, { h: L.mic, w: 38, get: mic }, { h: L.stand, w: 26, get: r => c(f(r.stand)) }, { h: L.who, w: 25, get: r => c(f(r.who)) }]
      : level === 3
        ? [{ h: L.name, w: 44, bold: true, get: r => join(c(f(r.name)), c(f(r.who))) }, { h: L.mic, w: 48, get: mic }, { h: L.stand, w: 30, get: r => c(f(r.stand)) }]
        : [{ h: L.name, w: 40, bold: true, get: r => c(f(r.name)) }, { h: L.mic, w: 46, get: mic }, { h: L.stand, w: 30, get: r => c(f(r.stand)) }]
  const used = defs.filter(d => rows.some(r => d.get(r)))
  const cols: Col[] = [{ h: L.ch, w: rows.length > 9 ? 13 : 8, mono: true, bold: true }, ...used.map(d => ({ h: d.h, w: d.w, bold: d.bold }))]
  return { cols, data: rows.map(r => [String(r.ch), ...used.map(d => d.get(r))]) }
}

/** Saídas (monitores/mixes): colunas sem valor são omitidas. */
export function outputColumns(p: Project, L: { mix: string; outputs: string; type: string; lbl: string; who: string }): { cols: Col[]; data: string[][] } {
  const note = new Map(p.items.map(i => [i.id, f(i.note)]))
  const rows = outputList(p).map(r => ({ mix: r.mix ? String(r.mix) : '', name: fmtCell(f(r.name), p.lang), type: f(r.type) === f(r.name) ? '' : fmtCell(f(r.type), p.lang), who: fmtCell(f(r.who), p.lang), note: fmtCell(note.get(r.itemId) ?? '', p.lang) }))
  const defs = [{ h: L.mix, w: 8, k: 'mix' as const, mono: true }, { h: L.outputs, w: 30, k: 'name' as const, bold: true }, { h: L.type, w: 22, k: 'type' as const }, { h: L.who, w: 24, k: 'who' as const }, { h: L.lbl, w: 30, k: 'note' as const }]
  const used = defs.filter(d => rows.some(r => r[d.k]))
  return { cols: used.map(d => ({ h: d.h, w: d.w, mono: d.mono, bold: d.bold })), data: rows.map(r => used.map(d => r[d.k])) }
}

/** Pontos de energia do mapa: ponto, músico, quantidade de tomadas e tensão (colunas sem valor são omitidas). */
export function powerColumns(p: Project, L: { point: string; who: string; qty: string; volt: string }): { cols: Col[]; data: string[][] } {
  const rows = powerList(p).map(r => ({ name: fmtCell(f(r.name), p.lang), who: fmtCell(f(r.who), p.lang), qty: String(r.outlets), volt: fmtCell(f(r.volt) + (f(r.circuit) ? ` · ${f(r.circuit)}` : ''), p.lang) }))
  const defs = [{ h: L.who, w: 30, k: 'who' as const, bold: true }, { h: L.point, w: 30, k: 'name' as const }, { h: L.qty, w: 12, k: 'qty' as const, mono: true }, { h: L.volt, w: 26, k: 'volt' as const }]
  const used = defs.filter(d => rows.some(r => r[d.k]))
  return { cols: used.map(d => ({ h: d.h, w: d.w, mono: d.mono, bold: d.bold })), data: rows.map(r => used.map(d => r[d.k])) }
}

/** Input list + saídas na MESMA página: reduz corpo e colunas antes de recorrer a duas colunas; nunca passa de uma página. */
export function fitInputs(doc: Doc) {
  const rows = inputList(doc.p), out = outputColumns(doc.p, doc.L), pw = powerColumns(doc.p, doc.L)
  const extras = [{ title: doc.L.outputs, ...out }, { title: doc.L.power, ...pw }].filter(e => e.data.length > 0), hasOut = extras.length > 0
  if (!rows.length && !hasOut) return
  const headH = 11 // subtítulo + respiro
  const outSize = (s: number) => Math.min(s, 8.6)
  const outH = (s: number) => extras.reduce((a, e) => a + headH + 5 + doc.tableH(e.cols, e.data, { size: outSize(s), pad: Math.min(1.2, s * 0.14) }), 0)
  const drawOut = (s: number) => {
    for (const e of extras) { doc.y += 3; doc.tpl.subhead(doc, e.title); doc.table(e.cols, e.data, { size: outSize(s), pad: Math.min(1.2, s * 0.14) }) }
  }
  if (!rows.length) { drawOut(10); return }
  const avail = doc.bottom - doc.y - 1, lang = doc.p.lang
  const steps: [number, number, 1 | 2 | 3 | 4][] = [
    [12.5, 4.2, 1], [11.5, 3.4, 1], [10.5, 2.6, 1], [9.5, 2, 1], [8.6, 1.6, 1], [8, 1.3, 1], [7.4, 1, 1], [7, 0.8, 1],
    [8, 1.3, 2], [7.4, 1, 2], [7, 0.8, 2], [6.6, 0.65, 2], [6.2, 0.5, 2],
    [6.4, 0.55, 3], [6, 0.45, 3],
  ]
  for (const [s, pd, lv] of steps) {
    const { cols, data } = inputColumns(rows, doc.L, lv, lang)
    if (doc.tableH(cols, data, { size: s, pad: pd }) + outH(s) <= avail) { doc.table(cols, data, { size: s, pad: pd }); drawOut(s); return }
  }
  // último recurso: entradas em duas colunas lado a lado; saídas embaixo
  const { cols, data } = inputColumns(rows, doc.L, 4, lang)
  const half = Math.ceil(data.length / 2), gap = 6, w = (doc.cw - gap) / 2, y0 = doc.y
  const a = data.slice(0, half), b = data.slice(half)
  const reserve = outH(5.6)
  const room = doc.bottom - y0 - reserve - 5
  const padOf = (z: number) => (z > 6.4 ? 0.35 + (z - 6.4) * 0.22 : 0.35)
  const fs = [9.5, 9, 8.4, 7.8, 7.2, 6.8, 6.4, 6, 5.6, 5.2, 4.8, 4.4].find(z => Math.max(doc.tableH(cols, a, { size: z, pad: padOf(z), width: w, maxLines: 2 }), doc.tableH(cols, b, { size: z, pad: padOf(z), width: w, maxLines: 2 })) <= room) ?? 4.4
  doc.table(cols, a, { size: fs, pad: padOf(fs), width: w, bottom: doc.bottom - reserve + 1, maxLines: 2 }); const ya = doc.y
  doc.y = y0; doc.table(cols, b, { size: fs, pad: padOf(fs), width: w, x: doc.M + w + gap, bottom: doc.bottom - reserve + 1, maxLines: 2 }); doc.y = Math.max(ya, doc.y)
  drawOut(5.6)
}

/** Mapa (palco ou luz) encaixado na caixa dada, sem legenda nem escala: só o desenho. */
export async function drawBoard(doc: Doc, part: 'stage' | 'light', x: number, y: number, w: number, h: number, theme = doc.th) {
  const r = boardSvg(doc.p, part, { theme, showLegend: false, showScale: false, margin: 0.3 })
  return doc.svgFit(r.svg, r.w / r.h, x, y, w, h)
}
