import { describe, expect, it } from 'vitest'
import { newItem, newProject } from '../model/store'
import { boardSvg, THEMES } from './boardSvg'

describe('mapa exportado: só o desenho e itens fora do palco', () => {
  it('sem título/legenda e a área cresce para itens fora do palco (luz)', () => {
    const p = newProject('x')
    const a = boardSvg(p, 'light', { theme: THEMES.paper, showLegend: false, showScale: false })
    const it = newItem('truss', p.stage.w / 2, -2.5)
    const it2 = newItem('par64', p.stage.w + 2, p.stage.d + 2)
    const b = boardSvg({ ...p, items: [...p.items, it, it2] }, 'light', { theme: THEMES.paper, showLegend: false, showScale: false })
    expect(a.svg).not.toContain('Light plot')
    expect(b.w).toBeGreaterThan(a.w)
    expect(b.h).toBeGreaterThan(a.h)
  })
})
