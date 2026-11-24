import { useMemo, useRef, useState } from 'react'
import { useStore } from '../model/store'
import { uid, type Project } from '../model/types'

/** Sugestões do campo Músico: a lista de integrantes (aba Informações). Nomes digitados à mão entram nela ao confirmar. */
export function musicianNames(p: Project): string[] {
  return [...new Set(p.members.map(m => m.name.trim()).filter(Boolean))]
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Nome escrito à mão num campo Músico vira integrante (se ainda não existir); pode ser excluído na aba Informações. */
export function addMemberIfNew(name: string) {
  const v = name.trim(); if (!v) return
  const { cur, update } = useStore.getState()
  const p = cur(); if (!p || p.members.some(m => norm(m.name.trim()) === norm(v))) return
  update(pr => { pr.members.push({ id: uid(), name: v, role: '' }) }, false)
}

/** Campo com lista: ao clicar mostra todos os nomes; ao digitar filtra os que combinam. */
export function MusicianInput({ p, value, onChange, className, placeholder }: {
  p: Project; value: string; onChange: (v: string) => void; className?: string; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState(false) // só filtra depois que o usuário digita
  const [hi, setHi] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  const all = useMemo(() => musicianNames(p), [p])
  const q = norm(value.trim())
  const list = typed && q ? all.filter(n => norm(n).includes(q)) : all
  const pick = (v: string) => { onChange(v); addMemberIfNew(v); setOpen(false); setTyped(false); setHi(-1) }

  return (
    <div className="mus" ref={box}
      onBlur={e => { if (!box.current?.contains(e.relatedTarget as Node)) { addMemberIfNew(value); setOpen(false); setTyped(false); setHi(-1) } }}>
      <input
        className={className} value={value} placeholder={placeholder} autoComplete="off"
        onFocus={() => { setOpen(true); setTyped(false) }}
        onClick={() => { setOpen(true); setTyped(false) }}
        onChange={e => { onChange(e.target.value); setOpen(true); setTyped(true); setHi(-1) }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi(h => Math.min(list.length - 1, h + 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)) }
          else if (e.key === 'Enter' && open && hi >= 0 && list[hi]) { e.preventDefault(); pick(list[hi]) }
          else if (e.key === 'Enter') addMemberIfNew(value)
          else if (e.key === 'Escape') { setOpen(false) }
        }}
      />
      {open && list.length > 0 && (
        <ul className="mus-list" role="listbox">
          {list.map((n, i) => (
            <li key={n} tabIndex={-1} role="option" aria-selected={n === value} className={(i === hi ? 'hi ' : '') + (n === value ? 'cur' : '')}
              onMouseDown={e => e.preventDefault()} onClick={() => pick(n)}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
