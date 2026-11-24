import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('svg2pdf.js', () => ({ svg2pdf: async () => {} }))
vi.mock('./pdfDoc', async orig => ({ ...(await orig<typeof import('./pdfDoc')>()), cropToRatio: async () => 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=' }))

import { inputList } from '../model/derive'
import { newItem, newProject } from '../model/store'
import { uid } from '../model/types'
import { jsPDF } from 'jspdf'
import { activeParts, PART_ORDER, pdfOmissions } from './parts'
import { STYLE_IDS, STYLES, styleOf } from './pdfStyles'
import { buildDoc, inputColumns, fitInputs } from './pdf'
import { contrast, Doc, lum } from './pdfDoc'
import type { TxtOpts } from './pdfDoc'

const manual = (n: number) => Array.from({ length: n }, (_, i) => ({ id: uid(), name: `Canal extra ${i}`, source: `Fonte ${i}`, mic: 'SM57', stand: 'Girafa', who: 'Marina', phantom: i % 5 === 0, note: i % 7 === 0 ? 'Observação longa sobre este canal em particular' : '' }))

describe('ordem das seções', () => {
  it('é fixa: capa, rider, mapa de palco, input list, mapa de luz, conclusão (sem press kit)', () => {
    expect(PART_ORDER).toEqual(['intro', 'rider', 'stage', 'inputs', 'light', 'outro'])
  })
  it('projeto básico: sem mapa de luz', () => {
    expect(activeParts(newProject('Banda X'))).toEqual(['intro', 'rider', 'stage', 'inputs', 'outro'])
  })
  it('com luz, mantém a ordem e o mapa de luz é o último; press kit preenchido não entra', () => {
    const p = newProject('Banda X')
    p.items.push(newItem('lightstand', 2, 1)); p.press.bio = 'Bio'
    expect(activeParts(p)).toEqual(PART_ORDER); expect(activeParts(p) as string[]).not.toContain('press')
  })
  it('avisa o que falta sem alterar o projeto', () => {
    const p = newProject('Banda X'), before = JSON.stringify(p)
    expect(pdfOmissions(p).length).toBeGreaterThan(0)
    expect(JSON.stringify(p)).toBe(before)
  })
})

describe('input list em uma única página', () => {
  for (const n of [0, 16, 56, 90]) {
    it(`${n} canais manuais: continua na mesma página`, () => {
      const p = newProject('Banda X'); p.chan.manual = manual(n)
      const doc = new Doc(p, STYLES[STYLE_IDS[0]], false)
      doc.y = 40
      fitInputs(doc)
      expect(doc.page).toBe(1)
    })
  }
  for (const n of [0, 40, 90]) {
    it(`${n} canais + saídas com músico + 6 pontos de energia: continua na mesma página`, () => {
      const p = newProject('Banda X'); p.chan.manual = manual(n)
      p.items.filter(i => i.kind === 'wedge').forEach((w, k) => { w.who = `Músico ${k}` })
      for (let k = 0; k < 6; k++) { const a = newItem(k % 2 ? 'strip' : 'ac', 2 + k, 2); a.who = `Pessoa ${k}`; p.items.push(a) }
      const doc = new Doc(p, STYLES[STYLE_IDS[0]], false)
      doc.y = 40
      fitInputs(doc)
      expect(doc.page).toBe(1)
    })
  }
  it('em inglês e P&B também cabe', () => {
    const p = newProject('Band X', 'en'); p.chan.manual = manual(60)
    const doc = new Doc(p, STYLES[STYLE_IDS[0]], true)
    doc.y = 40
    fitInputs(doc)
    expect(doc.page).toBe(1)
  })
})

/** Captura os textos desenhados (com a página em que cada um caiu). */
async function render(p: ReturnType<typeof newProject>, mono = false, style: string = STYLE_IDS[0]) {
  p.pdfStyle = style
  const seen: { t: string; page: number }[] = []
  const svgs: string[] = []
  const spy = vi.spyOn(Doc.prototype, 'txt').mockImplementation(function (this: Doc, t: string) { seen.push({ t: String(t), page: this.page }); return 0 as never })
  const sf = vi.spyOn(Doc.prototype, 'svgFit').mockImplementation(async function (this: Doc, svg: string) { svgs.push(svg); this.mark(this.bottom); return { w: 0, h: 0, x: 0 } })
  try { const doc = await buildDoc(p, { mono }); return { doc, seen, svgs, all: seen.map(s => s.t).join(' | ').toLowerCase() } } finally { spy.mockRestore(); sf.mockRestore() }
}
afterEach(() => vi.restoreAllMocks())

describe('omitir o que não foi informado', () => {
  it('projeto só com nome: sem rótulos, placeholders nem seções vazias', async () => {
    const p = newProject('Banda X'); p.sections.forEach(s => { s.body = '' }); p.chan.manual = []; p.items = []; p.members = []
    const { doc, all } = await render(p)
    for (const l of [doc.L.lineup, doc.L.mgmt, doc.L.access, doc.L.genre, doc.L.origin, doc.L.links, doc.L.bio, doc.L.disc, doc.L.ach, doc.L.req, doc.L.opt]) expect(all).not.toContain(l.toLowerCase())
    for (const ph of ['n/d', 'a definir', 'não informado', '—']) expect(all).not.toContain(ph)
    expect(doc.d.getNumberOfPages()).toBe(2) // capa + conclusão
  })
  it('só alguns campos: aparecem só os preenchidos e a numeração se ajusta', async () => {
    const p = newProject('Banda X'); p.band.genre = 'Rock'; p.band.techPhone = '11 99999-0000'
    p.sections.forEach(s => { s.body = '' }); p.chan.manual = manual(3); p.items = []
    const { doc, all } = await render(p)
    expect(all).toContain('99999'); expect(all).toContain(doc.L.tech.toLowerCase()); expect(all).not.toContain('rock') // gênero não entra no PDF
    expect(all).not.toContain(doc.L.mgmt.toLowerCase()); expect(all).not.toContain(doc.L.origin.toLowerCase())
    expect(all).not.toContain(doc.L.light.toLowerCase())
    expect(activeParts(p)).toEqual(['intro', 'inputs', 'outro'])
    expect(all).toContain('01') // primeira seção numerada é 01 (input list)
    expect(all).not.toContain('04') // só 2 seções numeradas (a conclusão não é numerada)
  })
  it('coluna da input list sem nenhum valor é omitida', () => {
    const p = newProject('Banda X'); p.items = []; p.chan.manual = manual(4).map(c => ({ ...c, stand: '' }))
    const doc = new Doc(p, STYLES[STYLE_IDS[0]], false)
    const { cols } = inputColumns(inputList(p), doc.L, 1)
    expect(cols.map(c => c.h)).not.toContain(doc.L.stand)
  })
})

/** projeto cheio com imprensa longa (várias páginas) */
const longPress = () => {
  const p = newProject('Banda X'); p.chan.manual = manual(20); p.band.genre = 'Rock'; p.items.push(newItem('lightstand', 2, 1))
  p.sections.forEach((s, i) => { s.enabled = true; s.body = `RIDERBODY${i} ` + 'texto do rider '.repeat(40) })
  p.press.bio = 'Biografia longa da banda. '.repeat(260); p.press.achievements = 'Conquista importante. '.repeat(120)
  return p
}

describe('layout compacto', () => {
  const full = () => {
    const p = newProject('Banda X'); p.chan.manual = manual(20); p.band.genre = 'Rock'
    p.sections.forEach((s, i) => { s.enabled = true; s.body = `RIDERBODY${i} ` + 'texto do rider '.repeat(40) })
    p.items.push(newItem('lightstand', 2, 1)); p.press.bio = 'Biografia '.repeat(60)
    return p
  }
  it('o Rider começa na página 2, nunca na 1', async () => {
    const { seen } = await render(full())
    const pages = seen.filter(s => s.t.includes('RIDERBODY')).map(s => s.page)
    expect(pages.length).toBeGreaterThan(0)
    expect(Math.min(...pages)).toBe(2)
  })
  it('nenhuma página (exceto a primeira e a última) termina com mais de 40% vazio', async () => {
    const { doc } = await render(full())
    const n = doc.d.getNumberOfPages()
    for (let i = 2; i < n; i++) {
      if (doc.pages[i - 1].part === 'rider' && doc.pages[i].part !== 'rider') continue // última página do rider pode ser curta
      const { H } = doc.dims[i - 1], filled = doc.fillY[i] ?? 0
      expect((H - 18 - filled) / H, `página ${i}`).toBeLessThanOrEqual(0.4)
    }
  })
})

describe('mapas, dimensões e saídas', () => {
  const rich = () => { const p = newProject('Banda X'); p.items.push(newItem('lightstand', 2, 1)); p.chan.manual = manual(8); return p }
  it('dimensões do palco não aparecem em lugar nenhum do PDF', async () => {
    const p = rich(); p.stage.w = 7.5; p.stage.d = 4.25
    const { all, svgs } = await render(p)
    expect(svgs.length).toBe(2)
    for (const t of [all, ...svgs.map(x => x.toLowerCase())]) { expect(t).not.toMatch(/\d+([.,]\d+)?\s*[×x]\s*\d+([.,]\d+)?\s*m/) }
    expect(all).not.toContain('7.5'); expect(all).not.toContain('4.25')
  })
  it('página de mapa tem só o desenho: sem legenda nem régua', async () => {
    const { svgs } = await render(rich())
    for (const s of svgs) { expect(s).not.toContain('1 m'); expect(s).not.toMatch(/>\d+× /) }
  })
  it('saídas (monitores) ficam na mesma página da input list', async () => {
    const { doc, seen } = await render(rich())
    const inPage = seen.find(s => s.t.toLowerCase() === doc.L.outputs.toLowerCase())
    const listPage = seen.find(s => s.t.toLowerCase() === 'canal extra 0')?.page
    expect(inPage).toBeTruthy(); expect(inPage!.page).toBe(listPage)
  })
  it('sem monitores/mixes, a seção de saídas some', async () => {
    const p = rich(); p.items = p.items.filter(i => !['wedge', 'sidefill', 'iem'].includes(i.kind))
    const { all, doc } = await render(p)
    expect(all).not.toContain(doc.L.outputs.toLowerCase())
  })
})

describe.each(STYLE_IDS)('modelo %s', style => {
  const rich = () => { const p = newProject('Banda X'); p.items.push(newItem('lightstand', 2, 1)); p.chan.manual = manual(30); p.band.genre = 'Rock'; p.band.tagline = 'Frase de efeito'; p.press.bio = 'Bio longa. '.repeat(30); p.press.photo = 'data:image/jpeg;base64,AAAA'; p.sections.forEach((s, i) => { s.enabled = true; s.body = `RIDERBODY${i} ` + 'texto do rider '.repeat(30) }); return p }
  it('mantém a ordem e uma página por mapa e input list, com rider a partir da 2', async () => {
    const { seen, doc } = await render(rich(), false, style)
    const parts = doc.pages.map(p => p.part), at = (k: string) => parts.map((x, i) => (x === k ? i + 1 : 0)).filter(Boolean)
    const first = (k: string) => at(k)[0]
    expect(parts[0]).toBe('intro')
    expect(Math.min(...seen.filter(s => s.t.includes('RIDERBODY')).map(s => s.page))).toBeGreaterThanOrEqual(2)
    expect(first('rider')).toBe(2)
    expect(at('stage').length).toBe(1); expect(at('inputs').length).toBe(1); expect(at('light').length).toBe(1)
    expect(first('rider')).toBeLessThan(first('stage')); expect(first('stage')).toBeLessThan(first('inputs')); expect(first('inputs')).toBeLessThan(first('light'))
    expect(parts).not.toContain('press'); expect(parts[parts.length - 1]).toBe('outro'); expect(parts[parts.length - 2]).toBe('light')
    expect(seen.find(s => /Canal extra 29/.test(s.t))?.page).toBe(first('inputs')) // input list completa na mesma página
    expect(seen.find(s => s.t.toLowerCase() === doc.L.outputs.toLowerCase())?.page).toBe(first('inputs')) // saídas na mesma página
    expect(doc.dims[first('stage') - 1].W).toBeGreaterThan(doc.dims[first('stage') - 1].H) // mapa em página paisagem
  })
  it('foto só na primeira página', async () => {
    const pages: number[] = []
    const spy = vi.spyOn(jsPDF.API as unknown as { addImage: () => void }, "addImage").mockImplementation(function (this: jsPDF) { pages.push(this.getCurrentPageInfo().pageNumber); return this as never })
    try { const { doc } = await render(rich(), false, style); expect(doc.d.getNumberOfPages()).toBeGreaterThan(2); expect(pages.length).toBeGreaterThan(0); for (const pg of pages) expect(pg).toBe(1) } finally { spy.mockRestore() }
  })
  it('sem foto cadastrada, não desenha imagem', async () => {
    const p = rich(); p.press.photo = ''
    const spy = vi.spyOn(jsPDF.API as unknown as { addImage: () => void }, "addImage").mockImplementation(function (this: jsPDF) { return this as never })
    try { await render(p, false, style); expect(spy).not.toHaveBeenCalled() } finally { spy.mockRestore() }
  })
  it('projeto mínimo: 1 página sem rótulos de campos vazios (cor e P&B)', async () => {
    for (const mono of [false, true]) {
      const p = newProject('Banda X'); p.sections.forEach(s => { s.body = '' }); p.chan.manual = []; p.items = []; p.members = []
      const { doc, all } = await render(p, mono, style)
      for (const l of [doc.L.lineup, doc.L.mgmt, doc.L.access, doc.L.genre, doc.L.links, doc.L.bio, doc.L.req]) expect(all).not.toContain(l.toLowerCase())
      expect(doc.d.getNumberOfPages()).toBe(2) // capa + conclusão
    }
  })
  it('sem dimensões do palco no texto', async () => {
    const p = rich(); p.stage.w = 7.5; p.stage.d = 4.25
    const { all } = await render(p, true, style)
    expect(all).not.toMatch(/\d+([.,]\d+)?\s*[×x]\s*\d+([.,]\d+)?\s*m/)
  })
})

describe('modelos e formatação de texto', () => {
  it('modelo antigo ou desconhecido cai no primeiro modelo', () => {
    for (const id of ['credential', 'neonbook', 'gignight', 'brutalposter', 'rockfestclean', 'swiss', 'cards', 'spec', 'type', '', undefined]) expect(styleOf({ pdfStyle: id }).id).toBe(STYLE_IDS[0])
  })
  it('cada modelo tem contraste >= 4,5:1 para texto, apoio e acento sobre o papel', () => {
    for (const id of STYLE_IDS) { const t = STYLES[id].theme; for (const c of [t.fg, t.muted, t.accent]) expect(contrast(c, t.bg), `${id} ${c}`).toBeGreaterThanOrEqual(4.5) }
  })
  it('cada modelo tem contraste >= 4,5:1 também no tema alternativo (escuro)', () => {
    for (const id of STYLE_IDS) { const t = STYLES[id].altTheme; if (!t) continue; for (const c of [t.fg, t.muted, t.accent]) expect(contrast(c, t.bg), `${id} alt ${c}`).toBeGreaterThanOrEqual(4.5) }
  })
  const dk = (t: { bg: string }) => lum(t.bg) < 0.3
  it.each(['rockfest', 'sidebar'])('%s: só a capa e a conclusão (última) são escuras; as demais, claras', async id => {
    const { doc } = await render(longPress(), false, id)
    const n = doc.pageTh.length; expect(n).toBeGreaterThan(3)
    doc.pageTh.forEach((t, i) => expect(dk(t), `página ${i + 1}`).toBe(i === 0 || i === n - 1))
    expect(doc.pages[n - 1].part).toBe('outro'); expect(doc.pages[n - 2].part).toBe('light')
  })
  describe('Sidebar: mesma capa e mesma paleta do Rock Fest', () => {
    it('usa exatamente os temas do Rock Fest (claro e escuro)', () => {
      expect(STYLES.sidebar.theme).toEqual(STYLES.rockfest.theme); expect(STYLES.sidebar.altTheme).toEqual(STYLES.rockfest.altTheme)
    })
    it('barra lateral e seu texto têm contraste >= 4,5:1', () => {
      expect(contrast('#6F6620', '#FFFFFF')).toBeGreaterThanOrEqual(4.5); expect(contrast('#6F6620', '#EDEAD8')).toBeGreaterThanOrEqual(4.5)
    })
    const proj = (style: string) => {
      const p = newProject('Banda Teste'); p.pdfStyle = style
      Object.assign(p.band, { genre: 'Rock', origin: 'Campinas', tagline: 'Frase unica', techName: 'Ana Lima', techPhone: '11 90000-0000', techEmail: 'ana@banda.com' })
      p.members = [{ id: uid(), name: 'Carlos Guitarra', role: 'Guitarra' }]; p.press.photo = 'data:image/jpeg;base64,AAAA'; p.press.bio = 'Biografia.'
      p.items.push(newItem('lightstand', 2, 1)); p.sections.forEach((x, i) => { x.enabled = true; x.body = `RIDERBODY${i} texto` })
      return p
    }
    it('página 1 do Sidebar é idêntica à do Rock Fest em conteúdo e imagem', async () => {
      const rec = async (style: string) => {
        const calls: unknown[][] = []
        const spy = vi.spyOn(jsPDF.API as unknown as { addImage: () => void }, 'addImage').mockImplementation(function (this: jsPDF, ...a: unknown[]) { if (this.getCurrentPageInfo().pageNumber === 1) calls.push(a.slice(2, 6)); return this as never })
        try { const r = await render(proj(style), false, style); return { texts: r.seen.filter(x => x.page === 1).map(x => x.t), calls, doc: r.doc } } finally { spy.mockRestore() }
      }
      const a = await rec('sidebar'), b = await rec('rockfest')
      expect(a.texts).toEqual(b.texts); expect(a.calls).toEqual(b.calls); expect(a.calls[0]).toEqual([0, 0, 210, 297])
      expect(a.doc.pageTh[0]).toEqual(b.doc.pageTh[0])
      const t = a.texts.join(' ').toLowerCase(); expect(t).not.toContain('campinas'); expect(t).not.toContain('carlos')
    })
    it('mesmo esquema de temas por página que o Rock Fest, inclusive em P&B', async () => {
      for (const mono of [false, true]) {
        const a = (await render(longPress(), mono, 'sidebar')).doc, b = (await render(longPress(), mono, 'rockfest')).doc
        expect(a.pageTh.map(t => t.bg)).toEqual(b.pageTh.map(t => t.bg))
      }
    })
    it('página 2: o Rider começa direto, sem bloco de contato (os contatos estão só na capa)', async () => {
      const { seen, doc } = await render(proj('sidebar'), false, 'sidebar')
      expect(doc.pages[1].part).toBe('rider')
      const p2 = seen.filter(x => x.page === 2).map(x => x.t.toLowerCase()).join(' | ')
      for (const t of ['contato', 'coordenador técnico', 'produtor', 'ana lima', 'ana@banda.com', 'carlos', 'campinas', 'frase unica', 'rock']) expect(p2, t).not.toContain(t)
      expect(p2).toContain('riderbody0')
    })
  })
  describe('Rock Fest: capa sóbria e página 2', () => {
    const rf = () => {
      const p = newProject('Banda Teste'); p.pdfStyle = 'rockfest'
      Object.assign(p.band, { genre: 'Rock', origin: 'Campinas', tagline: 'Frase de apresentacao unica', techName: 'Ana Lima', techPhone: '11 90000-0000', techEmail: 'ana@banda.com', mgmtName: 'Beto Prod', mgmtPhone: '11 98888-7777' })
      p.members = [{ id: uid(), name: 'Carlos Guitarra', role: 'Guitarra' }]
      p.press.photo = 'data:image/jpeg;base64,AAAA'; p.press.bio = 'Biografia curta.'; p.items.push(newItem('lightstand', 2, 1))
      p.sections.forEach((x, i) => { x.enabled = true; x.body = `RIDERBODY${i} texto` })
      return p
    }
    const imgs = async (p: ReturnType<typeof rf>) => {
      const calls: { page: number; a: unknown[] }[] = []
      const spy = vi.spyOn(jsPDF.API as unknown as { addImage: () => void }, 'addImage').mockImplementation(function (this: jsPDF, ...a: unknown[]) { calls.push({ page: this.getCurrentPageInfo().pageNumber, a }); return this as never })
      try { const r = await render(p, false, 'rockfest'); return { ...r, calls } } finally { spy.mockRestore() }
    }
    it('página 1: foto em sangria total, nome e contatos; nada mais', async () => {
      const { seen, calls, doc } = await imgs(rf())
      const p1 = seen.filter(x => x.page === 1).map(x => x.t).join(' | ').toLowerCase()
      for (const t of ['banda teste', 'ana lima', '11 90000-0000', 'ana@banda.com', 'beto prod', '11 98888-7777']) expect(p1, t).toContain(t)
      for (const t of ['frase de apresentacao', 'rock', 'campinas', 'carlos', 'guitarra', doc.L.lineup.toLowerCase(), 'versão', 'version', '01 / ']) expect(p1, t).not.toContain(t)
      const c1 = calls.find(c => c.page === 1)!; expect(c1.a.slice(2, 6)).toEqual([0, 0, 210, 297])
    })
    it('capa em ordem: RIDER TÉCNICO, nome, ano de vigência e contatos; ano vazio omite a linha; EN', async () => {
      const order = async (p: ReturnType<typeof rf>, mono = false) => (await render(p, mono, 'rockfest')).seen.filter(x => x.page === 1).map(x => x.t)
      const p = rf(); p.band.year = '2031'
      const a = await order(p), at = (t: string) => a.findIndex(x => x.toUpperCase() === t)
      expect(at('RIDER TÉCNICO')).toBeGreaterThanOrEqual(0)
      expect(at('RIDER TÉCNICO')).toBeLessThan(at('BANDA TESTE')); expect(at('BANDA TESTE')).toBeLessThan(at('2031')); expect(at('2031')).toBeLessThan(at('COORDENADOR TÉCNICO'))
      const q = rf(); q.band.year = ''; expect((await order(q)).some(x => /^\d{4}$/.test(x))).toBe(false)
      const e = rf(); e.lang = 'en'; e.band.year = '2031'
      const en = await order(e); expect(en).toContain('TECHNICAL RIDER'); expect(en).toContain('2031'); expect(en.map(x => x.toUpperCase())).toContain('PRODUCER')
      const m = await order(p, true); expect(m).toContain('2031')
    })
    it('página 1 sem foto: fundo escuro liso, nome e contatos, sem imagem', async () => {
      const p = rf(); p.press.photo = ''
      const { seen, calls, doc } = await imgs(p)
      expect(calls.filter(c => c.page === 1)).toHaveLength(0); expect(dk(doc.pageTh[0])).toBe(true)
      const p1 = seen.filter(x => x.page === 1).map(x => x.t).join(' | ').toLowerCase()
      expect(p1).toContain('banda teste'); expect(p1).toContain('ana lima'); expect(p1).not.toContain('campinas')
    })
    it('p.2: Rider direto, sem bloco Contato nem bloco sobre a banda', async () => {
      const { seen, doc } = await imgs(rf())
      expect(doc.pages[1].part).toBe('rider')
      const p2 = seen.filter(x => x.page === 2).map(x => x.t.toLowerCase()).join(' | ')
      for (const t of ['contato', 'coordenador técnico', 'produtor', 'ana lima', 'beto prod', '11 98888-7777', 'frase de apresentacao', 'rock', 'campinas', 'carlos', 'press kit', 'biografia', 'versão']) expect(p2, t).not.toContain(t)
      expect(p2).toContain('rider técnico'); expect(p2).toContain('riderbody0')
    })
    it('capa: nome em CAIXA ALTA brutalista (condensado, fill+stroke) e tudo centralizado', async () => {
      const calls: { t: string; x: number; o: Record<string, unknown>; page: number }[] = []
      const spy = vi.spyOn(Doc.prototype, 'txt').mockImplementation(function (this: Doc, t: string, x: number, _y: number, o: TxtOpts = {}) { calls.push({ t: String(t), x, o: o as Record<string, unknown>, page: this.page }); return 0 as never })
      try {
        const p = rf(); p.press.photo = ''; p.band.name = 'Banda Teste'; p.items = []; p.chan.manual = []; p.sections.forEach(x => { x.body = '' })
        const doc = (await buildDoc(p, { mono: false }))
        const c1 = calls.filter(c => c.page === 1)
        const name = c1.find(c => c.t === 'BANDA TESTE')!; expect(name, 'nome em caixa alta').toBeTruthy()
        expect(name.o.heavy).toBeGreaterThan(0); expect(name.o.tz).toBeLessThan(1); expect(name.o.align).toBe('center'); expect(name.x).toBe(doc.W / 2)
        for (const c of c1) expect(c.o.align, c.t).toBe('center') // todo o texto da capa é centralizado
        const mids = c1.filter(c => /ANA LIMA|11 90000|ANA@BANDA|BETO PROD/i.test(c.t)).map(c => c.x)
        expect(mids.length).toBeGreaterThan(2); expect(Math.min(...mids) + Math.max(...mids)).toBeCloseTo(doc.W, 3) // simétrico em torno do centro
      } finally { spy.mockRestore() }
    })
    it('nome longo: quebra em até 2 linhas dentro da largura útil, em caixa alta', async () => {
      const p = rf(); p.band.name = 'Orquestra Sinfônica Experimental do Planalto Central'
      const { seen } = await imgs(p)
      const lines = seen.filter(x => x.page === 1 && /^[A-ZÀ-Ý ]+$/.test(x.t) && /ORQUESTRA|SINF|PLANALTO|CENTRAL|EXPERIMENTAL/.test(x.t))
      expect(lines.length).toBeGreaterThanOrEqual(1); expect(lines.length).toBeLessThanOrEqual(2)
    })
    it('capa com os rótulos exatos "Coordenador Técnico" e "Produtor"; sem press kit em nenhuma página', async () => {
      const { seen } = await imgs(rf())
      const p1 = seen.filter(x => x.page === 1).map(x => x.t.toLowerCase())
      expect(p1).toContain('coordenador técnico'); expect(p1).toContain('produtor')
      expect(seen.map(x => x.t.toLowerCase()).join(' | ')).not.toMatch(/press kit|biografia|discografia|destaques/)
    })
    it('sem Rider, não cria página extra de contato (a capa já tem os contatos)', async () => {
      const p = rf(); p.sections.forEach(x => { x.body = '' })
      const { doc } = await imgs(p)
      expect(doc.pages.filter(x => x.part === 'intro')).toHaveLength(1)
    })
    it('sem texturas, losangos, caixas, contornos nem molduras', async () => {
      const p = rf(); p.press.shortBio = 'Resumo.'
      const pdf = (await render(p, false, 'rockfest')).doc.d.output()
      expect(pdf).not.toMatch(/\n\d Tr\n/) // texto vazado (contorno)
      expect(pdf).not.toMatch(/ c\n/) // curvas (veios)
      expect(pdf).not.toMatch(/ re\n(S|B|s|b)\n/) // retângulos só com contorno (caixas)
      expect(pdf).not.toMatch(/ h\n(f|S|B)\n/) // polígonos fechados (losangos)
    })
  })
  it.each(['rockfest', 'sidebar'])('%s em P&B: capa e conclusão pretas, as demais brancas', async id => {
    const { doc } = await render(longPress(), true, id)
    doc.pageTh.forEach((t, i) => expect(t.bg, `página ${i + 1}`).toBe(i === 0 || i === doc.pageTh.length - 1 ? '#111111' : '#FFFFFF'))
  })
  it('Rock Fest: texto legível (>= 4,5:1) no tema claro, no escuro e no cobre/oliva sobre cada fundo', () => {
    const l = STYLES.rockfest.theme, d = STYLES.rockfest.altTheme!
    for (const t of [l, d]) for (const c of [t.fg, t.muted, t.accent, t.audio]) expect(contrast(c, t.bg), c).toBeGreaterThanOrEqual(4.5)
  })
  it.each(STYLE_IDS)('%s: aplica a formatação só no PDF e não altera o projeto', async style => {
    const p = newProject('Banda X'); p.sections.forEach(s => { s.enabled = true; s.body = '' }); p.sections[0].body = 'palco de 4x3 m ,energia 220V no palco'
    p.pdfStyle = style; const before = JSON.stringify(p)
    const { all } = await render(p, false, style)
    expect(all).toContain('4×3 m'); expect(all).toContain('220 v')
    expect(JSON.stringify(p)).toBe(before)
  })
  it.each(STYLE_IDS)('%s: P&B usa só preto, branco e cinza', async style => {
    const doc = (await render(newProject('Banda X'), true, style)).doc
    expect(doc.mono).toBe(true); expect(['#000000', '#FFFFFF']).toContain(doc.th.accent)
  })
})

describe('página de conclusão', () => {
  it.each(['rockfest', 'sidebar'])('%s: última página escura repete os dados da capa, sem foto', async id => {
    const p = newProject('Banda Teste'); p.pdfStyle = id
    Object.assign(p.band, { techName: 'Ana Lima', techPhone: '11 90000-0000', mgmtName: 'Beto Souza', year: '2026' }); p.press.photo = 'data:image/jpeg;base64,AAAA'
    const spy = vi.spyOn(jsPDF.API as unknown as { addImage: () => void }, 'addImage').mockImplementation(function (this: jsPDF) { return this as never })
    try {
      const { doc, seen } = await render(p, false, id), n = doc.d.getNumberOfPages()
      expect(doc.pages[n - 1].part).toBe('outro')
      const last = seen.filter(x => x.page === n).map(x => x.t.toLowerCase()).join(' | '), first = seen.filter(x => x.page === 1).map(x => x.t.toLowerCase()).join(' | ')
      for (const t of ['ana lima', 'beto souza', '2026', 'banda teste']) { expect(first).toContain(t); expect(last).toContain(t) }
      expect(spy.mock.calls.length).toBe(1) // foto só na capa
    } finally { spy.mockRestore() }
  })
})
