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

export function Props({ p }: { p: Project }) {
  const { selected, update, select } = useStore()
  const pt = p.lang === 'pt'
  const it = p.items.find(i => i.id === selected[0])
  const def = it ? ICON_MAP[it.kind] : undefined
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
