import { useEffect, useMemo, useRef, useState } from 'react'
import { exportJson, exportPdf, exportPng, exportSvg, Look, pdfBlob } from '../export/files'
import { pdfOmissions } from '../export/parts'
import { STYLE_IDS, STYLES, styleOf } from '../export/pdfStyles'
import { useStore } from '../model/store'
import type { Project } from '../model/types'

export function ExportTab({ p }: { p: Project }) {
  const { update } = useStore()
  const pt = p.lang === 'pt'
  const [url, setUrl] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [look, setLook] = useState<Look>('paper')
  const seq = useRef(0)
  const gaps = useMemo(() => pdfOmissions(p), [p])

  useEffect(() => {
    const my = ++seq.current; setBusy(true); setErr('')
    const t = setTimeout(() => {
      pdfBlob(p).then(b => { if (my === seq.current) { setUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b) }) } })
        .catch(e => { if (my === seq.current) setErr(String(e?.message ?? e)) }).finally(() => { if (my === seq.current) setBusy(false) })
    }, 350)
    return () => clearTimeout(t)
  }, [p])

  const run = (fn: () => Promise<void> | void) => Promise.resolve(fn()).catch(e => setErr(String(e?.message ?? e)))

  return (
    <div className="export">
      <section className="tpls">
        <h2>{pt ? 'PDF' : 'PDF'}</h2>
        <div className="pdfstyles" role="radiogroup" aria-label={pt ? 'Modelo do PDF' : 'PDF model'}>
          {STYLE_IDS.map(id => (
            <label key={id} title={STYLES[id].desc[p.lang]} className={'pdfstyle' + (styleOf(p).id === id ? ' on' : '')}>
              <input type="radio" name="pdfstyle" checked={styleOf(p).id === id} onChange={() => update(pr => { pr.pdfStyle = id })} />
              <span className={'thumb t-' + id} aria-hidden="true"><i /><i /><i /></span>
              <b>{STYLES[id].label[p.lang]}</b>
            </label>
          ))}
        </div>
        <div className="actions">
          <button title={pt ? 'Gera um único PDF: capa, rider, mapas, input list e energia' : 'Generates a single PDF: cover, rider, plots, input list and power'} className="primary" onClick={() => run(() => exportPdf(p))}>{pt ? 'Exportar PDF' : 'Export PDF'}</button>
        </div>
        <label title={pt ? 'Versão preto e branco de alto contraste, boa para imprimir' : 'High-contrast black-and-white version, good for printing'} className="chk block"><input type="checkbox" checked={!!p.pdfMono} onChange={e => update(pr => { pr.pdfMono = e.target.checked })} />
          {pt ? 'Versão P&B / alto contraste (impressão)' : 'B/W high-contrast version (print)'}</label>
        {gaps.length > 0 && (
          <div className="gaps" role="status">
            <b>{pt ? 'Não aparecerá no PDF (sem dados)' : 'Left out of the PDF (no data)'}</b>
            <ul>{gaps.map(g => <li key={g}>{g}</li>)}</ul>
          </div>
        )}
        <div className="actions">
          <button title={pt ? 'Salva o projeto inteiro em .json (backup ou para abrir em outro computador)' : 'Saves the whole project as .json (backup, or to open on another computer)'} onClick={() => run(() => exportJson(p))}>{pt ? 'Salvar projeto (.json)' : 'Save project (.json)'}</button>
        </div>
        <h2>{pt ? 'Mapas como imagem' : 'Maps as images'}</h2>
        <label>{pt ? 'Aparência' : 'Look'}
          <select title={pt ? 'Aparência das imagens exportadas (papel, escuro ou preto e branco)' : 'Look of the exported images (paper, dark or black and white)'} value={look} onChange={e => setLook(e.target.value as Look)}>
            <option value="paper">{pt ? 'Papel (claro)' : 'Paper'}</option><option value="dark">{pt ? 'Escuro' : 'Dark'}</option><option value="mono">{pt ? 'P&B alto contraste' : 'High-contrast B/W'}</option>
          </select></label>
        <div className="actions">
          <button title={pt ? 'Mapa de palco em vetor (SVG), editável em Illustrator/Figma' : 'Stage plot as vector (SVG), editable in Illustrator/Figma'} onClick={() => exportSvg(p, 'stage', look)}>{pt ? 'Palco' : 'Stage'} SVG</button>
          <button title={pt ? 'Mapa de palco em imagem PNG' : 'Stage plot as a PNG image'} onClick={() => run(() => exportPng(p, 'stage', look))}>{pt ? 'Palco' : 'Stage'} PNG</button>
          <button title={pt ? 'Mapa de luz em vetor (SVG)' : 'Light plot as vector (SVG)'} onClick={() => exportSvg(p, 'light', look)}>{pt ? 'Luz' : 'Light'} SVG</button>
          <button title={pt ? 'Mapa de luz em imagem PNG' : 'Light plot as a PNG image'} onClick={() => run(() => exportPng(p, 'light', look))}>{pt ? 'Luz' : 'Light'} PNG</button>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
      </section>
      <section className="preview">
        {busy && <div className="busy">{pt ? 'Gerando prévia…' : 'Rendering preview…'}</div>}
        {url ? <iframe title={pt ? 'Prévia do PDF' : 'PDF preview'} src={url + '#toolbar=0&navpanes=0'} />
          : !busy && !err && <div className="empty">{pt ? 'A prévia do PDF aparece aqui.' : 'The PDF preview appears here.'}</div>}
        {url && <a className="openpdf" href={url} target="_blank" rel="noreferrer">{pt ? 'Abrir em nova aba' : 'Open in new tab'}</a>}
      </section>
    </div>
  )
}
