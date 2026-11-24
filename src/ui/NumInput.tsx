import { useEffect, useState } from 'react'

/** Campo numérico que não "corrige" o valor a cada tecla: aceita rascunho livre,
 *  aplica ao vivo só quando o valor já é válido e normaliza (limites) ao sair / Enter. */
export function NumInput({ value, min, max, step, onChange, className, style }: {
  value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; className?: string; style?: React.CSSProperties
}) {
  const [draft, setDraft] = useState<string | null>(null)
  useEffect(() => { setDraft(null) }, [value])
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
  const parse = (s: string) => { const n = parseFloat(s.replace(',', '.')); return Number.isFinite(n) ? n : null }
  const commit = () => {
    if (draft === null) return
    const n = parse(draft)
    if (n !== null) { const c = clamp(n); if (c !== value) onChange(c) }
    setDraft(null)
  }
  return (
    <input
      type="text" inputMode="decimal" className={className} style={style}
      value={draft ?? String(value)}
      onFocus={e => e.target.select()}
      onChange={e => {
        const s = e.target.value
        if (!/^-?\d*[.,]?\d*$/.test(s)) return
        setDraft(s)
        const n = parse(s)
        if (n !== null && n >= (min ?? -Infinity) && n <= (max ?? Infinity) && !/[.,]$/.test(s)) onChange(n)
      }}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur() }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const d = (e.key === 'ArrowUp' ? 1 : -1) * (step ?? 1)
          onChange(clamp(+((parse(draft ?? String(value)) ?? value) + d).toFixed(3)))
        }
      }}
    />
  )
}
