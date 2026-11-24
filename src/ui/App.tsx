import { useEffect, useState } from 'react'
import { ICON_STYLES, useIconStyle } from '../library/icons'
import { Canvas } from '../editor/Canvas'
import { autoK } from '../export/boardSvg'
import { cloneItem, copyItems, newProject, normalize, pasteItems, useStore } from '../model/store'
import { exportAllJson, exportJson } from '../export/files'
import { parseImport } from '../model/io'
import type { Project } from '../model/types'
import { Palette } from './Palette'
import { Props } from './Props'
import { InfoTab, InputsTab, RiderTab } from './Tabs'
import { ExportTab } from './ExportTab'
import { useTheme, SKINS, type Skin } from './theme'

type Tab = 'stage' | 'light' | 'inputs' | 'rider' | 'info' | 'export'

function ThemeToggle({ lang }: { lang: 'pt' | 'en' }) {
  const { mode, toggle } = useTheme()
  const pt = lang === 'pt'
  return <button className="ghost themebtn" onClick={toggle} title={pt ? 'Alternar tema claro/escuro' : 'Toggle light/dark theme'} aria-label={pt ? 'Alternar tema' : 'Toggle theme'}>{mode === 'light' ? (pt ? '☾ Escuro' : '☾ Dark') : (pt ? '☀ Claro' : '☀ Light')}</button>
}

function SkinSelect({ lang }: { lang: 'pt' | 'en' }) {
  const { skin, setSkin } = useTheme()
  return (
    <label className="iconstyle" title={lang === 'pt' ? 'Estilo da interface' : 'Interface style'}>
      {lang === 'pt' ? 'Interface' : 'UI'}
      <select value={skin} onChange={e => setSkin(e.target.value as Skin)}>{SKINS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
    </label>
  )
}

function IconStyleSelect({ lang }: { lang: 'pt' | 'en' }) {
  const { style, setStyle } = useIconStyle()
  return (
    <label className="iconstyle" title={lang === 'pt' ? 'Estilo dos ícones (global)' : 'Icon style (global)'}>
      {lang === 'pt' ? 'Ícones' : 'Icons'}
      <select value={style} onChange={e => setStyle(e.target.value as typeof style)}>{ICON_STYLES.map(s => <option key={s.id} value={s.id}>{s.label[lang]}</option>)}</select>
    </label>
  )
}

function Home() {
  useIconStyle()
  const { projects, setCurrent, addProject, removeProject } = useStore()
  const fileIn = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]; e.target.value = ''
    let n = 0; const errs: string[] = []
    for (const f of files) { try { for (const p of parseImport(await f.text())) { addProject(p); n++ } } catch (er) { errs.push(`${f.name}: ${(er as Error).message}`) } }
    if (n) { useStore.getState().setCurrent(null) }
    if (errs.length) alert(errs.join(' · ')); else if (n) alert(`${n} projeto(s) importado(s).`)
  }
  return (
    <div className="home">
      <header className="brand"><span className="logo" />Stage Plot<small>mapas de palco · luz · rider técnico</small><span className="sp" /><SkinSelect lang="pt" /><ThemeToggle lang="pt" /><IconStyleSelect lang="pt" /></header>
      <div className="grid">
        <button className="card new" onClick={() => addProject(newProject('Nova banda'))}><b>+</b> Novo projeto</button>
        <label className="card new"><b>↥</b> Importar projetos (.json)<input type="file" accept=".json,application/json" multiple hidden onChange={fileIn} /></label>
        {projects.length > 0 && <button className="card new" onClick={() => exportAllJson(projects)}><b>↧</b> Exportar todos (backup)</button>}
        {projects.map(p => (
          <div key={p.id} className="card" role="button" tabIndex={0} onClick={() => setCurrent(p.id)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setCurrent(p.id) } }}>
            <h3>{p.band.name || p.name}</h3>
            <p>{p.items.filter(i => i.board === 'stage').length} itens · {p.version}</p>
            <p className="muted">Atualizado em {p.updated}</p>
            <button className="ghost" onClick={e => { e.stopPropagation(); exportJson(p) }}>Exportar</button>
            <button className="ghost" onClick={e => { e.stopPropagation(); if (confirm('Excluir este projeto?')) removeProject(p.id) }}>Excluir</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Editor({ p }: { p: Project }) {
  const { setCurrent, board, setBoard, selected, select, update, undo, redo, past, future } = useStore()
  const [tab, setTab] = useState<Tab>('stage')
  useIconStyle() // re-renderiza mapa e biblioteca ao trocar o estilo
  const pt = p.lang === 'pt'
  const tabs: [Tab, string][] = [['stage', pt ? 'Palco' : 'Stage'], ['light', pt ? 'Luz' : 'Light'], ['inputs', 'Input list'], ['rider', 'Rider'], ['info', pt ? 'Informações' : 'Info'], ['export', pt ? 'Exportar' : 'Export']]

  useEffect(() => { if (tab === 'stage' || tab === 'light') setBoard(tab) }, [tab, setBoard])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return }
      if (tab !== 'stage' && tab !== 'light') return
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase()
      if (mod && k === 'v') { e.preventDefault(); const ni = pasteItems(board); if (ni.length) { update(pr => { pr.items.push(...ni) }); select(ni.map(i => i.id)) }; return }
      if (e.key === 'Escape') { select([]); return }
      if (!selected.length) return
      if (mod && k === 'c') { e.preventDefault(); copyItems(p.items, selected); return }
      if (mod && k === 'x') { e.preventDefault(); copyItems(p.items, selected); update(pr => { pr.items = pr.items.filter(i => !selected.includes(i.id)) }); select([]); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { update(pr => { pr.items = pr.items.filter(i => !selected.includes(i.id)) }); select([]) }
      if (mod && k === 'd') { e.preventDefault(); const cl = p.items.filter(i => selected.includes(i.id)).map(i => cloneItem(i, 0.4, 0.4)); update(pr => { pr.items.push(...cl) }); select(cl.map(i => i.id)) }
      const step = (e.shiftKey ? 0.25 : 0.05) * autoK(p.stage)
      const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      if (mv[e.key]) { e.preventDefault(); update(pr => { for (const id of selected) { const s = pr.items.find(i => i.id === id); if (s && !s.locked) { s.x += mv[e.key][0]; s.y += mv[e.key][1] } } }) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [selected, update, select, undo, redo, tab, board, p.items, p.stage])

  return (
    <div className="editor">
      <header className="top">
        <button className="ghost" onClick={() => setCurrent(null)}>← {pt ? 'Projetos' : 'Projects'}</button>
        <input className="title" value={p.band.name || p.name} onChange={e => update(pr => { pr.band.name = e.target.value; pr.name = e.target.value }, false)} />
        <nav className="tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</nav>
        <span className="sp" />
        <button className="ghost" disabled={!past.length} onClick={undo} title="Ctrl+Z">↶</button>
        <button className="ghost" disabled={!future.length} onClick={redo} title="Ctrl+Y">↷</button>
        <SkinSelect lang={p.lang} />
        <ThemeToggle lang={p.lang} />
        <IconStyleSelect lang={p.lang} />
        <select value={p.lang} onChange={e => update(pr => { pr.lang = e.target.value as 'pt' | 'en' })}><option value="pt">PT</option><option value="en">EN</option></select>
      </header>
      <main className={tab === 'stage' || tab === 'light' ? 'work' : 'page'}>
        {(tab === 'stage' || tab === 'light') && (<>
          <Palette p={p} board={board} />
          <Canvas p={p} board={tab} />
          <Props p={p} />
        </>)}
        {tab === 'inputs' && <InputsTab p={p} />}
        {tab === 'rider' && <RiderTab p={p} />}
        {tab === 'info' && <InfoTab p={p} />}
        {tab === 'export' && <ExportTab p={p} />}
      </main>
    </div>
  )
}

export function App() {
  const { currentId, projects } = useStore()
  const p = projects.find(x => x.id === currentId)
  return p ? <Editor p={p} /> : <Home />
}
