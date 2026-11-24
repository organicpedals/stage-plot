import { useState } from 'react'
import { MusicianInput } from './MusicianInput'
import { ChannelRow, inputList, outputList, patchList, powerList } from '../model/derive'
import { useStore } from '../model/store'
import { ChFields, Item, Project, uid } from '../model/types'

const pick = (setter: (dataUrl: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
  const f = e.target.files?.[0]; if (!f) return
  const img = new Image(); const url = URL.createObjectURL(f)
  img.onload = () => { // reduz para ~1600px, JPEG, para caber no armazenamento local
    const k = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement('canvas')
    c.width = img.width * k; c.height = img.height * k; c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    setter(c.toDataURL('image/jpeg', 0.85)); URL.revokeObjectURL(url)
  }
  img.src = url
}

/** Tab numa célula de texto desce para a mesma coluna da linha de baixo (Shift+Tab sobe), em vez de ir para a próxima categoria. */
function tabDown(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return
  const t = e.target as HTMLElement, td = t.closest('td'), tr = td?.parentElement as HTMLTableRowElement | null
  if (!td || !tr || !(t instanceof HTMLInputElement) || !t.classList.contains('cell') || t.classList.contains('chnum')) return
  const col = [...tr.children].indexOf(td), next = (e.shiftKey ? tr.previousElementSibling : tr.nextElementSibling) as HTMLTableRowElement | null
  const target = next?.children[col]?.querySelector<HTMLInputElement>('input.cell:not(.chnum), select.cell')
  if (!target) return // última/primeira linha: comportamento normal do Tab
  e.preventDefault(); target.focus(); if (target instanceof HTMLInputElement && target.type !== 'number') target.select()
}

function ChNum({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [d, setD] = useState<string | null>(null)
  const done = () => { if (d !== null) { const n = parseInt(d, 10); if (Number.isFinite(n) && n !== value) onCommit(n) } setD(null) }
  return <input className="cell num chnum" inputMode="numeric" value={d ?? String(value)} title={'Digite o nº para mover o canal'}
    onFocus={e => e.target.select()} onChange={e => /^\d*$/.test(e.target.value) && setD(e.target.value)} onBlur={done}
    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setD(null); (e.target as HTMLInputElement).blur() } }} />
}

export function InputsTab({ p }: { p: Project }) {
  const { update } = useStore()
  const pt = p.lang === 'pt'
  const rows = inputList(p), patch = patchList(p), outs = outputList(p), power = powerList(p)
  const totalW = patch.reduce((a, r) => a + r.watt, 0)

  const edit = (r: ChannelRow, patchF: Partial<ChFields>) => update(pr => {
    if (r.manual) { const m = pr.chan.manual.find(x => x.id === r.key); if (m) Object.assign(m, patchF) }
    else pr.chan.ov[r.key] = { ...pr.chan.ov[r.key], ...patchF }
  }, false)
  const move = (i: number, d: number) => update(pr => {
    const keys = rows.map(r => r.key), j = i + d
    if (j < 0 || j >= keys.length) return
    ;[keys[i], keys[j]] = [keys[j], keys[i]]; pr.chan.order = keys
  })
  // número do canal editável: leva a linha para a nova posição; os demais renumeram sozinhos
  const moveTo = (i: number, n: number) => update(pr => {
    const keys = rows.map(r => r.key), j = Math.min(keys.length, Math.max(1, Math.round(n))) - 1
    if (j === i) return
    const [k] = keys.splice(i, 1); keys.splice(j, 0, k); pr.chan.order = keys
  })
  const remove = (r: ChannelRow) => update(pr => {
    if (r.manual) pr.chan.manual = pr.chan.manual.filter(x => x.id !== r.key); else pr.chan.hidden.push(r.key)
  })
  const addManual = () => update(pr => { pr.chan.manual.push({ id: uid(), name: '', source: '', mic: '', stand: '', who: '', phantom: false, note: '' }) })
  const item = (id: string, fn: (it: Item) => void) => update(pr => { const x = pr.items.find(i => i.id === id); if (x) fn(x) }, false)

  const cell = (r: ChannelRow, k: 'name' | 'source' | 'mic' | 'stand' | 'who' | 'note') => (
    <input className="cell" value={r[k]} onChange={e => edit(r, { [k]: e.target.value })} />
  )
  return (
    <div className="doc wide">
      <h2>Input list</h2>
      <p className="muted">{pt ? 'Gerada a partir dos equipamentos do palco (mude os parâmetros do equipamento e os canais se ajustam). Todas as células são editáveis.' : 'Generated from the stage equipment (change item parameters and channels follow). Every cell is editable.'}</p>
      <div className="scroll-x"><table className="edit"><thead><tr>
        <th>CH</th><th>{pt ? 'Canal' : 'Channel'}</th><th>{pt ? 'Fonte' : 'Source'}</th><th>Mic / DI</th><th>{pt ? 'Suporte' : 'Stand'}</th><th>{pt ? 'Músico' : 'Player'}</th><th>{pt ? 'Obs.' : 'Notes'}</th><th></th>
      </tr></thead>
        <tbody onKeyDown={tabDown}>{rows.map((r, i) => (
          <tr key={r.key} className={r.manual ? 'manual' : ''}>
            <td className="mono"><ChNum value={r.ch} onCommit={n => moveTo(i, n)} /></td>
            <td>{cell(r, 'name')}</td><td>{cell(r, 'source')}</td><td>{cell(r, 'mic')}</td><td>{cell(r, 'stand')}</td>
            <td><MusicianInput p={p} className="cell" value={r.who} onChange={v => edit(r, { who: v })} /></td><td>{cell(r, 'note')}</td>
            <td className="rowtools">
              <button className="ghost" disabled={i === 0} onClick={() => move(i, -1)} title={pt ? 'Subir' : 'Up'}>↑</button>
              <button className="ghost" disabled={i === rows.length - 1} onClick={() => move(i, 1)} title={pt ? 'Descer' : 'Down'}>↓</button>
              <button className="ghost" onClick={() => remove(r)} title={pt ? 'Remover' : 'Remove'}>✕</button>
            </td>
          </tr>))}
        </tbody></table></div>
      {!rows.length && <p className="muted">{pt ? 'Nenhum canal ainda. Adicione instrumentos ao mapa de palco ou crie um canal manual.' : 'No channels yet.'}</p>}
      <div className="actions">
        <button onClick={addManual}>+ {pt ? 'Canal manual' : 'Manual channel'}</button>
        {p.chan.hidden.length > 0 && <button className="ghost" onClick={() => update(pr => { pr.chan.hidden = [] })}>{pt ? `Restaurar ${p.chan.hidden.length} removido(s)` : `Restore ${p.chan.hidden.length} removed`}</button>}
        {Object.keys(p.chan.ov).length > 0 && <button className="ghost" onClick={() => update(pr => { pr.chan.ov = {} })}>{pt ? 'Descartar todas as edições' : 'Discard all edits'}</button>}
      </div>

      <h2>{pt ? 'Saídas de monitor' : 'Monitor outputs'}</h2>
      <table className="edit"><thead><tr><th>#</th><th>Mix</th><th>{pt ? 'Equipamento' : 'Equipment'}</th><th>{pt ? 'Tipo' : 'Type'}</th><th>{pt ? 'Músico' : 'Player'}</th></tr></thead>
        <tbody onKeyDown={tabDown}>{outs.map(o => <tr key={o.itemId}><td className="mono">{o.n}</td>
          <td><input className="cell num" type="number" min={0} max={16} value={o.mix} onChange={e => item(o.itemId, it => { it.params = { ...it.params, mix: +e.target.value } })} /></td>
          <td><input className="cell" value={p.items.find(i => i.id === o.itemId)?.label ?? ''} placeholder={o.name} onChange={e => item(o.itemId, it => { it.label = e.target.value })} /></td><td>{o.type}</td>
          <td><MusicianInput p={p} className="cell" value={o.who} onChange={v => item(o.itemId, it => { it.who = v })} /></td></tr>)}</tbody></table>
      {!outs.length && <p className="muted">{pt ? 'Adicione retornos, side fills ou IEMs ao mapa.' : 'Add wedges, side fills or IEMs to the plot.'}</p>}

      <h2>{pt ? 'Pontos de energia' : 'Power points'}</h2>
      <p className="muted">{pt ? 'Vêm do mapa de palco (Ponto AC, régua, ponto de energia): quantidade de tomadas e músico.' : 'Taken from the stage plot (AC outlet, power strip, power drop): outlet count and player.'}</p>
      <table className="edit"><thead><tr><th>#</th><th>{pt ? 'Ponto' : 'Point'}</th><th>{pt ? 'Músico' : 'Player'}</th><th>{pt ? 'Tomadas' : 'Outlets'}</th><th>{pt ? 'Tensão' : 'Voltage'}</th></tr></thead>
        <tbody onKeyDown={tabDown}>{power.map(r => <tr key={r.itemId}><td className="mono">{r.n}</td>
          <td><input className="cell" value={p.items.find(i => i.id === r.itemId)?.label ?? ''} placeholder={r.name} onChange={e => item(r.itemId, it => { it.label = e.target.value })} /></td>
          <td><MusicianInput p={p} className="cell" value={r.who} onChange={v => item(r.itemId, it => { it.who = v })} /></td>
          <td><input className="cell num" type="number" min={1} max={24} value={r.outlets} onChange={e => item(r.itemId, it => { it.params = { ...it.params, outlets: Math.max(1, +e.target.value || 1) } })} /></td>
          <td className="mono">{r.volt}</td></tr>)}</tbody></table>
      {power.length > 0 ? <p className="muted">{pt ? 'Total de tomadas' : 'Total outlets'}: <b className="mono">{power.reduce((a, r) => a + r.outlets, 0)}</b></p> : <p className="muted">{pt ? 'Adicione pontos AC ou réguas de energia ao mapa de palco.' : 'Add AC outlets or power strips to the stage plot.'}</p>}

      <h2>{pt ? 'Fixtures e patch DMX' : 'Fixtures & DMX patch'}</h2>
      <div className="scroll-x"><table className="edit"><thead><tr><th>#</th><th>Fixture</th><th>{pt ? 'Rótulo' : 'Label'}</th><th>{pt ? 'Posição' : 'Mount'}</th><th>{pt ? 'Gelatina' : 'Gel'}</th><th>W</th><th>DMX</th><th>{pt ? 'Obs.' : 'Notes'}</th></tr></thead>
        <tbody onKeyDown={tabDown}>{patch.map(r => <tr key={r.itemId}><td className="mono">{r.n}</td><td>{r.kind}</td>
          <td><input className="cell" value={r.label} onChange={e => item(r.itemId, it => { it.label = e.target.value })} /></td>
          <td><select className="cell" value={r.mount} onChange={e => item(r.itemId, it => { it.params = { ...it.params, mount: e.target.value } })}><option>Aéreo</option><option>Chão</option></select></td>
          <td><input className="cell" value={r.gel} onChange={e => item(r.itemId, it => { it.params = { ...it.params, gel: e.target.value } })} /></td>
          <td><input className="cell num" type="number" value={r.watt} onChange={e => item(r.itemId, it => { it.params = { ...it.params, watt: +e.target.value } })} /></td>
          <td><input className="cell" value={r.dmx} placeholder="1.001" onChange={e => item(r.itemId, it => { it.dmx = e.target.value })} /></td>
          <td><input className="cell" value={r.note} onChange={e => item(r.itemId, it => { it.note = e.target.value })} /></td></tr>)}</tbody></table></div>
      {patch.length > 0 && <p className="muted">{pt ? 'Carga total estimada' : 'Estimated total load'}: <b className="mono">{(totalW / 1000).toFixed(2)} kW</b></p>}
    </div>
  )
}

export function RiderTab({ p }: { p: Project }) {
  const { update } = useStore()
  const pt = p.lang === 'pt'
  return (
    <div className="doc">
      <h2>{pt ? 'Rider técnico' : 'Technical rider'}</h2>
      <p className="muted">{pt ? 'Seções de texto que entram no PDF.' : 'Text sections included in the PDF.'}</p>
      {p.sections.map((s, i) => (
        <div key={s.id} className="sec">
          <div className="sec-head">
            <input className="sec-title" value={s.title} onChange={e => update(pr => { pr.sections[i].title = e.target.value }, false)} />
            <label className="chk"><input type="checkbox" checked={s.enabled} onChange={e => update(pr => { pr.sections[i].enabled = e.target.checked })} />{pt ? 'Incluir' : 'Include'}</label>
            <button className="ghost" disabled={i === 0} onClick={() => update(pr => { const [x] = pr.sections.splice(i, 1); pr.sections.splice(i - 1, 0, x) })}>↑</button>
            <button className="ghost" onClick={() => update(pr => { pr.sections.splice(i, 1) })}>✕</button>
          </div>
          <textarea rows={4} value={s.body} onChange={e => update(pr => { pr.sections[i].body = e.target.value }, false)} />
        </div>
      ))}
      <button onClick={() => update(pr => { pr.sections.push({ id: uid(), title: pt ? 'Nova seção' : 'New section', body: '', required: false, enabled: true }) })}>+ {pt ? 'Seção' : 'Section'}</button>
    </div>
  )
}

export function InfoTab({ p }: { p: Project }) {
  const { update } = useStore()
  const pt = p.lang === 'pt'
  const f = (k: 'name' | 'techName' | 'techPhone' | 'techEmail' | 'mgmtName' | 'mgmtPhone' | 'mgmtEmail', label: string, type = 'text') => (
    <label>{label}<input type={type} value={p.band[k]} onChange={e => update(pr => { pr.band[k] = e.target.value; if (k === 'name') pr.name = e.target.value }, false)} /></label>
  )
  return (
    <div className="doc">
      <h2>{pt ? 'Informações' : 'Info'}</h2>
      <p className="muted">{pt ? 'Aparecem só na capa do PDF: foto, rider técnico, nome da banda, ano de vigência e os dois contatos.' : 'Shown only on the PDF cover: photo, technical rider, band name, valid-for year and the two contacts.'}</p>
      <h3>{pt ? 'Banda' : 'Band'}</h3>
      <div className="form2">
        {f('name', pt ? 'Nome da banda' : 'Band name')}
        <label>{pt ? 'Ano de vigência do rider' : 'Rider valid for year'}<input inputMode="numeric" maxLength={4} placeholder={String(new Date().getFullYear())} value={p.band.year} onChange={e => update(pr => { pr.band.year = e.target.value.replace(/\D/g, '').slice(0, 4) }, false)} /></label>
      </div>
      <h3>{pt ? 'Cor de destaque dos PDFs' : 'PDF accent color'}</h3>
      <div className="accent-row">
        <input type="color" aria-label={pt ? 'Cor de destaque' : 'Accent color'} value={/^#[0-9a-f]{6}$/i.test(p.pdfAccent ?? '') ? p.pdfAccent! : '#6F6620'} onChange={e => update(pr => { pr.pdfAccent = e.target.value.toUpperCase() }, false)} />
        {['#6F6620', '#C2410C', '#B91C1C', '#0F766E', '#1D4ED8', '#7E22CE', '#BE185D'].map(c => <button key={c} type="button" className="swatch" title={c} style={{ background: c, outline: (p.pdfAccent ?? '').toUpperCase() === c ? '2px solid var(--fg)' : 'none' }} onClick={() => update(pr => { pr.pdfAccent = c })} />)}
        {p.pdfAccent && <button className="ghost" onClick={() => update(pr => { delete pr.pdfAccent })}>{pt ? 'Padrão do modelo' : 'Model default'}</button>}
      </div>
      <p className="muted">{pt ? 'Usada em números, títulos, réguas e contatos. O app ajusta o tom para manter a leitura sobre fundo claro e escuro.' : 'Used for numbers, headings, rules and contacts. The tone is adjusted to stay readable on light and dark backgrounds.'}</p>
      <h3>{pt ? 'Foto da capa' : 'Cover photo'}</h3>
      <div className="photo">
        {p.press.photo ? <img src={p.press.photo} alt="" /> : <div className="ph">{pt ? 'Foto da capa' : 'Cover photo'}</div>}
        <div>
          <label className="btn">{p.press.photo ? (pt ? 'Trocar foto' : 'Change photo') : (pt ? 'Escolher foto' : 'Choose photo')}<input type="file" accept="image/*" hidden onChange={pick(d => update(pr => { pr.press.photo = d }))} /></label>
          {p.press.photo && <button className="ghost" onClick={() => update(pr => { pr.press.photo = '' })}>{pt ? 'Remover' : 'Remove'}</button>}
          <p className="muted">{pt ? 'Foto vertical ou quadrada de boa resolução: ocupa a capa inteira.' : 'A high-resolution portrait or square photo: it fills the whole cover.'}</p>
        </div>
      </div>
      <h3>{pt ? 'Coordenador técnico' : 'Technical coordinator'}</h3>
      <div className="form2">{f('techName', pt ? 'Nome' : 'Name')}{f('techPhone', pt ? 'Telefone' : 'Phone', 'tel')}{f('techEmail', 'E-mail', 'email')}</div>
      <h3>{pt ? 'Produtor' : 'Producer'}</h3>
      <div className="form2">{f('mgmtName', pt ? 'Nome' : 'Name')}{f('mgmtPhone', pt ? 'Telefone' : 'Phone', 'tel')}{f('mgmtEmail', 'E-mail', 'email')}</div>
      <h3>{pt ? 'Integrantes' : 'Members'}</h3>
      <p className="muted">{pt ? 'Alimentam o campo Músico da input list.' : 'They feed the Player field of the input list.'}</p>
      {p.members.map((m, i) => (
        <div key={m.id} className="row2">
          <input placeholder={pt ? 'Nome' : 'Name'} value={m.name} onChange={e => update(pr => { const old = pr.members[i].name, nv = e.target.value; pr.members[i].name = nv; if (old) for (const it of pr.items) if (it.who === old) it.who = nv }, false)} />
          <input placeholder={pt ? 'Função' : 'Role'} value={m.role} onChange={e => update(pr => { pr.members[i].role = e.target.value }, false)} />
          <button className="ghost" onClick={() => update(pr => { pr.members.splice(i, 1) })}>✕</button>
        </div>
      ))}
      <button onClick={() => update(pr => { pr.members.push({ id: uid(), name: '', role: '' }) })}>+ {pt ? 'Integrante' : 'Member'}</button>
    </div>
  )
}
