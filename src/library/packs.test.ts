import { beforeAll, describe, expect, it } from 'vitest'
import { defaultParams, ICONS, useIconStyle } from './icons'

const build = (id: string, over: Record<string, string | number | boolean> = {}) => { const d = ICONS.find(i => i.id === id)!; return d.build({ ...defaultParams(d), ...over }) }

describe('pacote D (semi-realista, muda com a configuração)', () => {
  beforeAll(() => useIconStyle.getState().setStyle('D'))
  it('ampli: mais alto-falantes e marca diferente mudam o desenho', () => {
    expect(build('guitar_amp', { speakers: '2' }).w).toBeGreaterThan(build('guitar_amp', { speakers: '1' }).w)
    expect(build('guitar_amp', { brand: 'Marshall' }).svg).not.toBe(build('guitar_amp', { brand: 'Fender' }).svg)
    expect(build('guitar_amp', { speakers: '4', head: true }).h).toBeGreaterThan(build('guitar_amp', { speakers: '4', head: false }).h)
  })
  it('bateria: tons, bumbos e surdos alteram o glifo', () => {
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
