import { ICON_MAP, itemParams } from '../library/icons'
import type { ChFields, Item, Lang, Project } from './types'

export interface ChannelRow extends ChFields { key: string; ch: number; itemId?: string; manual: boolean; edited: boolean }
export interface OutRow { n: number; mix: number; name: string; type: string; who: string; itemId: string }
export interface PowerRow { n: number; name: string; who: string; outlets: number; volt: string; circuit: string; itemId: string }
/** Itens do mapa de palco que são pontos de energia. */
export const POWER_KINDS = ['ac', 'strip', 'power']
export interface PatchRow { n: number; kind: string; label: string; dmx: string; gel: string; mount: string; watt: number; note: string; itemId: string }

export const itemName = (it: Item, lang: Lang) => it.label || ICON_MAP[it.kind]?.label[lang] || it.kind
const trFor = (lang: Lang) => (pt: string, en: string) => (lang === 'pt' ? pt : en)

/** Canais gerados pelos equipamentos (antes das edições do usuário). */
function generated(p: Project): ChannelRow[] {
  const t = trFor(p.lang), out: ChannelRow[] = []
  const items = p.items.filter(i => i.board === 'stage').sort((a, b) => a.y - b.y || a.x - b.x)
  for (const it of items) {
    const def = ICON_MAP[it.kind]
    if (!def?.channels) continue
    const chans = def.channels(itemParams(it), it.label, t), lbl = it.label.trim()
    chans.forEach((c0, idx) => {
      // nome dado ao item no mapa aparece na input list; em itens de vários canais (ex.: bateria) vira prefixo
      const c = lbl && chans.length > 1 && !c0.name.toLowerCase().includes(lbl.toLowerCase()) ? { ...c0, name: `${lbl} · ${c0.name}` } : c0
      const key = `${it.id}:${idx}`
      const ov = p.chan.ov[key]
      out.push({
        key, ch: 0, itemId: it.id, manual: false, edited: !!ov && Object.keys(ov).length > 0,
        name: c.name, source: itemName(it, p.lang), mic: c.mic, stand: c.stand, who: it.who, phantom: !!c.phantom, note: '', ...ov,
      })
    })
  }
  return out.filter(r => !p.chan.hidden.includes(r.key))
}

/** Input list final: gerada + edições + canais manuais, na ordem do usuário. */
export function inputList(p: Project): ChannelRow[] {
  const manual: ChannelRow[] = p.chan.manual.map(m => ({ ...m, key: m.id, ch: 0, manual: true, edited: false }))
  const all = [...generated(p), ...manual]
  if (p.chan.order.length) {
    const idx = new Map(p.chan.order.map((k, i) => [k, i]))
    all.sort((a, b) => (idx.get(a.key) ?? 9999) - (idx.get(b.key) ?? 9999))
  }
  return all.map((r, i) => ({ ...r, ch: i + 1 }))
}

/** Saídas de monitor (mix) a partir de wedges, side fills e IEMs. */
export function outputList(p: Project): OutRow[] {
  const rows = p.items.filter(i => i.board === 'stage' && ['wedge', 'sidefill', 'iem'].includes(i.kind))
    .map(it => ({ it, mix: Number(itemParams(it).mix) || 0 }))
    .sort((a, b) => (a.mix || 99) - (b.mix || 99))
  return rows.map(({ it, mix }, i) => ({ n: i + 1, mix, name: itemName(it, p.lang), type: ICON_MAP[it.kind].label[p.lang], who: it.who, itemId: it.id }))
}

/** Pontos de energia do mapa: quantidade de tomadas e quem usa (músico). */
export function powerList(p: Project): PowerRow[] {
  return p.items.filter(i => i.board === 'stage' && POWER_KINDS.includes(i.kind)).sort((a, b) => a.y - b.y || a.x - b.x)
    .map((it, i) => { const P = itemParams(it); return { n: i + 1, name: itemName(it, p.lang), who: it.who, outlets: Number(P.outlets) || 1, volt: String(P.v ?? ''), circuit: String(P.circuit ?? ''), itemId: it.id } })
}

export function patchList(p: Project): PatchRow[] {
  return p.items.filter(i => i.board === 'light' && !['truss', 'lpower', 'lxdesk', 'dimmer'].includes(i.kind))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((it, i) => {
      const P = itemParams(it)
      return { n: i + 1, kind: ICON_MAP[it.kind]?.label[p.lang] ?? it.kind, label: it.label, dmx: it.dmx, gel: String(P.gel ?? ''), mount: String(P.mount ?? ''), watt: Number(P.watt) || 0, note: it.note, itemId: it.id }
    })
}

export function legend(p: Project, board: 'stage' | 'light') {
  const seen = new Map<string, number>()
  for (const it of p.items.filter(i => i.board === board)) seen.set(it.kind, (seen.get(it.kind) ?? 0) + 1)
  return [...seen].map(([k, n]) => ({ kind: k, n, name: ICON_MAP[k]?.label[p.lang] ?? k }))
}

/** Faixa de canais por item, ex.: "1-8". */
export function channelRanges(p: Project): Map<string, string> {
  const m = new Map<string, number[]>()
  for (const r of inputList(p)) if (r.itemId) m.set(r.itemId, [...(m.get(r.itemId) ?? []), r.ch])
  return new Map([...m].map(([id, chs]) => [id, chs.length === 1 ? `${chs[0]}` : `${chs[0]}-${chs[chs.length - 1]}`]))
}
