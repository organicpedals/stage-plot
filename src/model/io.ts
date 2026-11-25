import { normalize } from './store'
import { Project, uid } from './types'

/** Envelope dos arquivos .stgp (um ou vários projetos). Arquivos antigos (.json, projeto solto) continuam sendo aceitos na importação. */
export const FILE_APP = 'stageplot'

export const exportPayload = (projects: Project[]) => ({ app: FILE_APP, format: 1, exported: new Date().toISOString(), projects })

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const looksLikeProject = (v: unknown): v is Project =>
  isObj(v) && Array.isArray(v.items) && isObj(v.stage) && isObj(v.band) && typeof v.name === 'string'

/** Lê o texto de um arquivo exportado e devolve projetos prontos para entrar (ids novos, dados normalizados).
 *  Aceita: envelope {projects:[…]}, lista de projetos, projeto único ou o formato antigo. Lança Error com mensagem legível. */
export function parseImport(text: string): Project[] {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error('O arquivo não é um projeto do Stage Plot válido.') }
  const list: unknown[] = Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.projects) ? raw.projects : [raw]
  const ok = list.filter(looksLikeProject)
  if (!ok.length) throw new Error('Nenhum projeto do Stage Plot foi encontrado no arquivo.')
  return ok.map(p => {
    const c = JSON.parse(JSON.stringify(p)) as Project
    c.id = uid()
    c.items = c.items.filter(i => isObj(i) && typeof i.kind === 'string').map(i => ({ ...i, id: i.id || uid() }))
    c.members = Array.isArray(c.members) ? c.members : []
    c.sections = Array.isArray(c.sections) ? c.sections : []
    c.press = isObj(c.press) ? c.press : ({ bio: '', shortBio: '', discography: '', achievements: '', photo: '', logo: '', links: [] } as Project['press'])
    c.lang = c.lang === 'en' ? 'en' : 'pt'
    c.version = c.version || 'v1.0'
    return normalize(c)
  })
}
