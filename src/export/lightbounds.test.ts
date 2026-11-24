import { describe, expect, test } from 'vitest'
import { newItem, newProject, normalize } from '../model/store'
import { autoK, boardSvg, itemExtent, THEMES } from './boardSvg'

describe('palco fixo e mapa de luz', () => {
  test('palco é sempre 16×9; itens acompanham a proporção', () => {
    const p = newProject('x'); expect([p.stage.w, p.stage.d]).toEqual([16, 9])
    const old = newProject('y'); old.stage = { w: 8, d: 4.5 }; old.items = [newItem('drums', 4, 2.25)]
    normalize(old); expect([old.stage.w, old.stage.d]).toEqual([16, 9]); expect(old.items[0].x).toBeCloseTo(8); expect(old.items[0].y).toBeCloseTo(4.5)
  })
  test('luz fora dos limites do palco não é cortada', () => {
    const p = newProject('x'); p.items = []
    for (const [k, x, y] of [['ledpar', -1.2, 0.5], ['truss', 2, -0.8], ['moving_spot', p.stage.w + 1, p.stage.d + 0.7]] as const) { const it = newItem(k, x, y); it.board = 'light'; p.items.push(it) }
    const { svg, w, h } = boardSvg(p, 'light', { theme: THEMES.dark, showLegend: false, showScale: false })
    const m = svg.match(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)">/)!, ox = +m[1], oy = +m[2], ak = autoK(p.stage)
    for (const it of p.items) { const e = itemExtent(it, ak); expect(ox + it.x - e.hw).toBeGreaterThanOrEqual(0); expect(ox + it.x + e.hw).toBeLessThanOrEqual(w); expect(oy + it.y - e.hh).toBeGreaterThanOrEqual(0); expect(oy + it.y + e.hh).toBeLessThanOrEqual(h) }
  })
  test('fator global de ícones escala o autoK', () => {
    expect(autoK({ w: 16, d: 9, k: 1.5 })).toBeCloseTo(autoK({ w: 16, d: 9 }) * 1.5)
  })
})
