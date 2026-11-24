import { inputList, outputList, powerList } from '../model/derive'
import type { Project } from '../model/types'

/** Partes do PDF, sempre nesta ordem fixa: capa, rider, mapa de palco, input list, mapa de luz e página de conclusão (mesmas informações da capa, sem foto). */
export type Part = 'intro' | 'rider' | 'stage' | 'inputs' | 'light' | 'outro'
export const PART_ORDER: Part[] = ['intro', 'rider', 'stage', 'inputs', 'light', 'outro']

const filled = (s?: string) => !!s && s.trim().length > 0
export const people = (p: Project) => p.members.filter(m => filled(m.name) || filled(m.role))
export const riderSections = (p: Project) => p.sections.filter(s => s.enabled && filled(s.body))
export const hasStage = (p: Project) => p.items.some(i => i.board === 'stage')
export const hasLight = (p: Project) => p.items.some(i => i.board === 'light')

/** Partes que de fato entram no PDF, na ordem fixa: o que não tem dado fica de fora (e a numeração se ajusta). */
export function activeParts(p: Project): Part[] {
  const has: Record<Part, boolean> = { intro: true, rider: riderSections(p).length > 0, stage: hasStage(p), inputs: inputList(p).length > 0 || outputList(p).length > 0 || powerList(p).length > 0, light: hasLight(p), outro: true }
  return PART_ORDER.filter(x => has[x])
}

/** O que NÃO aparecerá no PDF por falta de dado (mostrado na aba Exportar). */
export function pdfOmissions(p: Project): string[] {
  const pt = p.lang === 'pt', o: string[] = []
  const intro: string[] = []
  if (!p.press.photo) intro.push(pt ? 'foto (aba Informações)' : 'photo (Info tab)')
  if (!filled(p.band.year)) intro.push(pt ? 'ano de vigência (aba Informações)' : 'valid-for year (Info tab)')
  if (!(filled(p.band.techName) || filled(p.band.techPhone) || filled(p.band.techEmail))) intro.push(pt ? 'coordenador técnico' : 'technical coordinator')
  if (!(filled(p.band.mgmtName) || filled(p.band.mgmtPhone) || filled(p.band.mgmtEmail))) intro.push(pt ? 'produtor' : 'producer')
  if (intro.length) o.push((pt ? 'Capa, sem: ' : 'Cover, without: ') + intro.join(', '))
  const empty = p.sections.filter(s => s.enabled && !filled(s.body)).length
  if (!riderSections(p).length) o.push(pt ? 'Rider (nenhuma seção com texto)' : 'Rider (no section has text)')
  else if (empty) o.push(pt ? `Rider: ${empty} seção(ões) sem texto` : `Rider: ${empty} section(s) without text`)
  if (!hasStage(p)) o.push(pt ? 'Mapa de palco (sem itens)' : 'Stage plot (no items)')
  if (!inputList(p).length) o.push(pt ? 'Input list (sem canais)' : 'Input list (no channels)')
  if (!outputList(p).length) o.push(pt ? 'Saídas (sem monitores/mixes)' : 'Outputs (no monitors/mixes)')
  if (!hasLight(p)) o.push(pt ? 'Mapa de luz (sem itens)' : 'Light plot (no items)')
  return o
}
