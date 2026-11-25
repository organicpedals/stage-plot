import { useEffect, useMemo, useRef, useState } from 'react'
import { exportPdf, exportPng, exportProject, exportSvg, Look, pdfBlob } from '../export/files'
import { pdfOmissions } from '../export/parts'
import { STYLE_IDS, STYLES, styleOf } from '../export/pdfStyles'
import { useStore } from '../model/store'
import type { Project } from '../model/types'

type Kind = 'pdf' | 'png' | 'svg' | 'project'

const ICONS: Record<Kind, JSX.Element> = {
  pdf: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 12h5M9.5 15h5M9.5 18h3" /></>,
  png: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4.5 17l4.5-4.5 3.5 3.5 2.5-2.5 4.5 4.5" /></>,
  svg: <><path d="M5 18C7 8 13 6 19 6" /><rect x="3.5" y="16.5" width="3" height="3" /><rect x="17.5" y="4.5" width="3" height="3" /><path d="M12 6V3M12 6l2-1.5" /></>,
  project: <><path d="M12 3l8 4v10l-8 4-8-4V7z" /><path d="M4 7l8 4 8-4M12 11v10" /></>,
}
const KINDS: { id: Kind; ext: string; label: [string, string]; tip: [string, string] }[] = [
  { id: 'pdf', ext: '.pdf', label: ['PDF', 'PDF'], tip: ['Documento completo: capa, rider, mapas, input list e energia', 'Full document: cover, rider, plots, input list and power'] },
  { id: 'png', ext: '.png', label: ['Imagem', 'Image'], tip: ['Só o mapa, em imagem PNG', 'Just the plot, as a PNG image'] },
  { id: 'svg', ext: '.svg', label: ['SVG', 'SVG'], tip: ['Só o mapa, em vetor editável (Illustrator, Figma)', 'Just the plot, as editable vector (Illustrator, Figma)'] },
  { id: 'project', ext: '.stgp', label: ['Projeto', 'Project'], tip: ['Arquivo .stgp: backup ou para abrir em outro computador', '.stgp file: backup, or to open on another computer'] },
]

export function ExportTab({ p }: { p: Project }) {
  const { update } = useStore()
  const pt = p.lang === 'pt'
  const [kind, setKind] = useState<Kind | null>(null)
  const [url, setUrl] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [look, setLook] = useState<Look>('paper')
  const seq = useRef(0)
  const gaps = useMemo(() => pdfOmissions(p), [p])

  // a prévia do PDF só é gerada depois de escolher PDF
  useEffect(() => {
    if (kind !== 'pdf') return
    const my = ++seq.current; setBusy(true); setErr('')
    const t = setTimeout(() => {
      pdfBlob(p).then(b => { if (my === seq.current) { setUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b) }) } })
        .catch(e => { if (my === seq.current) setErr(String(e?.message ?? e)) }).finally(() => { if (my === seq.current) setBusy(false) })
    }, 350)
    return () => clearTimeout(t)
  }, [p, kind])

  const run = (fn: () => Promise<void> | void) => Promise.resolve(fn()).catch(e => setErr(String(e?.message ?? e)))
  const pick = (k: Kind) => { setErr(''); setKind(k === kind ? null : k) }

  const lookField = (
    <label>{pt ? 'Aparência' : 'Look'}
      <select title={pt ? 'Aparência da imagem exportada (papel, escuro ou preto e branco)' : 'Look of the exported image (paper, dark or black and white)'} value={look} onChange={e => setLook(e.target.value as Look)}>
        <option value="paper">{pt ? 'Papel (claro)' : 'Paper'}</option><option value="dark">{pt ? 'Escuro' : 'Dark'}</option><option value="mono">{pt ? 'P&B alto contraste' : 'High-contrast B/W'}</option>
      </select>
    </label>
  )

  return (
    <div className="export">
      <div className="exp-grid" role="radiogroup" aria-label={pt ? 'Formato de exportação' : 'Export format'}>
        {KINDS.map(k => (
          <button key={k.id} role="radio" aria-checked={kind === k.id} title={k.tip[pt ? 0 : 1]} className={'card exp exp-' + k.id + (kind === k.id ? ' on' : '')} onClick={() => pick(k.id)}>
            <span className="exp-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[k.id]}</svg></span>
            <span className="exp-txt"><b>{k.label[pt ? 0 : 1]}</b><small>{k.ext}</small></span>
          </button>
        ))}
      </div>

      {kind && (
        <div className={'exp-body' + (kind === 'pdf' ? ' with-preview' : '')}>
          <section className="tpls">
            {kind === 'pdf' && (<>
              <div className="pdfstyles" role="radiogroup" aria-label={pt ? 'Modelo do PDF' : 'PDF model'}>
                {STYLE_IDS.map(id => (
                  <label key={id} title={STYLES[id].desc[p.lang]} className={'pdfstyle' + (styleOf(p).id === id ? ' on' : '')}>
                    <input type="radio" name="pdfstyle" checked={styleOf(p).id === id} onChange={() => update(pr => { pr.pdfStyle = id })} />
                    <span className={'thumb t-' + id} aria-hidden="true"><i /><i /><i /></span>
                    <b>{STYLES[id].label[p.lang]}</b>
                  </label>
                ))}
              </div>
              <label title={pt ? 'Versão preto e branco de alto contraste, boa para imprimir' : 'High-contrast black-and-white version, good for printing'} className="chk block">
                <input type="checkbox" checked={!!p.pdfMono} onChange={e => update(pr => { pr.pdfMono = e.target.checked })} />
                {pt ? 'Versão P&B / alto contraste (impressão)' : 'B/W high-contrast version (print)'}
              </label>
              {gaps.length > 0 && (
                <div className="gaps" role="status">
                  <b>{pt ? 'Não aparecerá no PDF (sem dados)' : 'Left out of the PDF (no data)'}</b>
                  <ul>{gaps.map(g => <li key={g}>{g}</li>)}</ul>
                </div>
              )}
              <div className="actions">
                <button title={pt ? 'Baixa o PDF completo' : 'Downloads the full PDF'} className="primary" onClick={() => run(() => exportPdf(p))}>{pt ? 'Exportar PDF' : 'Export PDF'}</button>
              </div>
            </>)}

            {(kind === 'png' || kind === 'svg') && (<>
              {lookField}
              <div className="actions">
                <button className="primary" title={pt ? 'Baixa só o mapa de palco' : 'Downloads only the stage plot'}
                  onClick={() => (kind === 'png' ? run(() => exportPng(p, 'stage', look)) : exportSvg(p, 'stage', look))}>{pt ? 'Mapa de palco' : 'Stage plot'} · {kind.toUpperCase()}</button>
                <button className="primary" title={pt ? 'Baixa só o mapa de luz' : 'Downloads only the light plot'}
                  onClick={() => (kind === 'png' ? run(() => exportPng(p, 'light', look)) : exportSvg(p, 'light', look))}>{pt ? 'Mapa de luz' : 'Light plot'} · {kind.toUpperCase()}</button>
              </div>
            </>)}

            {kind === 'project' && (
              <div className="actions">
                <button className="primary" title={pt ? 'Salva o projeto inteiro em um arquivo .stgp' : 'Saves the whole project as a .stgp file'} onClick={() => run(() => exportProject(p))}>{pt ? 'Salvar projeto (.stgp)' : 'Save project (.stgp)'}</button>
              </div>
            )}
            {err && <p className="error" role="alert">{err}</p>}
          </section>

          {kind === 'pdf' && (
            <section className="preview">
              {busy && <div className="busy">{pt ? 'Gerando prévia…' : 'Rendering preview…'}</div>}
              {url ? <iframe title={pt ? 'Prévia do PDF' : 'PDF preview'} src={url + '#toolbar=0&navpanes=0'} />
                : !busy && !err && <div className="empty">{pt ? 'A prévia do PDF aparece aqui.' : 'The PDF preview appears here.'}</div>}
              {url && <a className="openpdf" href={url} target="_blank" rel="noreferrer">{pt ? 'Abrir em nova aba' : 'Open in new tab'}</a>}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
