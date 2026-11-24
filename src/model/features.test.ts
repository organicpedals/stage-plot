import { describe, expect, it, vi } from 'vitest'

vi.mock('svg2pdf.js', () => ({ svg2pdf: async () => {} }))

import { boardSvg, MOUNT, THEMES } from '../export/boardSvg'
import { outputColumns, powerColumns } from '../export/content'
import { T } from '../export/pdfDoc'
import { tone } from '../export/styles/shared'
import { contrast } from '../export/pdfDoc'
import { ICON_MAP, itemParams } from '../library/icons'
import { addMemberIfNew } from '../ui/MusicianInput'
import { inputList, outputList, powerList } from './derive'
import { newItem, newProject, normalize, useStore } from './store'

describe('pontos de energia', () => {
  it('lista os pontos do mapa com tomadas e músico', () => {
    const p = newProject('B'); const a = newItem('ac', 2, 2), s = newItem('strip', 4, 3)
    a.who = 'Ana'; a.params = { outlets: 3 }; s.who = 'Beto'; s.params = { outlets: 6 }
    p.items.push(a, s)
    const r = powerList(p)
    expect(r.map(x => [x.who, x.outlets])).toEqual([['Ana', 3], ['Beto', 6]])
    const c = powerColumns(p, T.pt); expect(c.data.flat()).toEqual(expect.arrayContaining(['Ana', '3', 'Beto', '6']))
  })
  it('sem pontos de energia não gera tabela', () => { expect(powerColumns(newProject('B'), T.pt).data).toHaveLength(0) })
})

describe('saídas com músico', () => {
  it('o músico do item aparece na saída e na tabela do PDF', () => {
    const p = newProject('B'); const w = p.items.find(i => i.kind === 'wedge')!; w.who = 'Carlos'
    expect(outputList(p).find(o => o.itemId === w.id)?.who).toBe('Carlos')
    expect(outputColumns(p, T.pt).data.flat()).toContain('Carlos')
  })
})

describe('bumbo split', () => {
  it('in + out quando ativado', () => {
    const p = newProject('B'); const d = p.items.find(i => i.kind === 'drums')!
    const base = inputList(p).filter(r => r.itemId === d.id).length
    d.params = { ...d.params, kicksplit: true }
    const names = inputList(p).filter(r => r.itemId === d.id).map(r => r.name)
    expect(names.length).toBe(base + 1); expect(names).toEqual(expect.arrayContaining(['Bumbo in', 'Bumbo out'])); expect(names).not.toContain('Bumbo')
    expect(itemParams(d).kicksplit).toBe(true); expect(ICON_MAP.drums.params.some(x => x.key === 'kicksplit')).toBe(true)
  })
  it('com 2 bumbos gera 4 canais de bumbo', () => {
    const p = newProject('B'); const d = p.items.find(i => i.kind === 'drums')!
    d.params = { ...d.params, kicksplit: true, kick: 2 }
    expect(inputList(p).filter(r => /^Bumbo \d (in|out)$/.test(r.name))).toHaveLength(4)
  })
})

describe('mapa de luz: marca de posição', () => {
  it('desenha a cor de aéreo/chão e a legenda', () => {
    const p = newProject('B'); const a = newItem('ledpar', 4, 2), c = newItem('ledpar', 8, 2)
    a.params = { ...a.params, mount: 'Aéreo' }; c.params = { ...c.params, mount: 'Chão' }; p.items.push(a, c)
    const { svg } = boardSvg(p, 'light', { theme: THEMES.paper })
    expect(svg).toContain(MOUNT.aereo.color); expect(svg).toContain(MOUNT.chao.color); expect(svg).toContain('Aéreo'); expect(svg).toContain('Chão')
  })
  it('sem equipamentos com posição, sem legenda', () => {
    const p = newProject('B'); p.items.push(newItem('truss', 8, 1))
    const { svg } = boardSvg(p, 'light', { theme: THEMES.paper }); expect(svg).not.toContain(MOUNT.aereo.color)
  })
})

describe('cor de destaque', () => {
  it('ajusta o tom para contraste >= 4,5:1 em fundo claro e escuro', () => {
    for (const c of ['#FFB020', '#FFFF00', '#1D4ED8', '#000000', '#FFFFFF']) for (const bg of ['#FAF9F6', '#1C1C1E']) expect(contrast(tone(c, bg), bg), `${c} em ${bg}`).toBeGreaterThanOrEqual(4.5)
  })
})

describe('integrantes', () => {
  it('nome digitado à mão vira integrante (sem duplicar) e pode ser excluído', () => {
    const p = newProject('B'); p.members = []
    useStore.setState({ projects: [p], currentId: p.id })
    addMemberIfNew('  Dora '); addMemberIfNew('dora'); addMemberIfNew('')
    let cur = useStore.getState().cur()!; expect(cur.members.map(m => m.name)).toEqual(['Dora'])
    useStore.getState().update(pr => { pr.members = [] })
    cur = useStore.getState().cur()!; expect(cur.members).toHaveLength(0)
  })
  it('migração: músicos já usados nos itens entram na lista uma única vez (excluir não os traz de volta)', () => {
    const p = newProject('B'); p.members = []; delete p.membersSynced; p.items[0].who = 'Eva'
    normalize(p); expect(p.members.map(m => m.name)).toEqual(['Eva'])
    p.members = []; normalize(p); expect(p.members).toHaveLength(0)
  })
})
