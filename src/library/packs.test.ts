import { beforeAll, describe, expect, it } from 'vitest'
import { defaultParams, ICONS, useIconStyle } from './icons'

const build = (id: string, over: Record<string, string | number | boolean> = {}) => { const d = ICONS.find(i => i.id === id)!; return d.build({ ...defaultParams(d), ...over }) }

describe('pacote D (semi-realista, muda com a configuração)', () => {
  beforeAll(() => useIconStyle.getState().setStyle('D'))
  it('ampli: 1x12 usa o mesmo gabinete do 2x12 (só menos falantes); 4x12 é maior; cabeçote aumenta a altura', () => {
    expect(build('guitar_amp', { speakers: '1' }).w).toBe(build('guitar_amp', { speakers: '2' }).w)
    expect(build('guitar_amp', { speakers: '1' }).svg).not.toBe(build('guitar_amp', { speakers: '2' }).svg)
    expect(build('guitar_amp', { speakers: '4' }).h).toBeGreaterThan(build('guitar_amp', { speakers: '2' }).h)
    expect(build('guitar_amp', { speakers: '4', head: true }).h).toBeGreaterThan(build('guitar_amp', { speakers: '4', head: false }).h)
  })
  it('ampli de baixo: o menor gabinete é o de 4 falantes; 1, 2 e 4 têm o mesmo tamanho, 8 é maior', () => {
    const w = (n: string) => build('bass_amp', { speakers: n })
    expect(w('1').h).toBe(w('4').h); expect(w('2').w).toBe(w('4').w); expect(w('1').svg).not.toBe(w('4').svg); expect(w('8').h).toBeGreaterThan(w('4').h)
  })
  it('bateria: bumbos, tons e surdos alteram o glifo; extras (pratos, banco, chimbal) não são desenhados', () => {
    const base = build('drums', { toms: 2, floors: 1 }).svg
    expect(build('drums', { stool: true, hhmachine: true, kickpedal: true, stands: 6 }).svg).toBe(base)
    expect(build('drums', { toms: 4 }).svg).not.toBe(build('drums', { toms: 1 }).svg)
  })
  it('bateria (tamanho): tons, bumbos e surdos alteram o glifo', () => {
    const a = build('drums', { toms: 1 }), b = build('drums', { toms: 4 })
    expect(b.svg).not.toBe(a.svg)
    expect(build('drums', { kick: 2 }).w).toBeGreaterThan(build('drums', { kick: 1 }).w)
    expect(build('drums', { floors: 2 }).svg).not.toBe(build('drums', { floors: 0 }).svg)
  })
  it('percussão e teclado seguem os parâmetros; só traço (sem preenchimento)', () => {
    expect(build('perc', { pieces: 4 }).w).toBeGreaterThan(build('perc', { pieces: 2 }).w)
    expect(build('keys', { size: '88' }).w).toBeGreaterThan(build('keys', { size: '49' }).w)
    for (const id of ['guitar_amp', 'bass_amp', 'drums', 'perc', 'keys']) expect(build(id).svg).not.toMatch(/fill="\$I"/)
  })
})
