import { useMemo, useState } from 'react'
import { CAT_LABEL, defaultParams, ICONS, paint, useIconStyle } from '../library/icons'
import { newItem, useStore } from '../model/store'
import type { Board, Project } from '../model/types'

function Preview({ id }: { id: string }) {
  const style = useIconStyle(s => s.style)
  const h = useMemo(() => {
    const d = ICONS.find(i => i.id === id)!
    const b = d.build(defaultParams(d)), k = Math.max(b.w, b.h), sw = k * 0.03
    return { vb: `${-sw} ${-sw} ${b.w + sw * 2} ${b.h + sw * 2}`, sw, svg: paint(b.svg, 'currentColor', d.board === 'light' ? '#FFB020' : '#28C7C9', sw) }
  }, [id, style])
  return <svg viewBox={h.vb} fill="none" stroke="currentColor" strokeWidth={h.sw} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: h.svg }} />
}

export function Palette({ p, board }: { p: Project; board: Board }) {
  const { update, select } = useStore()
  const [q, setQ] = useState('')
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const nq = norm(q.trim())
  const list = ICONS.filter(i => i.board === board && (!nq || norm(i.label.pt + ' ' + i.label.en + ' ' + i.id).includes(nq)))
  const cats = [...new Set(list.map(i => i.cat))]
  const add = (kind: string) => {
    const n = p.items.filter(i => i.board === 'light').length
    const it = board === 'light'
      ? newItem(kind, (((n % 6) + 1) / 7) * p.stage.w, 0.8 + Math.floor(n / 6) * 0.9) // luzes entram em fileira, perto do fundo
      : newItem(kind, p.stage.w / 2 + (Math.random() - 0.5) * 2, p.stage.d / 2 + (Math.random() - 0.5) * 2)
    it.board = board; update(pr => { pr.items.push(it) }); select([it.id])
  }
  return (
    <aside className="palette">
      <div className="panel-title pal-head">{p.lang === 'pt' ? 'Biblioteca' : 'Library'}</div>
      <div className="pal-search">
        <input title={p.lang === 'pt' ? 'Filtra a biblioteca pelo nome do item' : 'Filters the library by item name'} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={p.lang === 'pt' ? 'Buscar item…' : 'Search items…'} />
      </div>
      {!list.length && <div className="pal-empty">{p.lang === 'pt' ? 'Nenhum item encontrado' : 'No items found'}</div>}
      {cats.map(c => (
        <section key={c}>
          <h4>{CAT_LABEL[c][p.lang]}</h4>
          <div className="icons">
            {list.filter(i => i.cat === c).map(i => (
              <button key={i.id} className="ico" draggable onDragStart={e => e.dataTransfer.setData('text/kind', i.id)} onClick={() => add(i.id)} title={i.label[p.lang]}>
                <Preview id={i.id} />
                <span>{i.label[p.lang]}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </aside>
  )
}
