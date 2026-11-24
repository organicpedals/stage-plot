import { useEffect, useRef, useState } from 'react'

/** Motor único de todos os faders do app (estilo Photoshop): digitar, rolar o mouse sobre o campo
 *  ou clicar para abrir o fader. `mult` converte valor interno ↔ exibido (ex.: 100 para %). */
export function FaderField({ value, onChange, min, max, step, inMin = min, inMax = max, unit = '', mult = 1, label, title }: {
  value: number; onChange: (v: number) => void
  min: number; max: number; step: number // faixa do fader, roda e setas
  inMin?: number; inMax?: number // faixa aceita ao digitar
  unit?: string; mult?: number; label?: string; title?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const box = useRef<HTMLSpanElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const fix = (v: number) => +v.toFixed(4)
  const clamp = (v: number, lo = inMin, hi = inMax) => Math.min(hi, Math.max(lo, fix(v)))
  const live = useRef({ value, onChange })
  live.current = { value, onChange }

  // roda do mouse: listener não passivo para impedir a rolagem da página
  useEffect(() => {
    const el = input.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const { value: v, onChange: set } = live.current
      set(clamp(Math.round(v / step) * step + (e.deltaY < 0 ? step : -step)))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, inMin, inMax])

  // fecha ao clicar fora ou com Esc
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])

  const commit = () => {
    if (draft !== null) { const n = parseFloat(draft.replace(',', '.')); if (Number.isFinite(n)) onChange(clamp(n / mult)) }
    setDraft(null)
  }
  const shown = +(value * mult).toFixed(mult === 1 ? 2 : 0)

  return (
    <span className="scalefield" ref={box} title={title}>
      {label && <span className="sf-label">{label}</span>}
      <input
        ref={input} className="mono sf-input" inputMode="decimal" aria-label={label ?? title} value={draft ?? `${shown}${unit}`}
        onFocus={e => { setOpen(true); setDraft(String(shown)); e.currentTarget.select() }}
        onClick={() => setOpen(true)}
        onChange={e => setDraft(e.target.value.replace(/[^\d.,-]/g, ''))}
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
          <input type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={e => { onChange(+e.target.value); setDraft(null) }} aria-label={label ?? title} />
        </span>
      )}
    </span>
  )
}

/** Tamanho global dos ícones (em %). */
export const ScaleField = (p: { value: number; onChange: (v: number) => void; label?: string; title?: string }) =>
  <FaderField {...p} min={0.5} max={2} step={0.05} unit="%" mult={100} />
