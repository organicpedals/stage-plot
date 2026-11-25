import { useEffect, useState } from 'react'
import { useIconStyle } from '../library/icons'
import { Canvas } from '../editor/Canvas'
import { autoK } from '../export/boardSvg'
import { cloneItem, copyItems, newProject, normalize, pasteItems, useStore } from '../model/store'
import { exportAllProjects, exportProject } from '../export/files'
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
    <label className="iconstyle" title={lang === 'pt' ? 'Skin: aparência da interface (Default ou Modern)' : 'Skin: interface look (Default or Modern)'}>
      Skin
      <select value={skin} onChange={e => setSkin(e.target.value as Skin)}>{SKINS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
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
      <header className="brand"><span className="logo" />Stage Plot<span className="sp" /><SkinSelect lang="pt" /><ThemeToggle lang="pt" /></header>
      <div className="grid">
        <button title="Cria um projeto novo com o palco vazio" className="card new" onClick={() => addProject(newProject('Nova banda'))}><b>+</b> Novo projeto</button>
        <label title="Importa projetos salvos (.stgp) para esta lista" className="card new"><b>↥</b> Importar projetos (.stgp)<input type="file" accept=".stgp,.stageplot,.json" multiple hidden onChange={fileIn} /></label>
        {projects.length > 0 && <button title="Baixa um backup com todos os projetos em um único arquivo .stgp" className="card new" onClick={() => exportAllProjects(projects)}><b>↧</b> Exportar todos (backup)</button>}
        {projects.map(p => (
          <div key={p.id} className="card" role="button" tabIndex={0} onClick={() => setCurrent(p.id)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setCurrent(p.id) } }}>
            <h3>{p.band.name || p.name}</h3>
            <p>{p.items.filter(i => i.board === 'stage').length} itens · {p.version}</p>
            <p className="muted">Atualizado em {p.updated}</p>
            <button title="Baixa só este projeto em um arquivo .stgp" className="ghost" onClick={e => { e.stopPropagation(); exportProject(p) }}>Exportar</button>
            <button title="Exclui o projeto (pede confirmação)" className="ghost" onClick={e => { e.stopPropagation(); if (confirm('Excluir este projeto?')) removeProject(p.id) }}>Excluir</button>
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
  const TAB_TIPS: Record<Tab, [string, string]> = {
    stage: ['Mapa de palco: posicione instrumentos, retornos e equipamentos de áudio', 'Stage plot: place instruments, monitors and audio gear'],
    light: ['Mapa de luz: posicione refletores, móveis e estruturas', 'Light plot: place fixtures, movers and rigging'],
    inputs: ['Input list, saídas e energia: gerados a partir do mapa e editáveis', 'Input list, outputs and power: generated from the plot and editable'],
    rider: ['Textos do rider técnico que entram no PDF', 'Technical rider text sections included in the PDF'],
    info: ['Dados da banda, foto, cor e integrantes (capa do PDF)', 'Band details, photo, color and members (PDF cover)'],
    export: ['Gera o PDF completo, SVG, PNG ou salva o projeto', 'Export the full PDF, SVG, PNG or save the project'],
  }
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
        <button title={pt ? 'Volta à lista de projetos. Tudo é salvo automaticamente.' : 'Back to the project list. Everything is saved automatically.'} className="ghost" onClick={() => setCurrent(null)}>← {pt ? 'Projetos' : 'Projects'}</button>
        <input title={pt ? 'Nome da banda: aparece na capa e nos PDFs' : 'Band name: shown on the cover and in the PDFs'} className="title" value={p.band.name || p.name} onChange={e => update(pr => { pr.band.name = e.target.value; pr.name = e.target.value }, false)} />
        <nav className="tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} title={TAB_TIPS[k][pt ? 0 : 1]} onClick={() => setTab(k)}>{l}</button>)}</nav>
        <span className="sp" />
        <button className="ghost" disabled={!past.length} onClick={undo} title="Ctrl+Z">↶</button>
        <button className="ghost" disabled={!future.length} onClick={redo} title="Ctrl+Y">↷</button>
        <SkinSelect lang={p.lang} />
        <ThemeToggle lang={p.lang} />
        
        <select title={pt ? 'Idioma do projeto e dos documentos exportados' : 'Project and exported documents language'} value={p.lang} onChange={e => update(pr => { pr.lang = e.target.value as 'pt' | 'en' })}><option value="pt">PT</option><option value="en">EN</option></select>
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
