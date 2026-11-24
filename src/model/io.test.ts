import { describe, expect, it } from 'vitest'
import { exportPayload, parseImport } from './io'
import { newItem, newProject } from './store'

describe('importar / exportar projetos', () => {
  const mk = (n: string) => { const p = newProject(n); p.items.push(newItem('lightstand', 2, 1)); p.items[0].hidden = true; return p }
  it('ida e volta: vários projetos, com ids novos e dados preservados (inclusive itens ocultos)', () => {
    const a = mk('Banda A'), b = mk('Banda B')
    const out = parseImport(JSON.stringify(exportPayload([a, b])))
    expect(out.map(p => p.name)).toEqual(['Banda A', 'Banda B'])
    expect(out[0].id).not.toBe(a.id)
    expect(out[0].items.length).toBe(a.items.length); expect(out[0].items[0].hidden).toBe(true)
    expect(out[0].band.year).toBe(a.band.year)
  })
  it('aceita projeto solto (formato antigo) e lista simples', () => {
    expect(parseImport(JSON.stringify(mk('X')))).toHaveLength(1)
    expect(parseImport(JSON.stringify([mk('X'), mk('Y')]))).toHaveLength(2)
  })
  it('rejeita arquivo inválido com mensagem clara', () => {
    expect(() => parseImport('não é json')).toThrow(/JSON/)
    expect(() => parseImport('{"a":1}')).toThrow(/Nenhum projeto/)
  })
  it('migra projeto antigo sem ano e com palco de outro tamanho', () => {
    const p = JSON.parse(JSON.stringify(mk('Velho'))); delete p.band.year; p.stage = { w: 10, d: 7 }
    const [o] = parseImport(JSON.stringify(p))
    expect(o.stage.w).toBe(16); expect(o.stage.d).toBe(9); expect(o.band.year).toMatch(/^\d{4}$/)
  })
})
