import { useEffect, useRef, useState } from 'react'

/** Campo numérico estilo Photoshop: digitar, rolar o mouse sobre ele, ou clicar para abrir o fader. */
export function ScaleField({ value, onChange, min = 0.5, max = 2, step = 0.05, label, title }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; title?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const box = useRef<HTMLSpanElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  const live = useRef({ value, onChange, clamp })
  live.current = { value, onChange, clamp }

  // roda do mouse: listener não passivo para impedir a rolagem da página
  useEffect(() => {
    const el = input.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const { value: v, onChange: set, clamp: cl } = live.current
      set(cl(v + (e.deltaY < 0 ? step : -step)))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [step])

  // fecha ao clicar fora ou com Esc
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])

  const commit = () => {
    if (draft !== null) { const n = parseFloat(draft.replace(',', '.')); if (Number.isFinite(n)) onChange(clamp(n / 100)) }
    setDraft(null)
  }
  const pct = Math.round(value * 100)

  return (
    <span className="scalefield" ref={box} title={title}>
      <span className="sf-label">{label}</span>
      <input
        ref={input} className="mono sf-input" inputMode="decimal" aria-label={label} value={draft ?? `${pct}%`}
        onFocus={e => { setOpen(true); setDraft(String(pct)); e.currentTarget.select() }}
        onClick={() => setOpen(true)}
        onChange={e => setDraft(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { commit(); e.currentTarget.blur() }
          else if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur() }
          else if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + step)); setDraft(null) }
          else if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - step)); setDraft(null) }
        }}
      />
      {open && (
        <span className="sf-pop" role="dialog">
          <input type="range" min={min} max={max} step={step} value={value} onChange={e => { onChange(+e.target.value); setDraft(null) }} aria-label={label} />
        </span>
      )}
    </span>
  )
}
