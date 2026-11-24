import { describe, expect, it } from 'vitest'
import { inputList, patchList } from './derive'
import { newItem, newProject, normalize } from './store'

describe('input list', () => {
  it('músico do item cruza para todos os canais dele', () => {
    const p = newProject('Teste')
    p.items = [newItem('drums', 5, 2), newItem('vocal', 5, 5)]
    p.items[0].who = 'Ana'
    const rows = inputList(p)
    expect(rows.slice(0, 9).every(r => r.who === 'Ana')).toBe(true)
    expect(rows[9].who).toBe('')
  })
  it('bateria padrão gera canais conforme parâmetros', () => {
    const p = newProject('Teste')
    p.items = [newItem('drums', 5, 2), newItem('vocal', 5, 5)]
    // 1 bumbo + caixa + 2 toms + 1 surdo + hihat + OH L/R = 9, + voz = 10
    expect(inputList(p)).toHaveLength(10)
    p.items[0].params = { ...p.items[0].params, toms: 4, floors: 2, kick: 2 }
    // 2 bumbos + caixa + 4 toms + 2 surdos + hihat + 2 OH = 13, + voz = 14
    expect(inputList(p)).toHaveLength(14)
    p.items[0].params = { ...p.items[0].params, toms: 0, floors: 0 }
    expect(inputList(p)).toHaveLength(8)
  })
  it('alto-falantes/mics do ampli controlam canais', () => {
    const p = newProject('Teste')
    p.items = [newItem('bass_amp', 1, 1), newItem('guitar_amp', 2, 2)]
    expect(inputList(p).map(r => r.name)).toEqual(['Baixo DI', 'Guitarra'])
    p.items[1].params = { ...p.items[1].params, mics: 2 }
    expect(inputList(p)).toHaveLength(3)
  })
  it('edições, remoção, ordem e canais manuais', () => {
    const p = newProject('Teste')
    p.items = [newItem('vocal', 1, 1), newItem('backing', 2, 2)]
    const rows = inputList(p)
    p.chan.ov[rows[0].key] = { name: 'Lead', mic: 'Beta 87' }
    p.chan.manual.push({ id: 'm1', name: 'Click', source: '', mic: 'DI', stand: '', who: '', phantom: false, note: '' })
    let out = inputList(p)
    expect(out.map(r => r.name)).toEqual(['Lead', 'Backing', 'Click'])
    expect(out[0].mic).toBe('Beta 87'); expect(out[0].edited).toBe(true)
    p.chan.order = [out[2].key, out[0].key, out[1].key]
    out = inputList(p)
    expect(out.map(r => r.ch)).toEqual([1, 2, 3]); expect(out[0].name).toBe('Click')
    p.chan.hidden.push(rows[1].key)
    expect(inputList(p)).toHaveLength(2)
  })
  it('patch lista fixtures (sem treliça/controle) com watts', () => {
    const p = newProject('Teste')
    p.items = [newItem('par64', 1, 1), newItem('truss', 2, 1), newItem('fresnel', 3, 1), newItem('drums', 4, 4)]
    const rows = patchList(p)
    expect(rows).toHaveLength(2)
    expect(rows.reduce((a, r) => a + r.watt, 0)).toBe(2000)
  })
})

describe('migração de seções', () => {
  it('separa Energia e camarim sem perder o texto', () => {
    const p = newProject('T')
    p.sections = [{ id: 'a', title: 'Energia e camarim', body: '3 tomadas 220 V. Camarim com frutas.', required: true, enabled: true }]
    const q = normalize(p)
    expect(q.sections.map(s => s.title)).toEqual(['Energia', 'Camarim'])
    expect(q.sections[0].body).toBe('3 tomadas 220 V.')
    expect(q.sections[1].body).toBe('Camarim com frutas.')
    expect(q.sections[0].id).toBe('a')
  })
})

describe('nome do item do mapa na input list', () => {
  it('item de 1 canal usa o nome dado; bateria nomeada prefixa os canais', () => {
    const p = newProject('x'); p.items = []
    const g = newItem('guitar_amp', 1, 1); g.label = 'Guitarra Rafa'; g.params = { mics: 1, di: false }
    const d = newItem('drums', 2, 2); d.label = 'Bateria Léo'
    p.items.push(g, d)
    const rows = inputList(p)
    expect(rows.find(r => r.itemId === g.id)!.name).toBe('Guitarra Rafa')
    expect(rows.filter(r => r.itemId === d.id).every(r => r.name.startsWith('Bateria Léo · '))).toBe(true)
  })
})

describe('ano de vigência do rider', () => {
  it('novo projeto usa o ano atual; projeto antigo (sem o campo) é migrado; vazio escolhido é mantido', () => {
    const y = String(new Date().getFullYear())
    expect(newProject('X').band.year).toBe(y)
    const old = newProject('Y'); delete (old.band as { year?: string }).year
    expect(normalize(old).band.year).toBe(y)
    const empty = newProject('Z'); empty.band.year = ''
    expect(normalize(empty).band.year).toBe('')
  })
  it('migração não apaga dados salvos de press (foto, bio, links)', () => {
    const p = newProject('W'); p.press.photo = 'data:x'; p.press.bio = 'bio'; p.band.genre = 'Rock'
    const q = normalize(p); expect(q.press.photo).toBe('data:x'); expect(q.press.bio).toBe('bio'); expect(q.band.genre).toBe('Rock')
  })
})
