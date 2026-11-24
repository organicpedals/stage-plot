/**
 * Formatação de texto livre SÓ para o PDF (os dados salvos não mudam). Funções puras, conservadoras, PT-BR e EN.
 * Números, e-mails, URLs, telefones, CNPJ, códigos DMX, modelos de equipamento (SM58, e604, MD421) e texto entre aspas literais
 * são protegidos antes de qualquer regra e devolvidos intactos (as aspas em si viram tipográficas).
 */
export type FmtLang = 'pt' | 'en'
/** para = texto corrido (rider, bio); label = título/rótulo curto; cell = célula de tabela (só espaços e aspas). */
export type FmtKind = 'para' | 'label' | 'cell'
export interface FmtOpts { /** ponto final em linhas de texto corrido sem pontuação (padrão: ligado em 'para') */ period?: boolean }
export interface Block { kind: 'p' | 'li'; text: string; /** marcador da lista: '•' ou '1.' */ marker?: string; /** abre parágrafo novo (linha em branco antes) */ gap: boolean }

export const NBSP = ' '

/** Trechos que nenhuma regra pode tocar. A ordem importa (mais específicos primeiro). */
const PROTECT: RegExp[] = [
  /"[^"\n]{1,200}"/g, // texto entre aspas literais (o conteúdo é preservado)
  /\bhttps?:\/\/[^\s<>"]+|\bwww\.[^\s<>"]+/gi, // URLs
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, // e-mails
  /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, // CNPJ
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,3}\)\s?)?\d{4,5}[\s.-]\d{4}\b/g, // telefones
  /\b(?:DMX|CH|Canal|Channel|Univ(?:erso|erse)?|Ch|Addr)\s?[:#]?\s?\d+(?:[./-]\d+)*\b/gi, // endereços DMX / canais
  /\b0x[0-9a-f]+\b/gi, // hexadecimal
  /\b[A-Za-z]{1,5}-?\d{2,4}[A-Za-z]{0,3}\b/g, // modelos: SM58, e604, MD421, Beta52, KSM32
  /\b[vV]\d+(?:\.\d+)+\b|\b\d+(?:\.\d+){2,}\b/g, // versões e IPs
]

const UNITS = '(?:kHz|Hz|kVA|VA|kW|W|mA|ms|min|dB|kg|mm|cm|m|V)'
/** siglas de áudio: só viram caixa alta quando aparecem isoladas e todas em minúsculas */
const ACRONYMS = ['di', 'pa', 'iem', 'dmx', 'xlr', 'usb', 'midi', 'vst']

export function protect(s: string): { text: string; back: (t: string) => string } {
  const saved: string[] = []
  let text = s
  PROTECT.forEach((re, k) => { text = text.replace(re, m => { saved.push(k === 0 ? `“${m.slice(1, -1)}”` : m); return `\u0001${saved.length - 1}\u0002` }) })
  return { text, back: t => t.replace(/\u0001(\d+)\u0002/g, (_, i) => saved[+i]) }
}

/** Aspas retas -> tipográficas; o conteúdo entre aspas literais fica como está. */
function quotes(s: string): string {
  return s.replace(/"([^"\n]{1,200})"/g, '“$1”')
}

/** Uma linha (sem quebras). */
export function fmtLine(raw: string, lang: FmtLang, kind: FmtKind = 'para', o: FmtOpts = {}): string {
  let s = String(raw ?? '').replace(/[\t   ]/g, ' ').replace(/ {2,}/g, ' ').trim()
  if (!s) return ''
  if (kind === 'cell') return quotes(s)
  const pr = protect(s); s = pr.text
  s = s.replace(/\.{3,}|…/g, '…') // ... -> …
  s = s.replace(/\s*--\s*/g, ' – ').replace(/ [-—] /g, ' – ') // "--" e hífen entre espaços -> travessão curto
  s = s.replace(/\s+([,;!?])/g, '$1').replace(/\s+\.(?!\d)/g, '.') // sem espaço antes de pontuação
  s = s.replace(/([,;!?])(?=[A-Za-zÀ-ÿ])/g, '$1 ') // um espaço depois
  s = s.replace(/(?<=[a-zà-ÿ\d]{2})\.(?=[A-ZÀ-Ý][a-zà-ÿ])/g, '. ')
  s = s.replace(/(\d)\s?[xX]\s?(?=\d)/g, '$1×') // 4x3 -> 4×3
  s = s.replace(new RegExp(`(\\d)\\s?(${UNITS})(?![\\p{L}\\p{N}])`, 'gu'), `$1${NBSP}$2`) // 220V -> 220 V
  s = s.replace(/(?<=[A-Za-zÀ-ÿ])'(?=[A-Za-zÀ-ÿ])/g, '’') // apóstrofo
  s = quotes(s)
  if (kind === 'para' && lang === 'pt') s = s.replace(/(?<![\w.,])(\d{1,3})\.(\d{1,2})(?![\w.])/g, '$1,$2') // 1.5 -> 1,5 (só texto corrido)
  s = s.replace(new RegExp(`(?<![\\p{L}\\p{N}.])(${ACRONYMS.join('|')})(?![\\p{L}\\p{N}])`, 'gu'), m => m.toUpperCase())
  s = s.replace(/\bp\.a\./g, 'P.A.')
  if (lang === 'pt') s = s.replace(/(?<![\p{L}\p{N}.])led(?![\p{L}\p{N}])/gu, 'LED'); else s = s.replace(/\bleds\b/g, 'LEDs')
  if (kind === 'para') {
    s = s.replace(/^([\u0001]?)([a-zà-ÿ])/, (m, a, c) => (a ? m : c.toUpperCase())) // primeira letra maiúscula (não mexe em modelos protegidos)
    const words = s.split(/\s+/).filter(Boolean).length
    const endsToken = /\u0002$/.test(s)
    if ((o.period ?? true) && words >= 4 && !endsToken && /[\p{L}\p{N})]$/u.test(s) && !/[:;]$/.test(s)) s += '.'
  }
  return pr.back(s)
}

const LIST = /^\s*(?:([-*•–·])|(\d{1,2})[.)])\s+(?=\S)/

/** Texto corrido -> blocos: parágrafos e itens de lista uniformes. Linha em branco repetida vira UMA quebra de parágrafo. */
export function fmtBlocks(raw: string, lang: FmtLang, o: FmtOpts = {}): Block[] {
  const out: Block[] = []
  let gap = false
  for (const ln of String(raw ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!ln.trim()) { gap = out.length > 0; continue }
    const m = LIST.exec(ln)
    if (m) {
      const text = fmtLine(ln.slice(m[0].length), lang, 'para', o)
      if (text) out.push({ kind: 'li', text, marker: m[2] ? `${m[2]}.` : '•', gap })
    } else {
      const text = fmtLine(ln, lang, 'para', o)
      if (text) out.push({ kind: 'p', text, gap })
    }
    gap = false
  }
  return out
}

/** Título/rótulo curto: só espaços e aspas, sem ponto final nem mudança de caixa. */
export const fmtLabel = (s: string, lang: FmtLang) => fmtLine(s, lang, 'label')
/** Célula de tabela: só espaços e aspas. */
export const fmtCell = (s: string, lang: FmtLang) => fmtLine(s, lang, 'cell')
/** Bloco -> texto simples (usado em testes e na medição). */
export const blocksText = (b: Block[]) => b.map(x => (x.kind === 'li' ? `${x.marker} ` : '') + x.text).join('\n')
