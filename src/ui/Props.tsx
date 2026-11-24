import { ICON_MAP, ParamDef, itemParams, Pv } from '../library/icons'
import { inputList } from '../model/derive'
import { useStore } from '../model/store'
import { NumInput } from './NumInput'
import { MusicianInput } from './MusicianInput'
import type { Item, Project } from '../model/types'

const normRot = (r: number) => ((((r + 180) % 360) + 360) % 360) - 180

function ParamField({ d, value, lang, onChange }: { d: ParamDef; value: Pv; lang: 'pt' | 'en'; onChange: (v: Pv) => void }) {
  const label = d.label[lang]
  if (d.type === 'bool') return <label className="chk par"><input type="checkbox" checked={value === true || value === 'true'} onChange={e => onChange(e.target.checked)} />{label}</label>
  if (d.type === 'sel') return <label>{label}<select value={String(value)} onChange={e => onChange(e.target.value)}>{d.opts!.map(o => <option key={o}>{o}</option>)}</select></label>
  if (d.type === 'text') return <label>{label}<input value={String(value)} onChange={e => onChange(e.target.value)} /></label>
  const n = Number(value)
  const stepper = (delta: number) => onChange(Math.min(d.max!, Math.max(d.min!, +(n + delta).toFixed(2))))
  return (
    <label>{label}
      <span className="stepper">
        <button type="button" onClick={() => stepper(-(d.step ?? 1))}>−</button>
        <NumInput min={d.min} max={d.max} step={d.step ?? 1} value={n} onChange={onChange} />
        <button type="button" onClick={() => stepper(d.step ?? 1)}>+</button>
      </span>
    </label>
  )
}

const NO_PLAYER = ['riser', 'rug', 'screen', 'backdrop', 'text', 'arrow']
const same = <T,>(xs: T[]) => xs.every(x => x === xs[0])

/** Edição em lote: campos em comum entre todos os itens selecionados. */
function MultiProps({ p, sel }: { p: Project; sel: Item[] }) {
  const { update, select } = useStore()
  const pt = p.lang === 'pt'
  const ids = sel.map(i => i.id)
  const each = (fn: (x: Item) => void, push = false) => update(pr => { for (const x of pr.items) if (ids.includes(x.id)) fn(x) }, push)
  const players = sel.filter(i => i.board === 'stage' && !NO_PLAYER.includes(i.kind))
  const lights = sel.filter(i => i.board === 'light')
  const kind = same(sel.map(i => i.kind)) ? sel[0].kind : ''
  const def = kind ? ICON_MAP[kind] : undefined
  const params = def ? def.params.map(d => ({ d, vals: sel.map(i => itemParams(i)[d.key]) })) : []
  const rots = sel.map(i => Math.round(normRot(i.rot))), scales = sel.map(i => +i.scale.toFixed(2))
  const mixed = pt ? 'Vários valores' : 'Mixed values'
  return (
    <aside className="props">
      <h4>{sel.length} {pt ? 'itens selecionados' : 'items selected'}{def ? ` · ${def.label[p.lang]}` : ''}</h4>
      <p className="muted">{pt ? 'As alterações valem para todos os itens selecionados.' : 'Changes apply to all selected items.'}</p>
      {players.length > 0 && (
        <label>{pt ? `Músico (${players.length} ${players.length > 1 ? 'itens' : 'item'})` : `Player (${players.length})`}
          <MusicianInput p={p} value={same(players.map(i => i.who)) ? players[0].who : ''} placeholder={same(players.map(i => i.who)) ? (pt ? 'Escolha ou digite' : 'Pick or type') : mixed}
            onChange={v => update(pr => { for (const x of pr.items) if (players.some(i => i.id === x.id)) x.who = v }, false)} />
        </label>)}
      {lights.length > 0 && <label>DMX<input value={same(lights.map(i => i.dmx)) ? lights[0].dmx : ''} placeholder={same(lights.map(i => i.dmx)) ? '1.001' : mixed} onChange={e => update(pr => { for (const x of pr.items) if (lights.some(i => i.id === x.id)) x.dmx = e.target.value }, false)} /></label>}
      {params.length > 0 && <div className="parbox">
        {params.map(({ d, vals }) => <ParamField key={d.key} d={d} value={vals[0]} lang={p.lang} onChange={v => each(x => { x.params = { ...x.params, [d.key]: v } })} />)}
        {params.some(x => !same(x.vals)) && <small className="muted">{pt ? 'Parâmetros com valores diferentes mostram o do primeiro item.' : 'Differing parameters show the first item’s value.'}</small>}
      </div>}
      <div className="field">{pt ? 'Rotação (°)' : 'Rotation (°)'}
        <span className="slide"><input type="range" min={-180} max={180} step={5} value={rots[0]} onChange={e => each(x => { x.rot = +e.target.value })} /><NumInput min={-360} max={360} step={5} value={rots[0]} onChange={v => each(x => { x.rot = v })} /></span></div>
      <div className="field">{pt ? 'Tamanho (×)' : 'Size (×)'}
        <span className="slide"><input type="range" min={0.4} max={3} step={0.1} value={Math.min(3, Math.max(0.4, scales[0]))} onChange={e => each(x => { x.scale = +e.target.value })} /><NumInput min={0.1} max={10} step={0.1} value={scales[0]} onChange={v => each(x => { x.scale = v })} /></span></div>
      {(!same(rots) || !same(scales)) && <small className="muted">{pt ? 'Rotação/tamanho mostram o do primeiro item; ao alterar, todos recebem o mesmo valor.' : 'Rotation/size show the first item’s value; changing sets all to it.'}</small>}
      <label className="chk"><input type="checkbox" checked={sel.every(i => !i.hidden)} onChange={e => each(x => { x.hidden = !e.target.checked }, true)} /> {pt ? 'Visível no mapa' : 'Visible on map'}</label>
      <label className="chk"><input type="checkbox" checked={sel.every(i => i.locked)} onChange={e => each(x => { x.locked = e.target.checked }, true)} /> {pt ? 'Travar posição' : 'Lock position'}</label>
      <button className="danger" onClick={() => { update(pr => { pr.items = pr.items.filter(i => !ids.includes(i.id)) }); select([]) }}>{pt ? `Remover ${sel.length} itens` : `Remove ${sel.length} items`}</button>
    </aside>
  )
}

export function Props({ p }: { p: Project }) {
  const { selected, update, select } = useStore()
  const pt = p.lang === 'pt'
  const it = p.items.find(i => i.id === selected[0])
  const def = it ? ICON_MAP[it.kind] : undefined
  const sel = p.items.filter(i => selected.includes(i.id))
  if (sel.length > 1) return <MultiProps p={p} sel={sel} />
  const set = (patch: Partial<Item>, push = false) => update(pr => { const x = pr.items.find(i => i.id === selected[0]); if (x) Object.assign(x, patch) }, push)
  const setParam = (key: string, v: Pv) => update(pr => { const x = pr.items.find(i => i.id === selected[0]); if (x) x.params = { ...x.params, [key]: v } }, false)
  const chans = it ? inputList(p).filter(r => r.itemId === it.id) : []
  const P = it ? itemParams(it) : {}
  return (
    <aside className="props">
      {!it || !def ? <p className="muted">{pt ? 'Selecione um item no mapa para editar os parâmetros do equipamento. Atalhos: Del apagar · Ctrl+D duplicar · setas mover · Ctrl+Z desfazer.' : 'Select an item to edit its parameters. Shortcuts: Del delete · Ctrl+D duplicate · arrows move · Ctrl+Z undo.'}</p> : (<>
        <h4>{def.label[p.lang]}</h4>
        <label>{pt ? 'Rótulo / nome' : 'Label / name'}<input value={it.label} onChange={e => set({ label: e.target.value })} /></label>
        {def.params.length > 0 && <div className="parbox">
          {def.params.map(d => <ParamField key={d.key} d={d} value={P[d.key]} lang={p.lang} onChange={v => setParam(d.key, v)} />)}
        </div>}
        {it.board === 'stage' && !['riser', 'rug', 'screen', 'backdrop', 'text', 'arrow'].includes(it.kind) && (
          <label>{pt ? 'Músico (aparece na input list)' : 'Player (shown in input list)'}
            <MusicianInput p={p} value={it.who} placeholder={pt ? 'Escolha ou digite' : 'Pick or type'} onChange={v => set({ who: v })} />
          </label>)}
        {it.board === 'light' && <label>DMX<input value={it.dmx} placeholder="1.001" onChange={e => set({ dmx: e.target.value })} /></label>}
        {chans.length > 0 && <div className="chhint"><b>{chans.length}</b> {pt ? (chans.length > 1 ? 'canais na input list' : 'canal na input list') : 'channel(s) in input list'}<small>{chans.map(c => c.ch).join(', ')}</small></div>}
        <div className="field">{pt ? 'Rotação (°)' : 'Rotation (°)'}
          <span className="slide"><input type="range" min={-180} max={180} step={5} value={normRot(it.rot)} onChange={e => set({ rot: +e.target.value })} /><NumInput min={-360} max={360} step={5} value={Math.round(normRot(it.rot))} onChange={v => set({ rot: v })} /></span></div>
        <div className="field">{pt ? 'Tamanho (×)' : 'Size (×)'}
          <span className="slide"><input type="range" min={0.4} max={3} step={0.1} value={Math.min(3, Math.max(0.4, it.scale))} onChange={e => set({ scale: +e.target.value })} /><NumInput min={0.1} max={10} step={0.1} value={+it.scale.toFixed(2)} onChange={v => set({ scale: v })} /></span></div>
        <label>{pt ? 'Anotação' : 'Note'}<textarea rows={2} value={it.note} onChange={e => set({ note: e.target.value })} /></label>
        <label className="chk"><input type="checkbox" checked={!it.hidden} onChange={e => set({ hidden: !e.target.checked }, true)} /> {pt ? 'Visível no mapa' : 'Visible on map'}</label>
        <label className="chk"><input type="checkbox" checked={it.locked} onChange={e => set({ locked: e.target.checked }, true)} /> {pt ? 'Travar posição' : 'Lock position'}</label>
        <button className="danger" onClick={() => { update(pr => { pr.items = pr.items.filter(i => i.id !== it.id) }); select([]) }}>{pt ? 'Remover' : 'Remove'}</button>
      </>)}
    </aside>
  )
}
