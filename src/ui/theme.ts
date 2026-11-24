import { create } from 'zustand'

export type Mode = 'light' | 'dark'
export type Skin = 'figma' | 'apple'
export const SKINS: { id: Skin; label: string }[] = [{ id: 'figma', label: 'Figma' }, { id: 'apple', label: 'Apple' }]
const KEY = 'stageplot.theme', SKIN_KEY = 'stageplot.skin'
const initial = (): Mode => {
  try { const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark') return v } catch { /* sem storage */ }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}
const initialSkin = (): Skin => {
  try { const v = localStorage.getItem(SKIN_KEY); if (v === 'figma' || v === 'apple') return v } catch { /* sem storage */ }
  return 'figma'
}
const apply = (m: Mode, s: Skin) => { document.documentElement.dataset.theme = m; document.documentElement.dataset.skin = s }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignora */ } }

/** Tema da interface (claro/escuro) e estilo (Figma/Apple). Só afeta o app; os PDFs têm seus próprios temas. */
export const useTheme = create<{ mode: Mode; skin: Skin; toggle: () => void; setSkin: (s: Skin) => void }>((set, get) => {
  const m = initial(), s = initialSkin(); apply(m, s)
  return {
    mode: m, skin: s,
    toggle: () => { const n: Mode = get().mode === 'light' ? 'dark' : 'light'; apply(n, get().skin); save(KEY, n); set({ mode: n }) },
    setSkin: (n: Skin) => { apply(get().mode, n); save(SKIN_KEY, n); set({ skin: n }) },
  }
})
