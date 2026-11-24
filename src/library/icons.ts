import { create } from 'zustand'
import type { Board, Item, Lang } from '../model/types'
import { PACKS, packSvg } from './packs'
import { DYN } from './packs-dyn'

/* Estilo "contorno suave", minimalista: vista de cima, poucas peças que aludem ao objeto,
   preenchimento translúcido e um ponto de destaque (ciano no áudio, âmbar na luz).
   O desenho NÃO muda com os parâmetros; eles alimentam a input list e a legenda (spec).
   Unidade = centímetros. Tokens: $I = tinta, $A = destaque, $W(k) = espessura de traço / k. */

export type Pv = number | boolean | string
export type Params = Record<string, Pv>

export interface ParamDef {
  key: string
  type: 'num' | 'bool' | 'sel' | 'text'
  label: { pt: string; en: string }
  def: Pv
  min?: number; max?: number; step?: number
  opts?: string[]
}
/** kid: sufixo estável da chave do canal (edições/ordem não se deslocam quando canais são inseridos antes dele). */
export interface Chan { name: string; mic: string; stand: string; phantom?: boolean; kid?: string }
export interface Built { w: number; h: number; svg: string }
type Tr = (pt: string, en: string) => string

export interface IconDef {
  id: string
  label: { pt: string; en: string }
  cat: 'inst' | 'amp' | 'vox' | 'mon' | 'foh' | 'misc' | 'pa' | 'power' | 'light' | 'fixture' | 'moving' | 'led' | 'effect' | 'rig'
  board: Board
  params: ParamDef[]
  build: (P: Params) => Built
  channels?: (P: Params, base: string, t: Tr) => Chan[]
  spec?: (P: Params, t: Tr) => string
}

// ---------- primitivas ----------
const rr = (x: number, y: number, w: number, h: number, r = 4, o = 0.1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="$I" fill-opacity="${o}"/>`
const ci = (x: number, y: number, r: number, o = 0.1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="$I" fill-opacity="${o}"/>`
const ring = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke-width="$W(1.8)" opacity=".6"/>`
const dotA = (x: number, y: number, r = 2.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="$A" stroke="none"/>`
const ln = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="$W(1.8)" opacity=".7"/>`
const pa = (d: string, o = 0.1) => `<path d="${d}" fill="$I" fill-opacity="${o}"/>`
const pl = (d: string) => `<path d="${d}" fill="none" stroke-width="$W(1.8)" opacity=".7"/>`
const bolt = (cx: number, cy: number, s = 1) => `<path d="M${cx + 3 * s} ${cy - 11 * s} L${cx - 7 * s} ${cy + 2 * s} H${cx - s} L${cx - 3 * s} ${cy + 11 * s} L${cx + 7 * s} ${cy - 3 * s} H${cx + s} Z" fill="$A" stroke="none"/>`
const mk = (w: number, h: number, svg: string): Built => ({ w, h, svg })
/** Tambor em vista de cima: casco + aro interno + ponto de destaque. */
const drum = (x: number, y: number, r: number, o = 0.1) => ci(x, y, r, o) + ring(x, y, r * 0.55) + dotA(x, y, Math.max(1.8, r * 0.16))
/** Alto-falante: cone + aro + ponto de destaque. */
const spk = (x: number, y: number, r: number) => ci(x, y, r, 0.08) + ring(x, y, r * 0.5) + dotA(x, y, Math.max(1.8, r * 0.18))

// ---------- estilo global dos ícones ----------
export type IconStyle = 'S' | 'P' | 'F' | 'R' | 'D'
/** Estilo único: semi-realista (contorno, muda com a configuração). */
export const useIconStyle = create<{ style: IconStyle }>(() => ({ style: 'D' }))
const curStyle = () => useIconStyle.getState().style

/** Pacotes de ícones sobre o mesmo desenho:
 *  P (Apple / SF Symbols): traço mais firme com pontas arredondadas, camada primária opaca + secundária translúcida
 *    ("hierárquico"), cantos mais suaves (squircle), selo de destaque cheio.
 *  F (Figma): só contorno fino de 1,5 px, cantos quase retos, pontas retas e os pontos de destaque viram
 *    âncoras de vetor (quadradinho branco com contorno colorido). */
export function paint(svg: string, ink: string, accent: string, sw: number, style: IconStyle = curStyle()): string {
  let wrap = ''
  const pk = svg.includes('data-pk') // glifo dos pacotes: já desenhado no estilo certo, só resolve os tokens
  if (style === 'P') {
    sw *= pk ? 1.2 : 1.25; wrap = 'stroke-linecap="round" stroke-linejoin="round"'
    if (!pk) svg = svg
      .replace(/fill="\$I" fill-opacity="([\d.]+)"/g, (_m, o) => `fill="$I" fill-opacity="${Math.min(0.24, Number(o) * 1.6 + 0.04).toFixed(2)}"`)
      .replace(/(?<!-)opacity="0?\.[67]"/g, 'opacity="1"')
      .replace(/rx="([\d.]+)"/g, (_m, r) => `rx="${(Number(r) * 1.7).toFixed(2)}"`)
  } else if (style === 'R' || style === 'D') {
    wrap = 'stroke-linecap="round" stroke-linejoin="round"' // glifos realistas (packs-real.ts) já vêm prontos; itens sem glifo seguem a base
  } else if (style === 'F') {
    sw *= pk ? 1 : 0.8; wrap = 'stroke-linecap="butt" stroke-linejoin="miter"'
    if (!pk) svg = svg
      .replace(/fill="\$I" fill-opacity="[\d.]+"/g, 'fill="none"')
      .replace(/(?<!-)opacity="0?\.[67]"/g, 'opacity="1"')
      .replace(/rx="([\d.]+)"/g, (_m, r) => `rx="${Math.min(1.5, Number(r) * 0.4).toFixed(2)}"`)
      .replace(/<circle cx="([\d.-]+)" cy="([\d.-]+)" r="([\d.]+)" fill="\$A" stroke="none"\/>/g, (_m, x, y, r) => {
        const h = Number(r) + 0.7
        return `<rect x="${(Number(x) - h).toFixed(2)}" y="${(Number(y) - h).toFixed(2)}" width="${(h * 2).toFixed(2)}" height="${(h * 2).toFixed(2)}" fill="#FFFFFF" stroke="$A" stroke-width="$W(1.1)"/>`
      })
      .replace(/<rect ([^>]*?)fill="\$A" stroke="none"\/>/g, '<rect $1fill="#FFFFFF" stroke="$A" stroke-width="$W(1.1)"/>')
  }
  if (style === 'D' && pk) svg = svg.replace(/fill="none"/g, 'fill="$I" fill-opacity=".07"') // preenchimento cinza bem clarinho
  svg = svg.replace(/\$W\(([\d.]+)\)/g, (_m, k) => (sw / Number(k)).toFixed(3)).replace(/\$I/g, ink).replace(/\$A/g, accent)
  return wrap ? `<g ${wrap}>${svg}</g>` : svg
}

// ---------- parâmetros ----------
const num = (key: string, pt: string, en: string, def: number, min: number, max: number, step = 1): ParamDef => ({ key, type: 'num', label: { pt, en }, def, min, max, step })
const bool = (key: string, pt: string, en: string, def: boolean): ParamDef => ({ key, type: 'bool', label: { pt, en }, def })
const sel = (key: string, pt: string, en: string, def: string, opts: string[]): ParamDef => ({ key, type: 'sel', label: { pt, en }, def, opts })
const text = (key: string, pt: string, en: string, def = ''): ParamDef => ({ key, type: 'text', label: { pt, en }, def })
const lightCommon = (watt: number): ParamDef[] => [num('watt', 'Potência (W)', 'Power (W)', watt, 0, 5000, 10), text('gel', 'Gelatina / cor', 'Gel / color', ''), sel('mount', 'Posição', 'Mount', 'Aéreo', ['Aéreo', 'Chão'])]
const N = (P: Params, k: string) => Number(P[k])
const B = (P: Params, k: string) => P[k] === true || P[k] === 'true'
const S = (P: Params, k: string) => String(P[k] ?? '')
const lightSpec = (P: Params) => [S(P, 'mount'), N(P, 'watt') ? `${N(P, 'watt')} W` : '', S(P, 'gel')].filter(Boolean).join(' · ')

// ---------- desenhos (minimalistas, fixos) ----------
const ART = {
  drums: mk(110, 100, ci(55, 68, 28, 0.14) + ring(55, 68, 12) + dotA(55, 68, 3.4) + drum(88, 30, 15) + drum(20, 38, 12)),
  perc: mk(86, 56, drum(26, 30, 20) + drum(66, 36, 15)),
  keys: mk(120, 34, rr(0, 0, 120, 34, 5) + [24, 36, 48, 60, 72, 84, 96, 108].map(x => ln(x, 14, x, 34)).join('') + [30, 54, 78, 102].map(x => `<rect x="${x - 3}" y="14" width="6" height="12" rx="1.5" fill="$I" fill-opacity=".5" stroke="none"/>`).join('') + dotA(110, 7, 2.2)),
  piano: mk(90, 80, pa('M4 4 H50 Q86 4 86 30 Q86 54 56 60 L44 76 H4 Z') + ln(4, 60, 44, 60) + dotA(62, 30, 2.6)),
  guitarAmp: mk(70, 36, rr(0, 0, 70, 36, 5, 0.12) + spk(35, 20, 12) + dotA(54, 6, 1.8) + dotA(62, 6, 1.8)),
  bassAmp: mk(60, 70, rr(0, 0, 60, 70, 5, 0.12) + spk(30, 20, 12) + spk(30, 50, 12)),
  acoustic: mk(44, 70, rr(19, 2, 6, 24, 1.5, 0.12) + pa('M22 24 C32 24 36 32 31 38 C40 42 40 58 32 64 C27 68 17 68 12 64 C4 58 4 42 13 38 C8 32 12 24 22 24 Z') + ring(22, 48, 5) + dotA(22, 48, 1.8)),
  horn: mk(70, 36, pa('M44 6 L68 0 V36 L44 30 Z', 0.12) + pl('M44 12 H12 Q4 12 4 18 Q4 24 12 24 H44') + dotA(8, 18, 2.2)),
  strings: mk(40, 70, rr(17, 2, 6, 24, 1.5, 0.12) + pa('M20 24 C30 20 33 32 28 40 C36 46 36 60 26 65 C22 67 18 67 14 65 C4 60 4 46 12 40 C7 32 10 20 20 24 Z') + dotA(20, 52, 2.2)),
  dj: mk(120, 50, rr(0, 0, 120, 50, 5) + drum(30, 25, 17, 0.12) + drum(90, 25, 17, 0.12) + ln(60, 10, 60, 40)),
  laptop: mk(46, 40, rr(6, 0, 34, 4, 1.5, 0.16) + rr(0, 6, 46, 34, 4) + ln(6, 16, 40, 16) + ln(6, 22, 40, 22) + rr(16, 28, 14, 7, 2, 0.12) + dotA(23, 31.5, 1.6)),
  mic: mk(40, 70, pa('M14 26 L26 26 L24 54 H16 Z', 0.12) + ci(20, 14, 12, 0.14) + ring(20, 14, 7) + dotA(20, 14, 2.6) + ln(20, 54, 20, 68) + ln(10, 68, 30, 68)),
  mic2: mk(58, 66, pa('M8 24 L20 24 L18 48 H10 Z', 0.12) + ci(14, 13, 10, 0.14) + ring(14, 13, 5.5) + dotA(14, 13, 2.2) + pa('M38 24 L50 24 L48 50 H40 Z', 0.12) + ci(44, 13, 10, 0.14) + ring(44, 13, 5.5) + dotA(44, 13, 2.2) + ln(14, 48, 14, 62) + ln(44, 50, 44, 62)),
  stool: mk(36, 36, drum(18, 18, 16, 0.1)),
  wedge: mk(70, 42, pa('M0 42 L10 4 H60 L70 42 Z', 0.12) + spk(35, 26, 11)),
  sidefill: mk(48, 90, rr(0, 0, 48, 90, 6, 0.12) + spk(24, 26, 14) + spk(24, 64, 14)),
  iem: mk(44, 32, rr(0, 6, 26, 26, 4, 0.12) + ln(20, 6, 20, 0) + ci(36, 12, 5, 0.14) + ci(36, 26, 5, 0.14) + dotA(8, 14, 2)),
  rack: mk(50, 44, rr(0, 0, 50, 44, 3) + ln(4, 15, 46, 15) + ln(4, 29, 46, 29) + dotA(42, 7, 2) + dotA(42, 22, 2) + dotA(42, 36, 2)),
  di: mk(36, 24, rr(0, 0, 36, 24, 4, 0.12) + ci(11, 12, 5, 0.08) + ci(25, 12, 5, 0.08) + dotA(18, 12, 2)),
  power: mk(34, 34, ci(17, 17, 15) + bolt(17, 17)),
}
const faderDesk = (w: number, n: number): Built => {
  let s = rr(0, 0, w, 56, 5), step = (w - 24) / Math.max(1, n - 1)
  for (let i = 0; i < n; i++) { const x = 12 + i * step; s += ln(x, 18, x, 46) + `<rect x="${x - 3}" y="${i % 2 ? 24 : 32}" width="6" height="5" rx="1.5" fill="$A" stroke="none"/>` }
  return mk(w, 56, s)
}

// ---------- ícones de palco ----------
const drums: IconDef = {
  id: 'drums', cat: 'inst', board: 'stage', label: { pt: 'Bateria', en: 'Drum kit' },
  params: [
    num('kick', 'Bumbos', 'Kick drums', 1, 1, 2), bool('kicksplit', 'Bumbo em 2 canais (in + out)', 'Split kick (in + out)', false), num('toms', 'Tons (rack)', 'Rack toms', 2, 0, 4), num('floors', 'Surdos (tom de chão)', 'Floor toms', 1, 0, 2),
  ],
  build: () => ART.drums,
  spec: (P, t) => `${N(P, 'kick')} ${t('bumbo', 'kick')} · ${N(P, 'toms')} ${t('tons', 'toms')} · ${N(P, 'floors')} ${t('surdo', 'floor')}`,
  channels: (P, _b, t) => {
    const out: Chan[] = [], k = N(P, 'kick')
    for (let i = 0; i < k; i++) {
      const nm = k > 1 ? t(`Bumbo ${i + 1}`, `Kick ${i + 1}`) : t('Bumbo', 'Kick'), id = i ? `k${i}` : '0'
      if (B(P, 'kicksplit')) { out.push({ name: `${nm} in`, mic: 'Beta 91 / D112', stand: t('Dentro do bumbo', 'Inside kick'), kid: id }); out.push({ name: `${nm} out`, mic: 'Beta 52 / D12', stand: 'Mini boom', kid: id + 'x' }) }
      else out.push({ name: nm, mic: 'Beta 52 / D112', stand: 'Mini boom', kid: id })
    }
    // demais canais: chave = posição como se houvesse 1 bumbo (estável com split e com o nº de bumbos)
    const rest: Chan[] = []
    rest.push({ name: t('Caixa', 'Snare'), mic: 'SM57', stand: 'Mini boom' })
    rest.push({ name: t('Caixa bottom', 'Snare bottom'), mic: 'SM57', stand: 'Mini boom' })
    for (let i = 0; i < N(P, 'toms'); i++) rest.push({ name: `Tom ${i + 1}`, mic: 'e604', stand: 'Clip' })
    for (let i = 0; i < N(P, 'floors'); i++) rest.push({ name: t(`Surdo ${i + 1}`, `Floor tom ${i + 1}`), mic: 'e604', stand: 'Clip' })
    rest.push({ name: 'Hi-hat', mic: t('Condensador', 'Condenser'), stand: 'Boom', phantom: true })
    rest.push({ name: 'OH L', mic: t('Condensador', 'Condenser'), stand: 'Boom', phantom: true }); rest.push({ name: 'OH R', mic: t('Condensador', 'Condenser'), stand: 'Boom', phantom: true })
    rest.forEach((c, j) => out.push({ ...c, kid: String(j + 1) }))
    return out
  },
}

const perc: IconDef = {
  id: 'perc', cat: 'inst', board: 'stage', label: { pt: 'Percussão', en: 'Percussion' },
  params: [num('pieces', 'Peças (canais)', 'Pieces (channels)', 3, 1, 8), sel('type', 'Tipo', 'Type', 'Congas', ['Congas', 'Bongô', 'Timbal', 'Pandeiro', 'Cajón', 'Rack misto'])],
  build: () => ART.perc,
  spec: P => `${S(P, 'type')} · ${N(P, 'pieces')}`,
  channels: (P, base, t) => Array.from({ length: N(P, 'pieces') }, (_, i) => ({ name: N(P, 'pieces') > 1 ? `${S(P, 'type')} ${i + 1}` : base || t('Percussão', 'Percussion'), mic: 'SM57 / e604', stand: 'Boom' })),
}

const keys: IconDef = {
  id: 'keys', cat: 'inst', board: 'stage', label: { pt: 'Teclado', en: 'Keyboard' },
  params: [sel('size', 'Teclas', 'Keys', '88', ['49', '61', '76', '88']), num('units', 'Teclados empilhados', 'Stacked keyboards', 1, 1, 3), bool('stereo', 'Saída estéreo (L/R)', 'Stereo out (L/R)', true)],
  build: () => ART.keys,
  spec: (P, t) => `${S(P, 'size')} ${t('teclas', 'keys')}${N(P, 'units') > 1 ? ` × ${N(P, 'units')}` : ''}`,
  channels: (P, base, t) => {
    const out: Chan[] = [], u = N(P, 'units')
    for (let j = 0; j < u; j++) { const nm = (base || t('Teclado', 'Keys')) + (u > 1 ? ` ${j + 1}` : ''); if (B(P, 'stereo')) { out.push({ name: nm + ' L', mic: 'DI', stand: '-' }); out.push({ name: nm + ' R', mic: 'DI', stand: '-' }) } else out.push({ name: nm, mic: 'DI', stand: '-' }) }
    return out
  },
}

const piano: IconDef = {
  id: 'piano', cat: 'inst', board: 'stage', label: { pt: 'Piano', en: 'Piano' },
  params: [sel('type', 'Tipo', 'Type', 'Cauda', ['Cauda', 'Armário', 'Digital']), sel('mics', 'Captação', 'Pickup', '2 microfones', ['2 microfones', '1 microfone', 'Linha (DI L/R)'])],
  build: () => ART.piano,
  spec: P => `${S(P, 'type')} · ${S(P, 'mics')}`,
  channels: (P, base, t) => {
    const m = S(P, 'mics'), nm = base || 'Piano'
    if (m.startsWith('2')) return [{ name: nm + ' L', mic: t('Condensador', 'Condenser'), stand: 'Boom', phantom: true }, { name: nm + ' R', mic: t('Condensador', 'Condenser'), stand: 'Boom', phantom: true }]
    if (m.startsWith('1')) return [{ name: nm, mic: t('Condensador', 'Condenser'), stand: 'Boom', phantom: true }]
    return [{ name: nm + ' L', mic: 'DI', stand: '-' }, { name: nm + ' R', mic: 'DI', stand: '-' }]
  },
}

const guitarAmp: IconDef = {
  id: 'guitar_amp', cat: 'amp', board: 'stage', label: { pt: 'Ampli guitarra', en: 'Guitar amp' },
  params: [sel('speakers', 'Alto-falantes', 'Speakers', '2', ['1', '2', '4']), sel('size', 'Tamanho (pol.)', 'Size (in)', '12', ['8', '10', '12']), bool('head', 'Cabeçote', 'Head', false), num('mics', 'Microfones', 'Mics', 1, 0, 2), bool('di', 'Saída DI', 'DI out', false)],
  build: () => ART.guitarAmp,
  spec: P => `${S(P, 'speakers')}×${S(P, 'size')}"${B(P, 'head') ? ' + head' : ''}`,
  channels: (P, base, t) => {
    const out: Chan[] = [], nm = base || t('Guitarra', 'Guitar'), m = N(P, 'mics')
    for (let i = 0; i < m; i++) out.push({ name: m > 1 ? `${nm} ${i + 1}` : nm, mic: i ? 'e906' : 'SM57', stand: 'Mini boom' })
    if (B(P, 'di')) out.push({ name: nm + ' DI', mic: 'DI', stand: '-' })
    return out
  },
}
const bassAmp: IconDef = {
  id: 'bass_amp', cat: 'amp', board: 'stage', label: { pt: 'Ampli baixo', en: 'Bass amp' },
  params: [sel('speakers', 'Alto-falantes', 'Speakers', '4', ['1', '2', '4', '6', '8']), sel('size', 'Tamanho (pol.)', 'Size (in)', '10', ['10', '12', '15', '18']), bool('head', 'Cabeçote', 'Head', true), bool('di', 'Saída DI', 'DI out', true), bool('mic', 'Microfone no gabinete', 'Cab mic', false)],
  build: () => ART.bassAmp,
  spec: P => `${S(P, 'speakers')}×${S(P, 'size')}"${B(P, 'head') ? ' + head' : ''}`,
  channels: (P, base, t) => {
    const out: Chan[] = [], nm = base || t('Baixo', 'Bass')
    if (B(P, 'di')) out.push({ name: nm + ' DI', mic: 'DI', stand: '-' })
    if (B(P, 'mic')) out.push({ name: nm + ' mic', mic: 'D112 / RE20', stand: 'Mini boom' })
    return out
  },
}

const acoustic: IconDef = {
  id: 'acoustic', cat: 'inst', board: 'stage', label: { pt: 'Violão / guitarra acústica', en: 'Acoustic guitar' },
  params: [bool('di', 'Linha (DI)', 'Line (DI)', true), bool('mic', 'Microfone', 'Mic', false)],
  build: () => ART.acoustic,
  channels: (P, base, t) => {
    const nm = base || t('Violão', 'Acoustic'), out: Chan[] = []
    if (B(P, 'di')) out.push({ name: nm, mic: 'DI', stand: '-' })
    if (B(P, 'mic')) out.push({ name: nm + ' mic', mic: 'SM81', stand: 'Boom', phantom: true })
    return out
  },
}

const horn: IconDef = {
  id: 'horn', cat: 'inst', board: 'stage', label: { pt: 'Sopros', en: 'Horns' },
  params: [num('count', 'Sopristas', 'Players', 2, 1, 6), sel('type', 'Instrumento', 'Instrument', 'Sax', ['Sax', 'Trompete', 'Trombone', 'Flauta', 'Naipe misto'])],
  build: () => ART.horn,
  spec: P => `${S(P, 'type')} × ${N(P, 'count')}`,
  channels: (P, base, t) => Array.from({ length: N(P, 'count') }, (_, i) => ({ name: `${base || S(P, 'type')}${N(P, 'count') > 1 ? ' ' + (i + 1) : ''}`, mic: 'SM57 / MD421', stand: t('Girafa', 'Boom') })),
}

const strings: IconDef = {
  id: 'strings', cat: 'inst', board: 'stage', label: { pt: 'Cordas', en: 'Strings' },
  params: [num('count', 'Músicos', 'Players', 2, 1, 6), sel('type', 'Instrumento', 'Instrument', 'Violino', ['Violino', 'Viola', 'Violoncelo', 'Contrabaixo acústico', 'Quarteto'])],
  build: () => ART.strings,
  spec: P => `${S(P, 'type')} × ${N(P, 'count')}`,
  channels: (P, base) => Array.from({ length: N(P, 'count') }, (_, i) => ({ name: `${base || S(P, 'type')}${N(P, 'count') > 1 ? ' ' + (i + 1) : ''}`, mic: 'DPA 4099 / SM81', stand: 'Clip / Boom' })),
}

const dj: IconDef = {
  id: 'dj', cat: 'inst', board: 'stage', label: { pt: 'DJ / CDJs', en: 'DJ booth' },
  params: [num('players', 'Players (CDJ)', 'Players (CDJ)', 2, 2, 4), bool('stereo', 'Saída estéreo (L/R)', 'Stereo out (L/R)', true)],
  build: () => ART.dj,
  spec: P => `${N(P, 'players')} CDJ`,
  channels: (P, base) => { const nm = base || 'DJ'; return B(P, 'stereo') ? [{ name: nm + ' L', mic: 'DI', stand: '-' }, { name: nm + ' R', mic: 'DI', stand: '-' }] : [{ name: nm, mic: 'DI', stand: '-' }] },
}

const laptop: IconDef = {
  id: 'laptop', cat: 'inst', board: 'stage', label: { pt: 'VS / Click', en: 'VS / Click' },
  params: [num('vs', 'Canais de VS', 'VS channels', 2, 0, 16), num('click', 'Canais de click', 'Click channels', 1, 0, 8)],
  build: () => ART.laptop,
  spec: P => `${N(P, 'vs')} VS · ${N(P, 'click')} click`,
  channels: (P) => {
    const out: Chan[] = [], vs = N(P, 'vs'), ck = N(P, 'click')
    for (let i = 1; i <= vs; i++) out.push({ name: `VS ${i}`, mic: 'DI', stand: '-' })
    for (let i = 1; i <= ck; i++) out.push({ name: ck > 1 ? `Click ${i}` : 'Click', mic: 'DI', stand: '-' })
    return out
  },
}

const vocalParams = (def: string): ParamDef[] => [
  sel('mic', 'Microfone', 'Mic', def, ['SM58', 'Beta 58A', 'Beta 87', 'Sem fio (handheld)', 'Headset', 'Condensador']),
  sel('stand', 'Suporte', 'Stand', 'Girafa', ['Girafa', 'Reto', 'Mesa', 'Sem suporte']),
]
const vocalCh = (nm: string) => (P: Params, base: string): Chan[] => [{ name: base || nm, mic: S(P, 'mic'), stand: S(P, 'stand'), phantom: S(P, 'mic') === 'Condensador' || S(P, 'mic') === 'Beta 87' }]
const vocal: IconDef = {
  id: 'vocal', cat: 'vox', board: 'stage', label: { pt: 'Vocal', en: 'Lead vocal' }, params: vocalParams('SM58'),
  build: () => ART.mic, spec: P => S(P, 'mic'), channels: (P, base, t) => vocalCh(t('Voz', 'Vox'))(P, base),
}
const backing: IconDef = {
  id: 'backing', cat: 'vox', board: 'stage', label: { pt: 'Backing vocal', en: 'Backing vocal' }, params: vocalParams('SM58'),
  build: () => ART.mic2, spec: P => S(P, 'mic'), channels: (P, base, t) => vocalCh(t('Backing', 'Backing'))(P, base),
}
const stool: IconDef = { id: 'stool', cat: 'misc', board: 'stage', label: { pt: 'Banqueta', en: 'Stool' }, params: [], build: () => ART.stool }

const monMix = [num('mix', 'Mix de retorno nº', 'Monitor mix no.', 1, 0, 16)]
const mixSpec = (P: Params) => (N(P, 'mix') ? `Mix ${N(P, 'mix')}` : '')
const wedge: IconDef = { id: 'wedge', cat: 'mon', board: 'stage', label: { pt: 'Spot (retorno)', en: 'Wedge monitor' }, params: [...monMix, sel('size', 'Tamanho (pol.)', 'Size (in)', '12', ['10', '12', '15'])], build: () => ART.wedge, spec: P => [mixSpec(P), `${S(P, 'size')}"`].filter(Boolean).join(' · ') }
const sidefill: IconDef = { id: 'sidefill', cat: 'mon', board: 'stage', label: { pt: 'Side fill', en: 'Side fill' }, params: [...monMix, num('speakers', 'Alto-falantes', 'Speakers', 2, 1, 3)], build: () => ART.sidefill, spec: (P, t) => [mixSpec(P), `${N(P, 'speakers')} ${t('falantes', 'speakers')}`].filter(Boolean).join(' · ') }
const iem: IconDef = { id: 'iem', cat: 'mon', board: 'stage', label: { pt: 'In-ear (IEM)', en: 'In-ear (IEM)' }, params: [...monMix], build: () => ART.iem, spec: mixSpec }
const monDesk: IconDef = { id: 'mon_desk', cat: 'foh', board: 'stage', label: { pt: 'Mesa de monitor', en: 'Monitor desk' }, params: [num('chs', 'Canais', 'Channels', 32, 8, 64, 8)], build: () => faderDesk(110, 5), spec: P => `${N(P, 'chs')} ch` }
const fohDesk: IconDef = { id: 'foh_desk', cat: 'foh', board: 'stage', label: { pt: 'Mesa FOH', en: 'FOH desk' }, params: [num('chs', 'Canais', 'Channels', 32, 8, 64, 8)], build: () => faderDesk(130, 7), spec: P => `${N(P, 'chs')} ch` }
const rack: IconDef = { id: 'rack', cat: 'foh', board: 'stage', label: { pt: 'Rack', en: 'Rack' }, params: [num('u', 'Unidades (U)', 'Rack units (U)', 8, 2, 16, 2)], build: () => ART.rack, spec: P => `${N(P, 'u')} U` }
const di: IconDef = { id: 'di', cat: 'misc', board: 'stage', label: { pt: 'Caixa DI / stagebox', en: 'DI / stagebox' }, params: [num('chs', 'Canais', 'Channels', 1, 1, 48, 1)], build: () => ART.di, spec: P => (N(P, 'chs') > 1 ? `${N(P, 'chs')} ch` : '') }
const power: IconDef = { id: 'power', cat: 'misc', board: 'stage', label: { pt: 'Ponto de energia', en: 'Power drop' }, params: [num('outlets', 'Pontos (tomadas)', 'Outlets', 1, 1, 24), sel('v', 'Tensão', 'Voltage', '127 V', ['110 V', '127 V', '220 V'])], build: () => ART.power, spec: P => `${N(P, 'outlets')}× ${S(P, 'v')}` }

// elementos dimensionais (o tamanho É o parâmetro)
const dashed = (x: number, y: number, w: number, h: number, rx = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="$I" fill-opacity=".05" stroke-width="$W(1)" stroke-dasharray="8 5"/>`
const riser: IconDef = { id: 'riser', cat: 'misc', board: 'stage', label: { pt: 'Praticável', en: 'Riser' },
  params: [num('wm', 'Largura (m)', 'Width (m)', 2, 0.5, 12, 0.25), num('dm', 'Profundidade (m)', 'Depth (m)', 2, 0.5, 8, 0.25), num('hcm', 'Altura (cm)', 'Height (cm)', 40, 10, 200, 10)],
  build: P => { const w = N(P, 'wm') * 100, h = N(P, 'dm') * 100; return mk(w, h, dashed(0, 0, w, h)) }, spec: P => `${N(P, 'hcm')} cm` }
const textNote: IconDef = { id: 'text', cat: 'misc', board: 'stage', label: { pt: 'Nota de texto', en: 'Text note' }, params: [num('wm', 'Largura (m)', 'Width (m)', 1.2, 0.3, 6, 0.1)],
  build: P => mk(N(P, 'wm') * 100, 30, dashed(0, 0, N(P, 'wm') * 100, 30, 3)) }
const arrow: IconDef = { id: 'arrow', cat: 'misc', board: 'stage', label: { pt: 'Seta', en: 'Arrow' }, params: [num('lm', 'Comprimento (m)', 'Length (m)', 1.2, 0.3, 8, 0.1)],
  build: P => { const w = N(P, 'lm') * 100; return mk(w, 24, `<path d="M0 12 H${w - 4} M${w - 18} 2 L${w} 12 L${w - 18} 22" fill="none" stroke="$A"/>`) } }

// ---------- luz ----------
const parCan = (w: number, h: number) => mk(w, h, pl(`M${w * 0.08} ${h * 0.3} V${h * 0.72} Q${w * 0.08} ${h * 0.9} ${w / 2} ${h * 0.9} Q${w * 0.92} ${h * 0.9} ${w * 0.92} ${h * 0.72} V${h * 0.3}`) + rr(w * 0.22, 0, w * 0.56, h * 0.58, 5, 0.14) + ci(w / 2, h * 0.68, w * 0.34) + dotA(w / 2, h * 0.68, 2.8))
const lamp = (watt: number, w: number, h: number, art: Built | undefined = undefined) => ({ w, h, art, watt })
void lamp
const lt = (id: string, cat: IconDef['cat'], pt: string, en: string, watt: number, art: Built, extra: ParamDef[] = []): IconDef =>
  ({ id, cat, board: 'light', label: { pt, en }, params: [...lightCommon(watt), ...extra], build: () => art,
  spec: P => [lightSpec(P), ...extra.map(e => (e.key === 'angle' ? `${S(P, e.key)}°` : S(P, e.key)))].filter(Boolean).join(' · ') })

const par64 = lt('par64', 'fixture', 'Par 64', 'PAR 64', 1000, parCan(36, 44))
const par56 = lt('par56', 'fixture', 'Par 56', 'PAR 56', 300, parCan(30, 38))
const par38 = lt('par38', 'fixture', 'Par 38 / Par 30', 'PAR 38 / PAR 30', 150, parCan(24, 32))
const ledpar = lt('ledpar', 'led', 'Par LED', 'LED par', 160, mk(36, 38, rr(2, 0, 32, 38, 7, 0.12) + ci(18, 21, 12, 0.08) + ring(18, 21, 6) + dotA(18, 21, 2.6)), [sel('leds', 'LEDs', 'LEDs', '18x10W', ['7x10W', '12x10W', '18x10W', '54x3W', '7x15W RGBWA+UV'])])
const fresnel = lt('fresnel', 'fixture', 'Fresnel', 'Fresnel', 1000, mk(42, 48, rr(10, 0, 22, 20, 3, 0.14) + rr(0, 22, 5, 22, 1.5, 0.16) + rr(37, 22, 5, 22, 1.5, 0.16) + ci(21, 31, 14) + ring(21, 31, 8) + dotA(21, 31, 2.6)), [sel('size', 'Tamanho', 'Size', '6"', ['4"', '6"', '8"', '10"'])])
const pc = lt('pc', 'fixture', 'PC (plano-convexo)', 'PC (plano-convex)', 1000, mk(42, 48, rr(10, 0, 22, 20, 3, 0.14) + rr(0, 22, 5, 22, 1.5, 0.16) + rr(37, 22, 5, 22, 1.5, 0.16) + ci(21, 31, 14) + pl('M11 28 Q15 22 23 21') + dotA(21, 33, 2.6)), [sel('size', 'Tamanho', 'Size', '6"', ['4"', '6"', '8"'])])
const ellips = lt('ellips', 'fixture', 'Elipsoidal (Source Four)', 'Ellipsoidal (Source Four)', 750, mk(28, 66, rr(9, 0, 10, 26, 3, 0.14) + rr(2, 24, 24, 40, 7, 0.12) + ci(14, 50, 8, 0.08) + dotA(14, 50, 2.4)), [num('angle', 'Ângulo (°)', 'Angle (°)', 26, 5, 90, 1)])
const moverBody = (head: string) => rr(8, 0, 26, 9, 3, 0.14) + rr(2, 8, 6, 28, 3, 0.14) + rr(34, 8, 6, 28, 3, 0.14) + head
const mspot = lt('moving_spot', 'moving', 'Moving head spot', 'Moving head spot', 300, mk(42, 52, moverBody(rr(11, 16, 20, 34, 10, 0.12) + dotA(21, 42, 3.4))))
const mbeam = lt('moving_beam', 'moving', 'Moving head beam', 'Moving head beam', 230, mk(42, 52, moverBody(rr(14, 16, 14, 36, 7, 0.12) + dotA(21, 44, 2.6))))
const mwash = lt('moving_wash', 'moving', 'Moving head wash', 'Moving head wash', 400, mk(42, 52, moverBody(rr(9, 16, 24, 32, 11, 0.12) + ring(21, 38, 7) + dotA(21, 38, 2.6))))
const ledbar = lt('ledbar', 'led', 'Ribalta (barra de LED)', 'Footlight (LED bar)', 150, mk(90, 18, rr(0, 0, 90, 18, 5, 0.12) + [11, 25, 39, 53, 67, 80].map(x => dotA(x, 9, 2.4)).join('')), [num('pixels', 'Células', 'Cells', 8, 3, 24, 1)])
const scanner = lt('scanner', 'moving', 'Scanner', 'Scanner', 250, mk(40, 40, rr(2, 0, 36, 18, 4, 0.14) + ln(10, 38, 30, 24) + dotA(20, 9, 2.4)))
const strobe = lt('strobe', 'effect', 'Strobo', 'Strobe', 1500, mk(56, 26, rr(0, 0, 56, 26, 5, 0.12) + bolt(28, 13, 0.9)))
const blinder = lt('blinder', 'fixture', 'Blinder', 'Blinder', 650, mk(56, 30, rr(0, 0, 56, 30, 6, 0.12) + ci(16, 15, 9, 0.08) + dotA(16, 15, 2.4) + ci(40, 15, 9, 0.08) + dotA(40, 15, 2.4)), [num('lamps', 'Lâmpadas', 'Lamps', 2, 2, 4, 2)])
const cyc = lt('cyc', 'fixture', 'Ciclorama (cyc / bat)', 'Cyc light', 1000, mk(60, 34, pa('M6 0 H54 L60 28 H0 Z', 0.12) + dotA(30, 14, 2.6)), [num('cells', 'Células', 'Cells', 3, 1, 4)])
const follow = lt('follow', 'fixture', 'Follow spot', 'Follow spot', 1200, mk(34, 96, rr(6, 0, 22, 52, 8, 0.12) + ci(17, 16, 8, 0.08) + dotA(17, 16, 2.6) + ln(17, 52, 17, 76) + ln(17, 76, 4, 94) + ln(17, 76, 30, 94)))
const mirrorball = lt('mirrorball', 'effect', 'Globo de espelhos', 'Mirror ball', 0, mk(36, 46, ln(18, 0, 18, 8) + ci(18, 28, 16) + `<ellipse cx="18" cy="28" rx="6" ry="16" fill="none" stroke-width="$W(1.8)" opacity=".6"/>` + ln(2, 28, 34, 28) + dotA(18, 28, 2.4)))
mirrorball.params = [num('cm', 'Diâmetro (cm)', 'Diameter (cm)', 50, 20, 100, 10)]; mirrorball.spec = P => `${N(P, 'cm')} cm`
const laser = lt('laser', 'effect', 'Laser', 'Laser', 5, mk(44, 44, rr(4, 0, 36, 16, 4, 0.14) + dotA(22, 8, 2.4) + `<g stroke="$A" stroke-width="$W(1.8)"><line x1="22" y1="16" x2="6" y2="42"/><line x1="22" y1="16" x2="22" y2="42"/><line x1="22" y1="16" x2="38" y2="42"/></g>`))
const fog = lt('fog', 'effect', 'Máquina de fumaça', 'Fog machine', 1500, mk(72, 34, rr(0, 4, 50, 26, 5, 0.12) + rr(50, 11, 10, 12, 3, 0.16) + pl('M62 10 Q67 6 70 10') + dotA(10, 17, 2.2)))
const haze = lt('haze', 'effect', 'Haze', 'Hazer', 1000, mk(72, 30, rr(0, 3, 50, 24, 5, 0.12) + dotA(10, 15, 2.2) + dotA(58, 12, 1.8) + dotA(64, 16, 1.8) + dotA(70, 12, 1.8)))
const dimmer: IconDef = { id: 'dimmer', cat: 'rig', board: 'light', label: { pt: 'Rack de dimmer', en: 'Dimmer rack' }, params: [num('chs', 'Canais', 'Channels', 12, 2, 48, 2)], build: () => ART.rack, spec: P => `${N(P, 'chs')} ch` }
const lxdesk: IconDef = { id: 'lxdesk', cat: 'rig', board: 'light', label: { pt: 'Mesa de luz', en: 'Lighting desk' }, params: [text('model', 'Modelo', 'Model', '')], build: () => faderDesk(100, 4), spec: P => S(P, 'model') }
const lpower: IconDef = { id: 'lpower', cat: 'rig', board: 'light', label: { pt: 'Ponto de energia (luz)', en: 'Power drop (lights)' }, params: [num('outlets', 'Pontos (tomadas)', 'Outlets', 1, 1, 24), sel('v', 'Tensão', 'Voltage', '220 V', ['110 V', '127 V', '220 V', '380 V trifásico'])], build: () => ART.power, spec: P => `${N(P, 'outlets')}× ${S(P, 'v')}` }
const truss: IconDef = { id: 'truss', cat: 'rig', board: 'light', label: { pt: 'Treliça', en: 'Truss' }, params: [num('lm', 'Comprimento (m)', 'Length (m)', 4, 1, 16, 0.5), sel('type', 'Tipo', 'Type', 'Q30', ['Q25', 'Q30', 'Q40', 'Box 20'])],
  build: P => {
    const w = N(P, 'lm') * 100; let s = `<rect x="0" y="0" width="${w}" height="30" fill="$I" fill-opacity=".06"/>`
    for (let x = 0; x < w; x += 30) s += `<path d="M${x} 0 L${Math.min(x + 15, w)} 30 L${Math.min(x + 30, w)} 0" fill="none" stroke-width="$W(1.8)" opacity=".6"/>`
    return mk(w, 30, s)
  }, spec: P => `${N(P, 'lm')} m ${S(P, 'type')}` }

// ---------- novos itens comuns em rider ----------
const stereoParam = bool('stereo', 'Saída estéreo (L/R)', 'Stereo out (L/R)', true)
const lrCh = (P: Params, nm: string, mic = 'DI'): Chan[] => (B(P, 'stereo') ? [{ name: nm + ' L', mic, stand: '-' }, { name: nm + ' R', mic, stand: '-' }] : [{ name: nm, mic, stand: '-' }])
const sw = (x: number, y: number, r = 2.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="$I" fill-opacity=".25" stroke-width="$W(1.8)" opacity=".7"/>`
const pedalbox = (x: number, y: number, w: number, h: number) => rr(x, y, w, h, 3, 0.12) + dotA(x + w / 2, y + 6, 1.8) + sw(x + w / 2, y + h - 8, 2.6)

const outLabel = (P: Params, t: Tr) => (S(P, 'out') === 'Linha' ? t('Linha', 'Line') : t('Amplificador', 'Amplifier'))
const pedalboard: IconDef = { id: 'pedalboard', cat: 'inst', board: 'stage', label: { pt: 'Pedalboard', en: 'Pedalboard' },
  params: [num('pedals', 'Pedais', 'Pedals', 6, 1, 20), sel('out', 'Saída para', 'Output to', 'Amplificador', ['Linha', 'Amplificador'])],
  build: () => mk(64, 38, rr(0, 0, 64, 38, 4, 0.08) + pedalbox(4, 4, 14, 14) + pedalbox(21, 4, 14, 14) + pedalbox(38, 4, 14, 14) + pedalbox(8, 21, 16, 14) + pedalbox(28, 21, 16, 14) + dotA(58, 28, 2)),
  spec: (P, t) => [`${N(P, 'pedals')} ${t('pedais', 'pedals')}`, outLabel(P, t)].join(' · '),
  channels: (P, base) => (S(P, 'out') === 'Linha' ? [{ name: (base || 'Pedalboard') + ' DI', mic: 'DI', stand: '-' }] : []) }
const multifx: IconDef = { id: 'multifx', cat: 'inst', board: 'stage', label: { pt: 'Pedaleira (multi-efeitos)', en: 'Multi-FX pedalboard' },
  params: [sel('model', 'Modelo', 'Model', 'Helix / Kemper / Fractal', ['Helix / Kemper / Fractal', 'Line 6', 'Boss GT', 'Zoom', 'Outro']), sel('out', 'Saída para', 'Output to', 'Linha', ['Linha', 'Amplificador']), stereoParam],
  build: () => mk(60, 32, rr(0, 0, 60, 32, 4, 0.12) + rr(24, 4, 20, 8, 1.5, 0.1) + sw(10, 9) + sw(17, 9) + sw(50, 9) + [8, 20, 32, 44, 56].map(x => dotA(x - 2, 24, 2)).join('')),
  spec: (P, t) => [S(P, 'model'), outLabel(P, t)].join(' · '),
  channels: (P, base, t) => (S(P, 'out') === 'Amplificador' ? [] : lrCh(P, base || t('Pedaleira', 'Multi-FX'))) }
const edrums: IconDef = { id: 'edrums', cat: 'inst', board: 'stage', label: { pt: 'Bateria eletrônica', en: 'Electronic drums' },
  params: [stereoParam, bool('click', 'Canal de click', 'Click channel', false)],
  build: () => mk(90, 70, ci(45, 46, 16, 0.12) + ring(45, 46, 7) + dotA(45, 46, 2.4) + ci(18, 22, 12) + ci(72, 22, 12) + ci(45, 12, 9) + rr(76, 46, 14, 20, 3, 0.12) + dotA(83, 56, 2)),
  channels: (P, base, t) => [...lrCh(P, base || t('Bat. eletr.', 'E-drums')), ...(B(P, 'click') ? [{ name: 'Click', mic: 'DI', stand: '-' }] : [])] }
const pads: IconDef = { id: 'pads', cat: 'inst', board: 'stage', label: { pt: 'Pad / Sampler (SPD)', en: 'Pad / Sampler' }, params: [stereoParam],
  build: () => mk(44, 34, rr(0, 0, 44, 34, 4, 0.12) + [0, 1, 2].map(i => rr(4 + i * 13, 5, 11, 11, 2, 0.14)).join('') + [0, 1, 2].map(i => rr(4 + i * 13, 19, 11, 11, 2, 0.14)).join('') + dotA(10, 10.5, 1.8)),
  channels: (P, base) => lrCh(P, base || 'Pad') }
const organ: IconDef = { id: 'organ', cat: 'inst', board: 'stage', label: { pt: 'Órgão / Hammond', en: 'Organ / Hammond' },
  params: [bool('leslie', 'Leslie (2 mics)', 'Leslie (2 mics)', true), stereoParam],
  build: () => mk(110, 56, rr(0, 0, 110, 26, 4, 0.12) + ln(0, 14, 110, 14) + rr(0, 30, 110, 26, 4, 0.1) + [20, 34, 48, 62, 76, 90].map(x => ln(x, 30, x, 56)).join('') + dotA(104, 7, 2)),
  channels: (P, base) => B(P, 'leslie') ? [{ name: (base || 'Hammond') + ' top', mic: 'SM57', stand: 'Mini boom' }, { name: (base || 'Hammond') + ' bottom', mic: 'SM57', stand: 'Mini boom' }] : lrCh(P, base || 'Hammond') }
const accordion: IconDef = { id: 'accordion', cat: 'inst', board: 'stage', label: { pt: 'Acordeão / Sanfona', en: 'Accordion' }, params: [sel('pickup', 'Captação', 'Pickup', 'Microfone', ['Microfone', 'Linha (DI)'])],
  build: () => mk(44, 40, rr(0, 6, 12, 28, 3, 0.12) + rr(32, 6, 12, 28, 3, 0.12) + pl('M12 10 H32 M12 16 H32 M12 22 H32 M12 28 H32') + dotA(38, 20, 2)),
  channels: (P, base) => [{ name: base || 'Acordeão', mic: S(P, 'pickup') === 'Microfone' ? 'SM81' : 'DI', stand: S(P, 'pickup') === 'Microfone' ? 'Boom' : '-' }] }
const choir: IconDef = { id: 'choir', cat: 'vox', board: 'stage', label: { pt: 'Coral', en: 'Choir' }, params: [num('mics', 'Microfones', 'Mics', 2, 1, 8), sel('mic', 'Microfone', 'Mic', 'Condensador', ['Condensador', 'SM58', 'Sem fio'])],
  build: () => mk(100, 30, [0, 1, 2, 3].map(i => ci(14 + i * 24, 15, 10, 0.12) + dotA(14 + i * 24, 15, 2.2)).join('')),
  spec: P => `${N(P, 'mics')} mics`,
  channels: (P, base, t) => Array.from({ length: N(P, 'mics') }, (_, i) => ({ name: `${base || t('Coral', 'Choir')} ${i + 1}`, mic: S(P, 'mic'), stand: 'Girafa', phantom: S(P, 'mic') === 'Condensador' })) }
const talkback: IconDef = { id: 'talkback', cat: 'vox', board: 'stage', label: { pt: 'Talkback', en: 'Talkback' }, params: [],
  build: () => mk(34, 40, ci(17, 12, 9, 0.14) + dotA(17, 12, 2.2) + pl('M12 22 H22 L21 34 H13 Z') + ln(17, 34, 17, 40)),
  channels: (_P, base) => [{ name: base || 'Talkback', mic: 'SM58', stand: 'Mesa' }] }
const ampAc: IconDef = { id: 'acoustic_amp', cat: 'amp', board: 'stage', label: { pt: 'Ampli de violão / teclado', en: 'Acoustic / keys amp' },
  params: [sel('use', 'Uso', 'Use', 'Teclado', ['Teclado', 'Violão', 'Linha']), bool('di', 'Saída DI', 'DI out', true), bool('mic', 'Microfone', 'Mic', false)],
  build: () => mk(50, 46, rr(0, 0, 50, 46, 5, 0.12) + spk(25, 24, 13) + dotA(42, 6, 1.8)),
  spec: P => S(P, 'use'),
  channels: (P, base, t) => [...(B(P, 'di') ? [{ name: (base || S(P, 'use')) + ' DI', mic: 'DI', stand: '-' }] : []), ...(B(P, 'mic') ? [{ name: (base || S(P, 'use')) + ' mic', mic: 'SM57', stand: 'Mini boom' }] : [])] }

// energia, rede e estrutura
const ac: IconDef = { id: 'ac', cat: 'power', board: 'stage', label: { pt: 'Ponto AC (tomada)', en: 'AC outlet' },
  params: [num('outlets', 'Tomadas', 'Outlets', 2, 1, 12), sel('v', 'Tensão', 'Voltage', '127 V', ['110 V', '127 V', '220 V']), text('circuit', 'Circuito', 'Circuit', '')],
  build: () => mk(34, 34, rr(0, 0, 34, 34, 7, 0.12) + ci(17, 17, 10, 0.06) + ln(13, 13, 13, 19) + ln(21, 13, 21, 19) + dotA(17, 24, 2)),
  spec: P => `${N(P, 'outlets')}× ${S(P, 'v')}${S(P, 'circuit') ? ' · ' + S(P, 'circuit') : ''}` }
const strip: IconDef = { id: 'strip', cat: 'power', board: 'stage', label: { pt: 'Régua de energia', en: 'Power strip' },
  params: [num('outlets', 'Tomadas', 'Outlets', 6, 2, 12), sel('v', 'Tensão', 'Voltage', '127 V', ['110 V', '127 V', '220 V'])],
  build: P => { const n = N(P, 'outlets'), w = 12 + n * 10; return mk(w, 16, rr(0, 0, w, 16, 4, 0.12) + Array.from({ length: n }, (_, i) => dotA(11 + i * 10, 8, 2.4)).join('')) },
  spec: P => `${N(P, 'outlets')}× ${S(P, 'v')}` }
const breaker: IconDef = { id: 'breaker', cat: 'power', board: 'stage', label: { pt: 'Quadro de energia', en: 'Distro / breaker box' }, params: [sel('v', 'Tensão', 'Voltage', '220 V', ['127 V', '220 V', '380 V trifásico']), num('amps', 'Corrente (A)', 'Current (A)', 63, 10, 400, 1)],
  build: () => mk(40, 50, rr(0, 0, 40, 50, 4, 0.1) + [0, 1, 2].map(i => rr(8, 8 + i * 12, 24, 8, 2, 0.12)).join('') + bolt(20, 44, 0.4)),
  spec: P => `${S(P, 'v')} · ${N(P, 'amps')} A` }
const gen: IconDef = { id: 'generator', cat: 'power', board: 'stage', label: { pt: 'Gerador', en: 'Generator' }, params: [num('kva', 'Potência (kVA)', 'Power (kVA)', 20, 1, 500, 1)],
  build: () => mk(60, 40, rr(0, 0, 60, 40, 5, 0.1) + ci(18, 20, 11, 0.1) + bolt(46, 20, 0.9)), spec: P => `${N(P, 'kva')} kVA` }
const net: IconDef = { id: 'net', cat: 'power', board: 'stage', label: { pt: 'Ponto de rede / Dante', en: 'Network / Dante drop' }, params: [sel('type', 'Tipo', 'Type', 'Ethernet', ['Ethernet', 'Dante', 'AVB', 'MADI', 'Fibra']), num('ports', 'Portas', 'Ports', 1, 1, 8)],
  build: () => mk(34, 28, rr(0, 0, 34, 28, 5, 0.12) + rr(8, 7, 18, 12, 2, 0.1) + dotA(17, 24, 1.8)), spec: P => `${S(P, 'type')}${N(P, 'ports') > 1 ? ' ×' + N(P, 'ports') : ''}` }
const snake: IconDef = { id: 'snake', cat: 'foh', board: 'stage', label: { pt: 'Multicabo / Stage box', en: 'Snake / Stage box' }, params: [num('chs', 'Canais', 'Channels', 32, 8, 64, 8), num('ret', 'Retornos', 'Returns', 8, 0, 16, 1)],
  build: () => mk(50, 28, rr(0, 0, 50, 28, 4, 0.12) + [0, 1, 2, 3, 4].map(i => ci(8 + i * 8.5, 10, 3, 0.1)).join('') + [0, 1, 2, 3, 4].map(i => dotA(8 + i * 8.5, 20, 1.6)).join('')),
  spec: P => `${N(P, 'chs')}×${N(P, 'ret')}` }
const wireless: IconDef = { id: 'wireless', cat: 'foh', board: 'stage', label: { pt: 'Rack sem fio / Antena', en: 'Wireless rack / Antenna' }, params: [num('ch', 'Canais', 'Channels', 4, 1, 16, 1)],
  build: () => mk(50, 30, rr(0, 8, 50, 22, 3, 0.12) + ln(10, 8, 6, 0) + ln(40, 8, 44, 0) + dotA(10, 19, 2) + dotA(20, 19, 2) + dotA(30, 19, 2) + dotA(40, 19, 2)), spec: P => `${N(P, 'ch')} ch` }
const pmix: IconDef = { id: 'pmix', cat: 'mon', board: 'stage', label: { pt: 'Mixer de fone (personal monitor)', en: 'Personal monitor mixer' }, params: [num('mix', 'Mix nº', 'Mix no.', 1, 0, 16)],
  build: () => mk(36, 30, rr(0, 0, 36, 30, 4, 0.12) + [8, 16, 24, 32].map(x => ln(x - 2, 8, x - 2, 24)).join('') + dotA(14, 16, 2)), spec: mixSpec }
const subw: IconDef = { id: 'sub', cat: 'pa', board: 'stage', label: { pt: 'Subwoofer', en: 'Subwoofer' }, params: [sel('size', 'Tamanho (pol.)', 'Size (in)', '18', ['12', '15', '18', '21']), num('count', 'Quantidade', 'Qty', 2, 1, 16)],
  build: () => mk(60, 60, rr(0, 0, 60, 60, 5, 0.12) + spk(30, 30, 20)), spec: P => `${N(P, 'count')}× ${S(P, 'size')}"` }
const paMain: IconDef = { id: 'pa_main', cat: 'pa', board: 'stage', label: { pt: 'Caixa PA (main)', en: 'PA speaker (main)' }, params: [sel('type', 'Tipo', 'Type', 'Line array', ['Line array', 'Ponto fixo', 'Coluna', 'Full-range']), num('count', 'Caixas por lado', 'Boxes per side', 4, 1, 16)],
  build: () => mk(50, 40, rr(0, 0, 50, 40, 5, 0.12) + spk(25, 12, 8) + spk(25, 30, 5) + ln(8, 20, 42, 20)), spec: P => `${S(P, 'type')} · ${N(P, 'count')}` }
const fohTower: IconDef = { id: 'amp_rack', cat: 'pa', board: 'stage', label: { pt: 'Rack de amplificação', en: 'Amp rack' }, params: [num('u', 'Unidades (U)', 'Rack units (U)', 12, 2, 24, 2)],
  build: () => ART.rack, spec: P => `${N(P, 'u')} U` }
const stand: IconDef = { id: 'micstand', cat: 'misc', board: 'stage', label: { pt: 'Pedestal / suporte', en: 'Stand' }, params: [sel('type', 'Tipo', 'Type', 'Girafa', ['Girafa', 'Reto', 'Teclado (X)', 'Estante', 'Violão'])],
  build: () => mk(34, 34, ci(17, 17, 3, 0.2) + ln(17, 17, 4, 30) + ln(17, 17, 30, 30) + ln(17, 17, 17, 2)), spec: P => S(P, 'type') }
const chair: IconDef = { id: 'chair', cat: 'misc', board: 'stage', label: { pt: 'Cadeira', en: 'Chair' }, params: [],
  build: () => mk(40, 40, rr(2, 6, 36, 32, 6, 0.1) + rr(2, 0, 36, 7, 3, 0.2)) }
const musicStand: IconDef = { id: 'musicstand', cat: 'misc', board: 'stage', label: { pt: 'Estante de partitura', en: 'Music stand' }, params: [],
  build: () => mk(40, 24, rr(0, 0, 40, 18, 3, 0.1) + ln(20, 18, 20, 24) + dotA(20, 9, 1.8)) }
const fan: IconDef = { id: 'fan', cat: 'misc', board: 'stage', label: { pt: 'Ventilador', en: 'Fan' }, params: [],
  build: () => mk(36, 36, ci(18, 18, 16, 0.08) + ring(18, 18, 9) + dotA(18, 18, 2.6)) }
const rug: IconDef = { id: 'rug', cat: 'misc', board: 'stage', label: { pt: 'Tapete', en: 'Rug' }, params: [num('wm', 'Largura (m)', 'Width (m)', 2, 0.5, 8, 0.25), num('dm', 'Profundidade (m)', 'Depth (m)', 2, 0.5, 6, 0.25)],
  build: P => { const w = N(P, 'wm') * 100, h = N(P, 'dm') * 100; return mk(w, h, `<rect x="0" y="0" width="${w}" height="${h}" rx="4" fill="$I" fill-opacity=".08" stroke-width="$W(1.8)" opacity=".6"/>`) } }
const screenItem: IconDef = { id: 'screen', cat: 'misc', board: 'stage', label: { pt: 'Telão / LED', en: 'Screen / LED wall' }, params: [num('wm', 'Largura (m)', 'Width (m)', 4, 1, 20, 0.5), text('model', 'Modelo', 'Model', '')],
  build: P => { const w = N(P, 'wm') * 100; return mk(w, 14, rr(0, 0, w, 14, 2, 0.12) + dotA(w - 6, 7, 2)) }, spec: P => `${N(P, 'wm')} m${S(P, 'model') ? ' · ' + S(P, 'model') : ''}` }
const teleprompter: IconDef = { id: 'teleprompter', cat: 'misc', board: 'stage', label: { pt: 'Tele Prompter', en: 'Teleprompter' },
  params: [sel('size', 'Tela (pol.)', 'Screen (in)', '17"', ['15"', '17"', '19"', '22"'])],
  build: () => mk(46, 36, rr(2, 0, 42, 24, 3, 0.1) + ln(8, 8, 38, 8) + ln(8, 14, 32, 14) + pa('M23 24 L11 34 H35 Z', 0.08) + dotA(41, 20, 1.8)),
  spec: P => S(P, 'size') }
const backdrop: IconDef = { id: 'backdrop', cat: 'misc', board: 'stage', label: { pt: 'Backdrop / Banner', en: 'Backdrop / Banner' }, params: [num('wm', 'Largura (m)', 'Width (m)', 3, 0.5, 20, 0.5)],
  build: P => { const w = N(P, 'wm') * 100; return mk(w, 8, rr(0, 0, w, 8, 2, 0.18)) } }

// luz extra
const lightStand: IconDef = { id: 'lightstand', cat: 'rig', board: 'light', label: { pt: 'Tripé / Pedestal de luz', en: 'Light stand' }, params: [num('hm', 'Altura (m)', 'Height (m)', 3, 1, 6, 0.5)],
  build: () => mk(40, 40, ci(20, 20, 4, 0.2) + ln(20, 20, 4, 36) + ln(20, 20, 36, 36) + ln(20, 20, 20, 2)), spec: P => `${N(P, 'hm')} m` }
const dmxSplit: IconDef = { id: 'dmxsplit', cat: 'rig', board: 'light', label: { pt: 'Splitter / Node DMX', en: 'DMX splitter / node' }, params: [num('ports', 'Saídas', 'Outputs', 4, 1, 16), sel('type', 'Tipo', 'Type', 'Splitter', ['Splitter', 'Art-Net', 'sACN'])],
  build: () => mk(44, 22, rr(0, 0, 44, 22, 4, 0.12) + [0, 1, 2, 3].map(i => dotA(9 + i * 9, 11, 2)).join('')), spec: P => `${S(P, 'type')} · ${N(P, 'ports')}` }
const pinspot = lt('pinspot', 'fixture', 'Pinspot', 'Pinspot', 50, mk(24, 28, rr(4, 0, 16, 10, 3, 0.14) + ci(12, 18, 8) + dotA(12, 18, 2.4)))
const ledpanel = lt('ledpanel', 'led', 'Painel LED / COB', 'LED panel / COB', 200, mk(44, 44, rr(0, 0, 44, 44, 5, 0.12) + [0, 1, 2].flatMap(r => [0, 1, 2].map(c => dotA(9 + c * 13, 9 + r * 13, 2.2))).join('')))
const uvbar = lt('uvbar', 'led', 'Barra UV (luz negra)', 'UV bar', 100, mk(90, 18, rr(0, 0, 90, 18, 5, 0.12) + [11, 25, 39, 53, 67, 80].map(x => `<circle cx="${x}" cy="9" r="2.4" fill="#9B6BFF" stroke="none"/>`).join('')))
const cannon = lt('cannon', 'effect', 'CO₂ / Confete', 'CO₂ / Confetti', 0, mk(24, 50, rr(6, 0, 12, 34, 4, 0.14) + ci(12, 40, 9, 0.1) + dotA(12, 40, 2.4)), [sel('type', 'Tipo', 'Type', 'CO₂ jet', ['CO₂ jet', 'Confete', 'Chama', 'Faíscas'])])
cannon.spec = P => S(P, 'type')


// ---------- geometria dos ícones N / Q / R (desenhos originais, simplificados) ----------
// Caixa de desenho 100×100; cada entrada = [x, y, largura, altura, svg] do conteúdo.
const L = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
const PN = (d: string) => `<path d="${d}" fill="none"/>`
const KB = (d: string) => `<path d="${d}" fill="$A" stroke="none"/>`
const sp2 = (x: number, y: number, r: number) => ci(x, y, r) + dotA(x, y, r * 0.38)
const faderN = (n: number) => Array.from({ length: n }, (_, i) => { const x = 14 + i * (72 / (n - 1)); return L(x, 30, x, 70) + dotA(x, i % 2 ? 42 : 56, 3.4) }).join('')
const rackN = rr(14, 6, 72, 88, 3) + L(14, 28, 86, 28) + L(14, 50, 86, 50) + L(14, 72, 86, 72) + dotA(74, 17, 3.4)
/** Microfone com pedestal (vista lateral): cápsula com ponto-chave, corpo, haste e base. cx = centro, k = escala. */
const micN = (cx: number, k = 1) => {
  const X = (v: number) => +(cx + (v - 50) * k).toFixed(1), Y = (v: number) => +(10 + (v - 4) * k).toFixed(1)
  return ci(X(50), Y(24), 18 * k) + dotA(X(50), Y(24), 7 * k) + pa(`M${X(42)} ${Y(44)} L${X(58)} ${Y(44)} L${X(55)} ${Y(76)} H${X(45)} Z`) + L(X(50), Y(76), X(50), Y(92)) + L(X(32), Y(92), X(68), Y(92))
}
const LEG: Record<string, [number, number, number, number, string]> = {
  drums: [8, 13, 89, 77, ci(48, 64, 26, 0.12) + dotA(48, 64, 9) + ci(82, 28, 15, 0.12) + dotA(82, 28, 5) + ci(20, 34, 12, 0.12)],
  perc: [8, 22, 86, 60, ci(34, 56, 26, 0.12) + dotA(34, 56, 9) + ci(76, 40, 18, 0.12) + dotA(76, 40, 6)],
  keys: [2, 20, 96, 60, rr(2, 20, 96, 60, 4) + [14, 26, 38, 50, 62, 74, 86].map(x => L(x, 20, x, 80)).join('') + dotA(90, 28, 3)],
  piano: [6, 10, 88, 80, pa('M6 10 H70 Q94 10 94 34 Q94 58 70 62 L56 90 H6 Z') + L(6, 62, 56, 62) + dotA(62, 34, 4.5)],
  guitar_amp: [8, 14, 84, 72, rr(8, 14, 84, 72, 4) + sp2(50, 56, 20) + L(8, 28, 92, 28)],
  bass_amp: [6, 10, 88, 80, rr(6, 10, 88, 80, 4) + sp2(30, 58, 17) + sp2(70, 58, 17) + L(6, 28, 94, 28)],
  acoustic: [26, 2, 48, 88, ci(50, 66, 24) + ci(50, 34, 16) + dotA(50, 66, 8) + rr(46, 2, 8, 20, 2)],
  horn: [14, 30, 74, 60, pa('M14 60 L60 60 L88 30 L88 90 L60 60') + dotA(30, 60, 8)],
  strings: [28, 4, 44, 88, '<ellipse cx="50" cy="62" rx="22" ry="30" fill="$I" fill-opacity=".1"/>' + rr(46, 4, 8, 30, 2) + L(34, 74, 66, 74) + dotA(50, 62, 5)],
  dj: [4, 24, 92, 52, rr(4, 24, 92, 52, 4) + sp2(26, 50, 16) + sp2(74, 50, 16) + rr(42, 34, 16, 32, 2)],
  laptop: [4, 18, 92, 66, rr(14, 18, 72, 46, 3) + pa('M4 72 H96 L88 84 H12 Z') + dotA(50, 41, 5)],
  vocal: [30, 10, 40, 90, micN(50)],
  backing: [12, 10, 76, 72, micN(28, 0.8) + micN(72, 0.8)],
  stool: [12, 12, 76, 76, ci(50, 50, 38) + dotA(50, 50, 7)],
  wedge: [4, 12, 92, 78, pa('M4 90 L24 12 H76 L96 90 Z') + sp2(50, 58, 14)],
  sidefill: [14, 4, 72, 92, rr(14, 4, 72, 92, 4) + sp2(50, 28, 16) + sp2(50, 72, 16)],
  iem: [16, 16, 68, 68, ci(50, 50, 34) + PN('M40 40 Q50 30 60 40 Q66 52 56 64') + dotA(50, 50, 5)],
  mon_desk: [4, 16, 92, 68, rr(4, 16, 92, 68, 4) + faderN(5)],
  foh_desk: [4, 16, 92, 68, rr(4, 16, 92, 68, 4) + faderN(7)],
  lxdesk: [4, 16, 92, 68, rr(4, 16, 92, 68, 4) + faderN(4)],
  rack: [14, 6, 72, 88, rackN],
  dimmer: [14, 6, 72, 88, rackN],
  di: [16, 24, 68, 52, rr(16, 24, 68, 52, 4) + dotA(50, 50, 10)],
  power: [12, 12, 76, 76, ci(50, 50, 38) + KB('M56 18 L36 54 H52 L44 82 L66 44 H50 Z')],
  ledpar: [14, 4, 72, 82, ci(50, 50, 36) + dotA(50, 50, 18) + rr(24, 4, 52, 10, 2)],
  moving_spot: [18, 6, 64, 86, rr(26, 6, 48, 24, 4) + rr(18, 34, 64, 58, 14) + dotA(50, 62, 14)],
  moving_beam: [4, 4, 92, 92, ci(50, 50, 34) + L(50, 4, 50, 96) + L(4, 50, 96, 50) + dotA(50, 50, 9)],
  moving_wash: [12, 12, 76, 76, ci(50, 50, 38) + PN('M26 50 A24 24 0 1 1 74 50 A24 24 0 1 1 26 50') + dotA(50, 50, 10)],
  strobe: [4, 20, 92, 60, rr(4, 20, 92, 60, 4) + KB('M50 28 L40 54 H52 L46 74 L62 46 H50 Z')],
  blinder: [4, 20, 92, 60, rr(4, 20, 92, 60, 4) + dotA(30, 50, 14) + dotA(70, 50, 14)],
  ellips: [26, 4, 48, 92, rr(26, 4, 48, 92, 6) + L(26, 34, 74, 34) + dotA(50, 70, 16)],
  follow: [22, 6, 56, 90, rr(22, 6, 56, 70, 6) + ci(50, 40, 18) + dotA(50, 40, 8) + L(50, 76, 50, 96) + L(30, 96, 70, 96)],
  fog: [8, 24, 84, 52, rr(8, 24, 84, 52, 6) + PN('M30 40 Q38 30 46 40 T62 40 T78 40') + dotA(50, 62, 5)],
}
/* ---- Estilo S "Planta detalhada": silhuetas que lembram a peça (detalhes finos herdam o traço do grupo) ---- */
const dl = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" opacity=".6"/>`
const dr = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" opacity=".6"/>`
const blk = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="$I" fill-opacity=".6" stroke="none"/>`
const knobs = (n: number, x0: number, x1: number, y: number, r = 3) => Array.from({ length: n }, (_, i) => dr(+(x0 + (n === 1 ? 0 : i * (x1 - x0) / (n - 1))).toFixed(1), y, r)).join('')
const consoleS = (n: number, w = 100, h = 76) => rr(0, 0, w, h, 4) + knobs(n, 9, w - 9, 11) + Array.from({ length: n }, (_, i) => { const x = +(9 + i * (w - 18) / (n - 1)).toFixed(1); return dl(x, 24, x, h - 10) + rr(x - 3.5, i % 2 ? 38 : 50, 7, 9, 1.5, 0.5) }).join('') + dotA(w - 6, h - 6, 2.6)
const keysS = (w: number, y: number, h: number, n: number) => {
  const st = w / n
  return rr(0, y, w, h, 3) + Array.from({ length: n - 1 }, (_, i) => dl(+((i + 1) * st).toFixed(1), y + h * 0.4, +((i + 1) * st).toFixed(1), y + h)).join('') +
    Array.from({ length: n - 1 }, (_, i) => (i % 7 === 2 || i % 7 === 6) ? '' : blk(+((i + 1) * st - st * 0.28).toFixed(1), y, +(st * 0.56).toFixed(1), h * 0.55)).join('')
}
const parS = (lens: string) => rr(40, 0, 20, 9, 2, 0.14) + L(50, 9, 50, 18) + PN('M14 62 V44 Q14 18 50 18 Q86 18 86 44 V62') + ci(50, 62, 32) + dr(50, 62, 24) + lens
const moverS = (head: string) => rr(22, 92, 56, 10, 3, 0.14) + rr(8, 34, 10, 62, 4, 0.14) + rr(82, 34, 10, 62, 4, 0.14) + head
const SGEOM: Record<string, [number, number, number, number, string]> = {
  drums: [1, 1, 98, 86, dr(14, 14, 12) + dr(86, 16, 13) + ci(8, 38, 6, 0.12) + ci(50, 64, 22, 0.14) + dr(50, 64, 13) + dotA(50, 64, 5) + ci(38, 36, 11, 0.12) + ci(62, 36, 11, 0.12) + ci(18, 62, 10, 0.12) + dotA(18, 62, 3) + ci(86, 60, 12, 0.12)],
  edrums: [2, 2, 96, 82, ci(24, 24, 15, 0.12) + ci(50, 16, 14, 0.12) + ci(76, 24, 15, 0.12) + ci(16, 60, 13, 0.12) + dotA(16, 60, 4) + ci(84, 60, 13, 0.12) + rr(36, 46, 28, 36, 4, 0.14) + knobs(2, 44, 56, 56, 2.4) + dl(40, 70, 60, 70)],
  perc: [4, 8, 92, 84, ci(32, 56, 28, 0.12) + dr(32, 56, 19) + dotA(32, 56, 7) + ci(76, 40, 20, 0.12) + dr(76, 40, 13) + dotA(76, 40, 5)],
  pads: [0, 0, 100, 78, rr(0, 0, 47, 36, 6, 0.12) + rr(53, 0, 47, 36, 6, 0.12) + rr(0, 42, 47, 36, 6, 0.12) + rr(53, 42, 47, 36, 6, 0.12) + dotA(23, 18, 5)],
  keys: [0, 0, 120, 52, rr(0, 0, 120, 16, 3, 0.14) + knobs(4, 10, 40, 8, 2.6) + dotA(108, 8, 2.8) + keysS(120, 16, 36, 22)],
  organ: [0, 0, 120, 74, keysS(120, 0, 32, 22) + keysS(120, 38, 32, 22) + rr(0, 62, 120, 12, 3, 0.14) + dotA(10, 68, 2.6)],
  piano: [4, 4, 92, 92, pa('M10 62 V16 Q10 4 24 4 H52 Q92 6 92 40 Q92 58 74 62 Z') + dl(36, 12, 36, 52) + `<g transform="translate(5 0)">${keysS(82, 64, 30, 12)}</g>` + dotA(66, 34, 4)],
  guitar_amp: [0, 0, 100, 80, rr(0, 0, 100, 80, 6, 0.12) + rr(0, 0, 100, 18, 6, 0.16) + knobs(5, 14, 86, 9, 3.2) + ci(50, 49, 26, 0.1) + dr(50, 49, 17) + dotA(50, 49, 6)],
  bass_amp: [0, 0, 80, 100, rr(0, 0, 80, 26, 5, 0.16) + knobs(4, 14, 66, 13, 3) + dotA(70, 13, 2.2) + rr(0, 28, 80, 72, 5, 0.12) + ci(40, 48, 15, 0.1) + dr(40, 48, 9) + dotA(40, 48, 3.4) + ci(40, 80, 15, 0.1) + dr(40, 80, 9) + dotA(40, 80, 3.4)],
  acoustic_amp: [0, 0, 100, 90, rr(0, 0, 100, 90, 8, 0.12) + rr(30, 4, 40, 7, 3, 0.2) + knobs(3, 18, 82, 22, 3) + ci(50, 56, 22, 0.1) + dr(50, 56, 13) + dotA(50, 56, 5)],
  multifx: [0, 0, 100, 50, rr(0, 0, 100, 50, 5, 0.12) + knobs(4, 14, 86, 14, 4) + rr(14, 28, 14, 12, 3, 0.2) + rr(38, 28, 14, 12, 3, 0.2) + rr(62, 28, 14, 12, 3, 0.2) + dotA(88, 34, 3)],
  pedalboard: [0, 0, 100, 60, rr(0, 0, 100, 60, 4, 0.1) + rr(6, 6, 20, 48, 3, 0.16) + dr(16, 18, 4) + dotA(16, 44, 3) + rr(30, 6, 20, 48, 3, 0.16) + dr(40, 18, 4) + dotA(40, 44, 3) + rr(54, 6, 20, 48, 3, 0.16) + dr(64, 18, 4) + dotA(64, 44, 3) + rr(78, 6, 16, 48, 3, 0.16) + dr(86, 18, 4)],
  acoustic: [24, 0, 52, 100, rr(45, 0, 10, 10, 2, 0.16) + rr(46.5, 8, 7, 38, 1.5, 0.14) + pa('M50 44 C66 44 70 56 62 64 C74 70 76 90 62 96 C54 100 46 100 38 96 C24 90 26 70 38 64 C30 56 34 44 50 44 Z') + dr(50, 70, 8) + dotA(50, 70, 3.4) + rr(40, 86, 20, 4, 1.5, 0.3)],
  strings: [26, 0, 48, 100, rr(45, 0, 10, 8, 2, 0.16) + rr(47, 6, 6, 40, 1.5, 0.14) + pa('M50 40 C60 38 66 48 62 56 C72 60 74 78 64 88 C58 94 42 94 36 88 C26 78 28 60 38 56 C34 48 40 38 50 40 Z') + dl(42, 62, 42, 76) + dl(58, 62, 58, 76) + dotA(50, 74, 3.4)],
  horn: [2, 14, 96, 72, pl('M60 52 H24 Q8 52 8 40 Q8 28 24 28 H56') + pa('M60 38 L96 14 V86 L60 62 Z', 0.12) + ci(34, 52, 4, 0.3) + ci(44, 52, 4, 0.3) + ci(54, 52, 4, 0.3) + dotA(8, 40, 3)],
  dj: [0, 4, 100, 62, rr(0, 4, 100, 62, 5, 0.1) + ci(24, 36, 19, 0.12) + dr(24, 36, 11) + dotA(24, 36, 4) + ci(76, 36, 19, 0.12) + dr(76, 36, 11) + dotA(76, 36, 4) + rr(43, 12, 14, 48, 3, 0.16) + dl(50, 18, 50, 54) + rr(46, 34, 8, 8, 1.5, 0.5)],
  laptop: [0, 0, 100, 78, rr(12, 0, 76, 50, 4, 0.1) + rr(17, 5, 66, 40, 2, 0.08) + dotA(50, 25, 5) + pa('M0 78 L8 56 H92 L100 78 Z', 0.14) + dl(36, 70, 64, 70)],
  stool: [14, 14, 72, 72, ci(50, 50, 24, 0.12) + dotA(50, 50, 5) + L(50, 50, 50, 84) + L(50, 50, 20, 34) + L(50, 50, 80, 34) + ci(50, 84, 3, 0.4) + ci(20, 34, 3, 0.4) + ci(80, 34, 3, 0.4)],
  chair: [10, 0, 80, 100, rr(10, 0, 80, 20, 6, 0.16) + rr(14, 26, 72, 70, 8, 0.1) + dotA(50, 62, 5)],
  wedge: [2, 14, 96, 72, pa('M2 86 L22 14 H78 L98 86 Z', 0.12) + ci(50, 62, 16, 0.1) + dr(50, 62, 9) + dotA(50, 62, 3.4) + rr(36, 24, 28, 8, 3, 0.2)],
  mon_desk: [0, 0, 100, 76, consoleS(6)],
  foh_desk: [0, 0, 100, 76, consoleS(9)],
  lxdesk: [0, 0, 100, 76, consoleS(5)],
  wireless: [0, 7, 100, 63, L(18, 10, 18, 26) + L(82, 10, 82, 26) + dotA(18, 10, 2.6) + dotA(82, 10, 2.6) + rr(0, 26, 100, 44, 4, 0.12) + knobs(2, 14, 30, 48, 4) + rr(46, 38, 32, 8, 2, 0.2) + dotA(88, 48, 3)],
  snake: [0, 0, 100, 56, rr(0, 0, 100, 56, 4, 0.12) + Array.from({ length: 8 }, (_, i) => ci(12 + i * 11, 18, 4.4, 0.2) + ci(12 + i * 11, 40, 4.4, 0.2)).join('') + dotA(94, 6, 2.4)],
  pa_main: [0, 0, 100, 84, rr(0, 0, 100, 84, 5, 0.12) + rr(14, 8, 72, 12, 3, 0.2) + ci(28, 54, 19, 0.1) + dr(28, 54, 11) + dotA(28, 54, 4) + ci(72, 54, 19, 0.1) + dr(72, 54, 11) + dotA(72, 54, 4)],
  sub: [0, 0, 100, 100, rr(0, 0, 100, 100, 7, 0.12) + ci(50, 50, 33, 0.1) + dr(50, 50, 22) + dr(50, 50, 12) + dotA(50, 50, 5) + rr(36, 4, 28, 5, 2, 0.3) + rr(36, 91, 28, 5, 2, 0.3)],
  strip: [0, 0, 100, 24, rr(0, 0, 100, 24, 4, 0.12) + [14, 34, 54, 74].map(x => rr(x, 5, 16, 14, 3, 0.16) + dotA(x + 5, 12, 1.6) + dotA(x + 11, 12, 1.6)).join('') + dotA(94, 12, 2.4)],
  par64: [0, 0, 100, 100, parS(dotA(50, 62, 8))],
  par56: [0, 0, 100, 100, parS(dotA(50, 62, 8))],
  par38: [0, 0, 100, 100, parS(dotA(50, 62, 8))],
  pinspot: [0, 0, 100, 100, parS(dotA(50, 62, 5))],
  ledpar: [0, 0, 100, 100, parS([[50, 62], [50, 49], [50, 75], [39, 56], [61, 56], [39, 68], [61, 68]].map(([x, y]) => dotA(x, y, 3.4)).join(''))],
  ledpanel: [0, 0, 100, 100, rr(0, 0, 100, 100, 6, 0.12) + [22, 50, 78].flatMap(x => [22, 50, 78].map(y => ci(x, y, 8, 0.14) + dotA(x, y, 3))).join('')],
  fresnel: [0, 0, 100, 100, rr(40, 0, 20, 9, 2, 0.14) + L(50, 9, 50, 18) + PN('M12 66 V46 Q12 18 50 18 Q88 18 88 46 V66') + rr(0, 36, 10, 40, 2, 0.2) + rr(90, 36, 10, 40, 2, 0.2) + ci(50, 66, 34, 0.12) + dr(50, 66, 26) + dr(50, 66, 18) + dr(50, 66, 10) + dotA(50, 66, 4)],
  pc: [0, 0, 100, 100, rr(40, 0, 20, 9, 2, 0.14) + L(50, 9, 50, 18) + PN('M12 66 V46 Q12 18 50 18 Q88 18 88 46 V66') + ci(50, 66, 34, 0.12) + dr(50, 66, 22) + ci(50, 66, 10, 0.2) + dotA(50, 66, 4) + rr(34, 94, 32, 6, 2, 0.2)],
  ellips: [14, 0, 72, 100, rr(28, 0, 44, 28, 7, 0.14) + rr(33, 28, 34, 40, 3, 0.1) + dl(33, 44, 67, 44) + ci(50, 80, 20, 0.12) + dr(50, 80, 12) + dotA(50, 80, 5) + PN('M18 60 V50 Q18 40 28 40') + PN('M82 60 V50 Q82 40 72 40')],
  moving_spot: [0, 0, 100, 102, moverS(rr(24, 12, 52, 66, 22, 0.12) + ci(50, 50, 15, 0.1) + dr(50, 50, 8) + dotA(50, 50, 4) + rr(34, 4, 32, 12, 4, 0.2))],
  moving_beam: [0, 0, 100, 102, moverS(rr(32, 8, 36, 72, 16, 0.12) + ci(50, 44, 9, 0.1) + dotA(50, 44, 4))],
  moving_wash: [0, 0, 100, 102, moverS(rr(20, 12, 60, 66, 24, 0.12) + dr(50, 46, 22) + [[50, 46], [50, 33], [61, 40], [61, 52], [50, 59], [39, 52], [39, 40]].map(([x, y]) => dotA(x, y, 3)).join('') + rr(34, 4, 32, 12, 4, 0.2))],
  blinder: [0, 0, 100, 62, rr(0, 0, 100, 62, 6, 0.12) + ci(28, 31, 20, 0.1) + dr(28, 31, 12) + dotA(28, 31, 5) + ci(72, 31, 20, 0.1) + dr(72, 31, 12) + dotA(72, 31, 5)],
  mirrorball: [0, 0, 100, 100, L(50, 0, 50, 24) + rr(42, 20, 16, 8, 2, 0.2) + ci(50, 64, 34, 0.12) + dr(50, 64, 22) + dl(16, 64, 84, 64) + dl(50, 30, 50, 98) + dotA(38, 52, 4)],
}
/** "Planta detalhada" usa SGEOM (ou LEG); os pacotes P (Apple) e F (Figma) usam glifos próprios (packs.ts) na MESMA pegada do item. */
const withLegacy = (d: IconDef): IconDef => ({
  ...d,
  build: P => {
    const b = d.build(P), g = SGEOM[d.id] ?? LEG[d.id]
    let w = b.w, h = b.h, svg = b.svg
    if (g) {
      const [bx, by, bw, bh, art] = g, s = Math.max(b.w, b.h) / Math.max(bw, bh)
      w = bw * s; h = bh * s
      svg = `<g transform="scale(${s.toFixed(4)}) translate(${-bx} ${-by})" stroke-width="$W(${s.toFixed(4)})">${art}</g>`
    }
    const st = curStyle()
    if (st === 'D') { const dy = DYN[d.id]; if (dy) { const g = dy(P); return { w: g.w, h: g.h, svg: packSvg(g, g.w, g.h) } } }
    if (st !== 'S') { const pk = PACKS[st][d.id]; if (pk) return { w, h, svg: packSvg(pk, w, h) } }
    return { w, h, svg }
  },
})

export const ICONS: IconDef[] = [
  drums, edrums, perc, pads, keys, organ, piano, accordion, guitarAmp, bassAmp, ampAc, multifx, pedalboard, acoustic, horn, strings, dj, laptop, vocal, backing, choir, talkback, stool, chair, musicStand, stand, fan, rug,
  wedge, sidefill, iem, pmix, monDesk, fohDesk, rack, wireless, snake, di,
  paMain, subw, fohTower,
  ac, strip, power, breaker, gen, net,
  riser, screenItem, teleprompter, backdrop, textNote, arrow,
  par64, par56, par38, pinspot, ledpar, ledpanel, fresnel, pc, ellips, mspot, mbeam, mwash, ledbar, uvbar, scanner, strobe, blinder, cyc, follow, mirrorball, laser, fog, haze, cannon, truss, lightStand, dimmer, dmxSplit, lxdesk, lpower,
].map(withLegacy)

export const ICON_MAP: Record<string, IconDef> = Object.fromEntries(ICONS.map(i => [i.id, i]))
export const KIND_ALIAS: Record<string, string> = { click: 'laptop', par: 'ledpar', moving: 'moving_spot', beam: 'moving_beam', wash: 'moving_wash' }

export const CAT_LABEL: Record<IconDef['cat'], { pt: string; en: string }> = {
  inst: { pt: 'Instrumentos', en: 'Instruments' }, amp: { pt: 'Amplificadores', en: 'Amps' }, vox: { pt: 'Vocais', en: 'Vocals' },
  mon: { pt: 'Retornos', en: 'Monitors' }, foh: { pt: 'Mesas e racks', en: 'Desks & racks' }, misc: { pt: 'Palco', en: 'Stage' },
  pa: { pt: 'PA / Som', en: 'PA / Sound' }, power: { pt: 'Energia e rede', en: 'Power & network' },
  light: { pt: 'Luz', en: 'Lighting' }, fixture: { pt: 'Refletores', en: 'Fixtures' }, moving: { pt: 'Móveis', en: 'Moving lights' },
  led: { pt: 'LED', en: 'LED' }, effect: { pt: 'Efeitos', en: 'Effects' }, rig: { pt: 'Estrutura e controle', en: 'Rigging & control' },
}

export const defaultParams = (def: IconDef): Params => Object.fromEntries(def.params.map(p => [p.key, p.def]))
export const itemParams = (it: Pick<Item, 'kind' | 'params'>): Params => { const d = ICON_MAP[it.kind]; return d ? { ...defaultParams(d), ...(it.params ?? {}) } : {} }
export const buildItem = (it: Pick<Item, 'kind' | 'params'>): Built | null => { const d = ICON_MAP[it.kind]; return d ? d.build(itemParams(it)) : null }
export const iconName = (kind: string, lang: Lang) => ICON_MAP[kind]?.label[lang] ?? kind
export const itemSpec = (it: Pick<Item, 'kind' | 'params'>, lang: Lang): string => {
  const d = ICON_MAP[it.kind]; return d?.spec ? d.spec(itemParams(it), (pt, en) => (lang === 'pt' ? pt : en)) : ''
}
