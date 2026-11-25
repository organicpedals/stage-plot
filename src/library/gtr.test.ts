import { beforeAll, describe, expect, it } from 'vitest'
import { defaultParams, ICON_MAP, ICONS, useIconStyle } from './icons'

describe('guitarra e baixo', () => {
  beforeAll(() => useIconStyle.setState({ style: 'D' }))
  it('usam o mesmo desenho do violão, sem parâmetros nem canais', () => {
    const ac = ICON_MAP.acoustic.build(defaultParams(ICON_MAP.acoustic))
    for (const id of ['eguitar', 'ebass']) {
      const d = ICON_MAP[id]
      expect(d.params).toHaveLength(0)
      expect(d.channels?.({}, '', (a: string) => a) ?? []).toHaveLength(0)
      expect(d.build({}).svg).toBe(ac.svg)
    }
    expect(ICONS.filter(i => i.id === 'eguitar' || i.id === 'ebass')).toHaveLength(2)
  })
})
