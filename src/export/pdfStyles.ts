import type { Theme } from './boardSvg'
import type { Doc, TableLook } from './pdfDoc'
import type { RiderSec } from './content'
import { rockfest } from './styles/rockfest'
import { sidebar } from './styles/sidebar'

/**
 * Modelos de PDF. O motor (pdf.ts) só orquestra a ORDEM FIXA das seções e fornece utilitários (texto, quebra, tabelas, fotos, mapas);
 * cada modelo desenha as suas próprias páginas: composição, grade, hierarquia, tipografia, tabelas, cabeçalho e rodapé.
 */
export type StyleId = 'sidebar' | 'rockfest'
export const STYLE_IDS: StyleId[] = ['sidebar', 'rockfest']

export interface Style {
  id: StyleId
  label: { pt: string; en: string }
  desc: { pt: string; en: string }
  /** nome do documento (metadados) */
  name: { pt: string; en: string }
  kicker: { pt: string; en: string }
  /** cores do modelo (papel, tinta, acento, apoio); o P&B troca por preto e branco */
  theme: Theme
  /** tema alternativo usado em páginas específicas (ex.: capa e fechamento escuros) */
  altTheme?: Theme
  /** tema de uma página que está sendo criada (lê d.part e d.page); omitido = `theme` */
  pageTheme?(d: Doc): Theme
  /** aparência das tabelas */
  table: TableLook | ((d: Doc) => TableLook)
  /** margens da página que está sendo criada (lê d.part, d.page e d.W/H) */
  margins(d: Doc): { l: number; r: number; t: number; b?: number }
  /** elementos fixos de fundo da página recém-criada (réguas, barra lateral...). Nunca foto. */
  page?(d: Doc): void
  /** subtítulo dentro de uma seção (ex.: "Saídas"): desenha e avança d.y */
  subhead(d: Doc, text: string): void
  /** página 1: capa + introdução (foto permitida) */
  intro(d: Doc): Promise<void>
  /** rider: a primeira página já foi criada pelo motor; o modelo cria as seguintes com d.addPage() */
  rider(d: Doc, secs: RiderSec[], num: string): void
  /** mapa de palco/luz: uma página paisagem só com o mapa grande */
  board(d: Doc, part: 'stage' | 'light', num: string): Promise<void>
  /** input list + saídas: uma página */
  inputs(d: Doc, num: string): void
  /** cabeçalho/rodapé corrente de uma página */
  chrome(d: Doc, i: number, n: number, W: number, H: number): void
}

export const STYLES: Record<StyleId, Style> = { sidebar, rockfest }
/** Projetos salvos com um modelo que não existe mais caem no primeiro modelo (Sidebar). */
export const styleOf = (p: { pdfStyle?: string }): Style => STYLES[(p.pdfStyle as StyleId) in STYLES ? (p.pdfStyle as StyleId) : STYLE_IDS[0]]
