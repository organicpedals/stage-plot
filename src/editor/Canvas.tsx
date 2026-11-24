import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { autoK, itemLabel, itemShape, itemSize, mountMarks, MOUNT, THEMES } from '../export/boardSvg'
import { ICON_MAP } from '../library/icons'
import { itemName } from '../model/derive'
import { cloneItem, newItem, useStore } from '../model/store'
import type { Board, Project } from '../model/types'

// passo do encaixe: proporcional ao palco (mesmo passo visual em qualquer tamanho)
const SNAP = 0.1
const snap = (v: number, on: boolean, step = SNAP) => (on ? Math.round(v / step) * step : v)
const MIN_Z = 12, MAX_Z = 480 // px por metro

interface View { tx: number; ty: number; z: number }
const isTyping = (t: EventTarget | null) => { const n = (t as HTMLElement | null)?.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT' }

export function Canvas({ p, board }: { p: Project; board: Board }) {
  const { update, selected, select, checkpoint } = useStore()
  const [snapOn, setSnapOn] = useState(true)
  const [showHidden, setShowHidden] = useState(true)
  const [visOpen, setVisOpen] = useState(false)
  const [view, setView] = useState<View>({ tx: 0, ty: 0, z: 80 })
  const [space, setSpace] = useState(false)
  const [panning, setPanning] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; mx: number; my: number; starts: { id: string; x: number; y: number }[]; moved: boolean } | null>(null)
  const marq = useRef<{ x0: number; y0: number; add: boolean; base: string[] } | null>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const fitted = useRef(false)
  const theme = THEMES.dark
  const pt = p.lang === 'pt'

  const size = () => { const r = wrap.current!.getBoundingClientRect(); return { w: r.width, h: r.height } }
  const fit = useCallback((pr = p): boolean => {
    if (!wrap.current) return false
    const { w, h } = size(); if (w < 50 || h < 50) return false
    const mw = pr.stage.w + 3, mh = pr.stage.d + 3
    const z = Math.max(MIN_Z, Math.min(MAX_Z, Math.min(w / mw, h / mh)))
    setView({ z, tx: (w - pr.stage.w * z) / 2, ty: (h - pr.stage.d * z) / 2 })
    return true
  }, [p])

  useLayoutEffect(() => { if (!fitted.current && fit()) fitted.current = true })
  useEffect(() => {
    const ro = new ResizeObserver(() => { if (!fitted.current && fit()) fitted.current = true })
    if (wrap.current) ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [fit])

  const zoomAt = (cx: number, cy: number, factor: number) => setView(v => {
    const z = Math.max(MIN_Z, Math.min(MAX_Z, v.z * factor)), k = z / v.z
    return { z, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k }
  })
  const zoomBy = (f: number) => { const { w, h } = size(); zoomAt(w / 2, h / 2, f) }
  const zoomTo = (z: number) => { const { w, h } = size(); setView(v => { const k = z / v.z; return { z, tx: w / 2 - (w / 2 - v.tx) * k, ty: h / 2 - (h / 2 - v.ty) * k } }) }

  // atalhos de navegação: espaço (mão), Ctrl+0 ajustar, Ctrl+1 100%, Ctrl +/- zoom
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      if (e.code === 'Space') { e.preventDefault(); (document.activeElement as HTMLElement | null)?.blur?.(); setSpace(true); return }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); select(p.items.filter(i => i.board === board).map(i => i.id)); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); fit() }
      if ((e.ctrlKey || e.metaKey) && e.key === '1') { e.preventDefault(); zoomTo(100) }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomBy(1.25) }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoomBy(0.8) }
    }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpace(false) }
    const blur = () => setSpace(false)
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  })

  // roda: pan (trackpad); Ctrl/⌘/Alt + roda ou pinça: zoom no cursor
  useEffect(() => {
    const el = wrap.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey || e.altKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0025))
      else setView(v => ({ ...v, tx: v.tx - (e.shiftKey ? e.deltaY : e.deltaX), ty: v.ty - (e.shiftKey ? 0 : e.deltaY) }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const toM = (e: { clientX: number; clientY: number }) => {
    const r = wrap.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left - view.tx) / view.z, y: (e.clientY - r.top - view.ty) / view.z }
  }

  // praticáveis ficam no fundo para não bloquear a seleção dos itens sobre eles
  const gsnap = (v: number) => snap(v, snapOn, SNAP * autoK(p.stage))
  const all = p.items.filter(i => i.board === board).sort((a, b) => Number(b.kind === 'riser') - Number(a.kind === 'riser'))
  const items = all.filter(i => !i.hidden || showHidden)
  const stageRef = board === 'light' ? p.items.filter(i => i.board === 'stage' && !i.hidden && !['text', 'arrow'].includes(i.kind)) : []
  const setVis = (ids: string[], hidden: boolean) => update(pr => { for (const i of pr.items) if (ids.includes(i.id)) i.hidden = hidden || undefined })

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const kind = e.dataTransfer.getData('text/kind'); if (!kind) return
    const { x, y } = toM(e)
    const it = newItem(kind, gsnap(x), gsnap(y)); it.board = ICON_MAP[kind].board === 'light' ? 'light' : board
    update(pr => { pr.items.push(it) }); select([it.id])
  }

  // captura: espaço/botão do meio = mão (pan), antes de qualquer item
  const onDownCapture = (e: React.PointerEvent) => {
    if (space || e.button === 1) {
      e.preventDefault(); e.stopPropagation()
      pan.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }; setPanning(true)
      wrap.current!.setPointerCapture(e.pointerId)
    }
  }
  const onItemDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    const it = p.items.find(i => i.id === id)!
    let sel = selected
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Shift/Ctrl: alterna o item na seleção (sem arrastar)
      select(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]); return
    }
    if (!selected.includes(id)) { sel = [id]; select(sel) }
    let ids = sel
    if (e.altKey) {
      // Alt + arrastar: duplica a seleção e arrasta as cópias
      const cl = p.items.filter(i => sel.includes(i.id)).map(i => cloneItem(i))
      update(pr => { pr.items.push(...cl) })
      ids = cl.map(c => c.id); select(ids)
    } else if (it.locked) return
    const src = e.altKey ? [...p.items.filter(i => sel.includes(i.id))] : p.items.filter(i => ids.includes(i.id) && !i.locked)
    const m = toM(e)
    drag.current = { id: e.altKey ? ids[Math.max(0, src.findIndex(s => s.id === id))] : id, mx: m.x, my: m.y, starts: src.map((s, k) => ({ id: e.altKey ? ids[k] : s.id, x: s.x, y: s.y })), moved: !!e.altKey }
    wrap.current!.setPointerCapture(e.pointerId)
  }
  const onBgDown = (e: React.PointerEvent) => {
    const m = toM(e)
    const add = e.shiftKey || e.ctrlKey || e.metaKey
    marq.current = { x0: m.x, y0: m.y, add, base: add ? selected : [] }
    if (!add) select([])
    wrap.current!.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (pan.current) { const d = pan.current; setView(v => ({ ...v, tx: d.tx + e.clientX - d.x, ty: d.ty + e.clientY - d.y })); return }
    const m = toM(e)
    if (marq.current) {
      const q = marq.current
      setMarquee({ x0: q.x0, y0: q.y0, x1: m.x, y1: m.y })
      const [xa, xb] = [Math.min(q.x0, m.x), Math.max(q.x0, m.x)], [ya, yb] = [Math.min(q.y0, m.y), Math.max(q.y0, m.y)]
      const hit = items.filter(i => i.x >= xa && i.x <= xb && i.y >= ya && i.y <= yb).map(i => i.id)
      select([...new Set([...q.base, ...hit])])
      return
    }
    const d = drag.current; if (!d) return
    const prim = d.starts.find(s => s.id === d.id); if (!prim) return
    if (!d.moved) { checkpoint(); d.moved = true }
    // o item clicado vai para a grade; os demais mantêm a posição relativa
    const ddx = gsnap(prim.x + m.x - d.mx) - prim.x, ddy = gsnap(prim.y + m.y - d.my) - prim.y
    update(pr => { for (const s of d.starts) { const it = pr.items.find(i => i.id === s.id); if (it) { it.x = s.x + ddx; it.y = s.y + ddy } } }, false)
  }
  const onUp = () => { drag.current = null; pan.current = null; marq.current = null; setMarquee(null); setPanning(false) }

  const { tx, ty, z } = view
  const cursor = panning ? 'grabbing' : space ? 'grab' : 'default'
  const sw = p.stage.w, sd = p.stage.d
  const ak = autoK(p.stage)
  const gridLines: JSX.Element[] = []
  for (let x = 1; x < sw; x++) gridLines.push(<line key={'v' + x} x1={x} y1={0} x2={x} y2={sd} stroke={theme.grid} strokeWidth={1 / z} />)
  for (let y = 1; y < sd; y++) gridLines.push(<line key={'h' + y} x1={0} y1={y} x2={sw} y2={y} stroke={theme.grid} strokeWidth={1 / z} />)
  const fs = Math.max(0.17 * ak, 11 / z) // rótulos legíveis ao afastar

  return (
    <div className="canvas-wrap">
      <div className="canvas-tools">
        <label className="chk"><input type="checkbox" checked={snapOn} onChange={e => setSnapOn(e.target.checked)} /> {pt ? 'Grade' : 'Snap'}</label>
        <span className="sep" />
        <label className="inl" title={pt ? 'Tamanho global dos ícones' : 'Global icon size'}>{pt ? 'Ícones' : 'Icons'}
          <input type="range" min={0.5} max={2} step={0.05} value={p.stage.k ?? 1} onChange={e => update(pr => { pr.stage.k = +e.target.value }, false)} />
          <span className="mono">{Math.round((p.stage.k ?? 1) * 100)}%</span>
        </label>
        <span className="sep" />
        <span className="vis">
          <button onClick={() => setVisOpen(o => !o)} title={pt ? 'Mostrar/ocultar itens do mapa' : 'Show/hide map items'}>{pt ? 'Visibilidade' : 'Visibility'}{all.some(i => i.hidden) ? ` · ${all.filter(i => i.hidden).length} ${pt ? 'ocultos' : 'hidden'}` : ''}</button>
          {visOpen && <div className="vis-panel">
            <div className="vis-head"><button onClick={() => setVis(all.map(i => i.id), false)}>{pt ? 'Mostrar todos' : 'Show all'}</button><button onClick={() => setVis(all.map(i => i.id), true)}>{pt ? 'Ocultar todos' : 'Hide all'}</button></div>
            <label className="chk"><input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} /> {pt ? 'Ver ocultos esmaecidos no editor' : 'Show hidden dimmed in editor'}</label>
            {all.length === 0 && <p className="muted">{pt ? 'Nenhum item.' : 'No items.'}</p>}
            {all.map(i => <label key={i.id} className="chk vis-row"><input type="checkbox" checked={!i.hidden} onChange={e => setVis([i.id], !e.target.checked)} /> <span>{itemName(i, p.lang) || i.kind}</span></label>)}
          </div>}
        </span>
        {board === 'light' && <span className="hint">{(['aereo', 'chao'] as const).map(k => <span key={k} style={{ marginRight: 10 }}><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 5, background: MOUNT[k].color, marginRight: 4 }} />{pt ? MOUNT[k].pt : MOUNT[k].en}</span>)}</span>}
        <span className="sp" />
        <span className="hint">{pt ? 'Espaço = mão · Alt+arrastar = duplicar · Shift = multi-seleção · Ctrl+C/V' : 'Space = pan · Alt+drag = duplicate · Shift = multi-select · Ctrl+C/V'}</span>
        <button onClick={() => zoomBy(0.8)}>−</button>
        <button className="mono zbtn" onClick={() => zoomTo(100)} title="Ctrl+1">{Math.round(z)}%</button>
        <button onClick={() => zoomBy(1.25)}>+</button>
        <button onClick={() => fit()} title="Ctrl+0">{pt ? 'Ajustar' : 'Fit'}</button>
      </div>
      <div ref={wrap} className="viewport" style={{ cursor }} onPointerDownCapture={onDownCapture} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onDragOver={e => e.preventDefault()} onDrop={onDrop} onPointerDown={onBgDown}>
        <svg width="100%" height="100%" className="board">
          <defs><pattern id="dots" width={40} height={40} patternUnits="userSpaceOnUse"><circle cx={1} cy={1} r={1} fill="#1e2228" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
          <g transform={`translate(${tx} ${ty}) scale(${z})`}>
            <rect x={0} y={0} width={sw} height={sd} fill={theme.stage} stroke="#3A404A" strokeWidth={2 / z} />
            {gridLines}
            <text x={sw / 2} y={sd + 0.2 + fs * 1.1} fontSize={fs * 1.1} fill={theme.muted} textAnchor="middle">{pt ? 'PLATEIA' : 'AUDIENCE'}</text>
            <g opacity={0.3} pointerEvents="none">
              {stageRef.map(it => <g key={it.id} dangerouslySetInnerHTML={{ __html: itemShape(it, { ...theme, fg: theme.muted, audio: theme.muted }, 1.5 / z, ak) }} />)}
            </g>
            {items.map(it => {
              const { w, h } = itemSize(it, ak)
              const sel = selected.includes(it.id), m = Math.max(w, h)
              return (
                <g key={it.id} onPointerDown={e => onItemDown(e, it.id)} opacity={it.hidden ? 0.22 : 1} style={{ cursor: space ? undefined : it.locked ? 'default' : 'move' }}>
                  <rect x={it.x - m / 2 - 0.05} y={it.y - m / 2 - 0.05} width={m + 0.1} height={m + 0.1} fill="transparent" />
                  <g dangerouslySetInnerHTML={{ __html: itemShape(it, theme, 1.5 / z, ak) + itemLabel(it, p, theme, fs, undefined, ak) }} />
                  {sel && <rect x={it.x - w / 2 - 0.08 * ak} y={it.y - h / 2 - 0.08 * ak} width={w + 0.16 * ak} height={h + 0.16 * ak} fill="none" stroke="#FFB020" strokeWidth={1.5 / z} strokeDasharray={`${6 / z} ${4 / z}`} transform={`rotate(${it.rot} ${it.x} ${it.y})`} pointerEvents="none" />}
                </g>
              )
            })}
            {board === 'light' && <g pointerEvents="none" dangerouslySetInnerHTML={{ __html: mountMarks(items.filter(i => !i.hidden), theme, ak) }} />}
            {marquee && <rect x={Math.min(marquee.x0, marquee.x1)} y={Math.min(marquee.y0, marquee.y1)} width={Math.abs(marquee.x1 - marquee.x0)} height={Math.abs(marquee.y1 - marquee.y0)} fill="#FFB020" fillOpacity={0.08} stroke="#FFB020" strokeWidth={1 / z} strokeDasharray={`${4 / z} ${3 / z}`} pointerEvents="none" />}
          </g>
        </svg>
      </div>
    </div>
  )
}
