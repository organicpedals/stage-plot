import { describe, expect, it } from 'vitest'
import { blocksText, fmtBlocks, fmtCell, fmtLabel, fmtLine, NBSP } from './textFormat'

const pt = (s: string, o = {}) => fmtLine(s, 'pt', 'para', o)
const en = (s: string) => fmtLine(s, 'en', 'para')

describe('espaço', () => {
  it('apara, colapsa espaços e troca tab/nbsp', () => { expect(pt('  Palco\t\tcom   cobertura\u00A0total  ')).toBe('Palco com cobertura total.') })
  it('sem espaço antes da pontuação e um espaço depois', () => { expect(pt('Traga cabos ,microfones;e pedestais !')).toBe('Traga cabos, microfones; e pedestais!') })
  it('ponto colado a maiúscula ganha espaço', () => { expect(pt('Montagem às 14h.Passagem às 16h.')).toBe('Montagem às 14h. Passagem às 16h.') })
  it('no máximo uma linha em branco entre parágrafos', () => {
    const b = fmtBlocks('Um\n\n\n\nDois', 'pt'); expect(b.map(x => x.gap)).toEqual([false, true])
  })
})

describe('pontuação e tipografia', () => {
  it('aspas retas viram tipográficas (PT e EN)', () => { expect(pt('Chamar de "Noite Alta" no cartaz')).toContain('\u201CNoite Alta\u201D'); expect(en('Called "Late Night" on the poster')).toContain('\u201CLate Night\u201D') })
  it('apóstrofo curvo', () => { expect(en("The band's rider is final today")).toContain('band\u2019s') })
  it('reticências', () => { expect(pt('Aguardar confirmação... depois seguimos')).toContain('\u2026') })
  it('hífen entre espaços e -- viram travessão curto', () => { expect(pt('Som - monitor -- palco principal')).toBe('Som \u2013 monitor \u2013 palco principal.') })
  it('x entre números vira ×', () => { expect(pt('Praticável de 4x3 e outro 2 x 1')).toContain('4\u00D73'); expect(pt('Praticável de 4x3 e outro 2 x 1')).toContain('2\u00D71') })
  it('espaço não separável entre número e unidade', () => {
    expect(pt('Energia 220V estável e 5m de cabo')).toBe(`Energia 220${NBSP}V estável e 5${NBSP}m de cabo.`)
    expect(pt('Peso máximo 15 kg e 48 V fantasma')).toContain(`15${NBSP}kg`)
  })
  it('unidade não casa com início de palavra', () => { expect(pt('Cinco 5 músicos no palco principal')).not.toContain(NBSP) })
  it('vírgula decimal só em PT e só em texto corrido', () => {
    expect(pt('Recuo de 1.5 metros do fundo do palco')).toContain('1,5')
    expect(en('Set back 1.5 meters from the stage edge')).toContain('1.5')
    expect(fmtLabel('Versão 1.5', 'pt')).toContain('1.5')
  })
  it('ponto final em linhas de texto corrido sem pontuação', () => { expect(pt('Preciso de dois pontos de energia')).toBe('Preciso de dois pontos de energia.') })
  it('ponto final: não em rótulos curtos, não com pontuação, desligável', () => {
    expect(pt('Palco coberto')).toBe('Palco coberto')
    expect(pt('Você tem energia no palco?')).toBe('Você tem energia no palco?')
    expect(pt('Preciso de dois pontos de energia', { period: false })).toBe('Preciso de dois pontos de energia')
    expect(fmtLabel('Monitoração e P.A.', 'pt')).toBe('Monitoração e P.A.')
    expect(fmtCell('Beta 52 / D112', 'pt')).toBe('Beta 52 / D112')
  })
})

describe('capitalização', () => {
  it('primeira letra do parágrafo e siglas isoladas', () => { expect(pt('preciso de di e pa com 2 iem para o show')).toBe('Preciso de DI e PA com 2 IEM para o show.') })
  it('P.A. e LED normalizados; led em inglês não', () => {
    expect(pt('p.a. com 4 led de apoio no palco')).toContain('P.A.'); expect(pt('p.a. com 4 led de apoio no palco')).toContain('LED')
    expect(en('The singer led the whole crowd tonight')).toContain('led')
  })
  it('não altera nomes próprios nem palavras que contêm siglas', () => { expect(pt('Paulo e Dimas trazem o piano')).toBe('Paulo e Dimas trazem o piano.'); expect(fmtCell('di ampli', 'pt')).toBe('di ampli') })
})

describe('listas', () => {
  it('marcadores e numeração uniformes, sem linha em branco entre itens', () => {
    const b = fmtBlocks('Itens:\n- um\n* dois\n• três\n\n1) a\n2. b', 'pt')
    expect(b.map(x => `${x.kind}:${x.marker ?? ''}:${x.gap}`)).toEqual(['p::false', 'li:\u2022:false', 'li:\u2022:false', 'li:\u2022:false', 'li:1.:true', 'li:2.:false'])
    expect(blocksText(b)).toContain('\u2022 Um')
  })
  it('traço de sinal negativo não vira lista', () => { expect(fmtBlocks('-5 dB no retorno', 'pt')[0].kind).toBe('p') })
})

describe('segurança', () => {
  const keep = (s: string) => { const out = pt(s); expect(out).toContain(s.trim().replace(/\.$/, '')) }
  it('e-mails, URLs, telefones, CNPJ', () => {
    keep('Contato ana.silva@banda.com.br e www.banda.com/rider')
    keep('Fale em (11) 99999-0000 ou 11 98888 7777 agora mesmo')
    keep('CNPJ 12.345.678/0001-90 da produtora oficial')
    expect(pt('Site https://banda.com/x?a=1.5&b=2x3 confirmado')).toContain('https://banda.com/x?a=1.5&b=2x3')
  })
  it('modelos de equipamento e DMX', () => {
    expect(pt('Microfones sm58 e604 Beta52 MD421 no bumbo')).toContain('sm58 e604 Beta52 MD421')
    expect(pt('Universo DMX 1.2 canal 12 endereço 3.4.1 ok')).toContain('DMX 1.2')
    expect(pt('Universo DMX 1.2 canal 12 endereço 3.4.1 ok')).toContain('3.4.1')
  })
  it('texto entre aspas literais não é tocado (só as aspas)', () => { expect(pt('Cartaz: "a di 4x3 220V"')).toContain('\u201Ca di 4x3 220V\u201D') })
  it('números nunca mudam de valor', () => { expect(pt('Subir 12 cm e 3.250 Hz no palco principal')).toContain('3.250') })
  it('nomes na célula e rótulo ficam como estão', () => { expect(fmtCell('Marina "Mari" Souza', 'pt')).toBe('Marina \u201CMari\u201D Souza'); expect(fmtLabel('dos Santos', 'pt')).toBe('dos Santos') })
})
