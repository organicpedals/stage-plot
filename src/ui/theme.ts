import { create } from 'zustand'

export type Mode = 'light' | 'dark'
const KEY = 'stageplot.theme'
const initial = (): Mode => {
  try { const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark') return v } catch { /* sem storage */ }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}
const apply = (m: Mode) => { document.documentElement.dataset.theme = m }

/** Tema da interface (claro/escuro). Só afeta o app; os PDFs têm seus próprios temas. */
export const useTheme = create<{ mode: Mode; toggle: () => void }>((set, get) => {
  const m = initial(); apply(m)
  return { mode: m, toggle: () => { const n: Mode = get().mode === 'light' ? 'dark' : 'light'; apply(n); try { localStorage.setItem(KEY, n) } catch { /* ignora */ } set({ mode: n }) } }
})
