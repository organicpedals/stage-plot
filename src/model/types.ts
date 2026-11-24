export type Board = 'stage' | 'light'
export type Lang = 'pt' | 'en'
export type Pv = number | boolean | string

export interface Item {
  id: string
  kind: string // id do ícone
  board: Board
  x: number // metros, centro
  y: number
  rot: number // graus
  scale: number
  label: string
  note: string
  who: string // quem toca / responsável
  dmx: string // endereço DMX (luz)
  locked: boolean
  hidden?: boolean // oculto no mapa (editor e exportações); continua na input list
  params: Record<string, Pv> // parâmetros do equipamento (tons, alto-falantes, watts...)
}

/** Campos editáveis de uma linha da input list. */
export interface ChFields { name: string; source: string; mic: string; stand: string; who: string; phantom: boolean; note: string }
export interface ManualChannel extends ChFields { id: string }
export interface ChanState {
  ov: Record<string, Partial<ChFields>> // edições sobre canais gerados (chave itemId:índice)
  manual: ManualChannel[] // canais adicionados à mão
  order: string[] // ordem personalizada (chaves)
  hidden: string[] // canais gerados removidos
}

export interface Member { id: string; name: string; role: string }
export interface Section { id: string; title: string; body: string; required: boolean; enabled: boolean }
export interface LinkRow { id: string; label: string; url: string }

export interface Project {
  id: string
  name: string
  version: string
  updated: string
  lang: Lang
  band: {
    name: string; genre: string; origin: string; tagline: string
    /** ano de vigência do rider (capa do PDF); padrão = ano atual */
    year: string
    techName: string; techPhone: string; techEmail: string
    mgmtName: string; mgmtPhone: string; mgmtEmail: string
  }
  members: Member[]
  stage: { w: number; d: number; /** fator global do tamanho dos ícones (1 = automático) */ k?: number }
  items: Item[]
  chan: ChanState
  sections: Section[]
  press: { bio: string; shortBio: string; discography: string; achievements: string; photo: string; logo: string; links: LinkRow[] }
  edital: { cnpj: string; cache: string; notes: string }
  template: string
  /** Exporta o PDF em P&B / alto contraste (vale para qualquer modelo). */
  pdfMono?: boolean
  /** modelo visual do PDF (id em export/pdfStyles); valor desconhecido cai no primeiro modelo */
  pdfStyle?: string
  /** cor de destaque dos PDFs (hex); vazio = a do modelo */
  pdfAccent?: string
  /** migração única: músicos digitados à mão já foram para a lista de integrantes */
  membersSynced?: boolean
  accent: string
}

export const uid = () => Math.random().toString(36).slice(2, 10)
