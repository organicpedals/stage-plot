import { create } from 'zustand'
import { Board, Item, Project, Section, uid } from './types'
import { ICON_MAP, KIND_ALIAS, defaultParams } from '../library/icons'

const KEY = 'stageplot.v1'

export function defaultSections(lang: 'pt' | 'en' = 'pt'): Section[] {
  const t = lang === 'pt'
    ? [
        ['Formação', 'Banda de 4 integrantes. Duração do show: 60 a 90 min.', true],
        ['Backline', 'Bateria e amplificadores são próprios, salvo indicação. Solicitamos bateria completa com ferragens se o show for em festival.', true],
        ['Monitoração e P.A.', 'P.A. de potência compatível com o local, com subwoofers. 4 vias de retorno independentes (spots). Mesa digital com mínimo de 16 canais.', true],
        ['Iluminação', 'Iluminação de palco com wash frontal e contra-luz; operador de luz disponível.', false],
        ['Energia', 'Pontos de energia 110/220 V (indicar) aterrados nas posições do mapa.', false],
        ['Camarim', 'Camarim com água, toalhas e espelho.', false],
        ['Horários', 'Chegada: 3 h antes. Montagem: 1 h. Passagem de som: 40 min.', true],
        ['Observações', 'Este rider substitui versões anteriores. Itens desejáveis podem ser substituídos mediante acordo prévio com a produção.', false],
      ]
    : [
        ['Line-up', '4-piece band. Set length: 60 to 90 min.', true],
        ['Backline', 'Drums and amps are provided by the band unless noted.', true],
        ['Monitors and PA', 'PA suited to the venue with subwoofers. 4 independent monitor mixes.', true],
        ['Lighting', 'Front wash and backlight; lighting operator available.', false],
        ['Power', 'Grounded power at the marked positions.', false],
        ['Dressing room', 'Dressing room with water and towels.', false],
        ['Schedule', 'Load-in: 3 h before. Setup: 1 h. Soundcheck: 40 min.', true],
        ['Notes', 'This rider supersedes all previous versions.', false],
      ]
  return t.map(([title, body, required]) => ({ id: uid(), title: title as string, body: body as string, required: required as boolean, enabled: true }))
}

export function newItem(kind: string, x: number, y: number): Item {
  const d = ICON_MAP[kind]
  return {
    id: uid(), kind, board: d?.board ?? 'stage', x, y, rot: 0, scale: 1,
    label: '', note: '', who: '', dmx: '', locked: false, params: d ? defaultParams(d) : {},
  }
}

/** Cópia profunda de um item com novo id (deslocada em metros). */
export const cloneItem = (s: Item, dx = 0, dy = 0): Item => ({ ...JSON.parse(JSON.stringify(s)), id: uid(), x: s.x + dx, y: s.y + dy })

// área de transferência interna (copiar/colar entre pranchas e projetos)
const clip: { items: Item[]; n: number } = { items: [], n: 0 }
export const copyItems = (all: Item[], ids: string[]) => { clip.items = all.filter(i => ids.includes(i.id)).map(i => cloneItem(i)); clip.n = 0 }
export const hasClip = () => clip.items.length > 0
export const pasteItems = (board: Board): Item[] => {
  clip.n++
  const d = 0.4 * clip.n
  return clip.items.map(i => { const c = cloneItem(i, d, d); c.board = ICON_MAP[c.kind]?.board === 'light' ? 'light' : board; return c })
}

/** Redimensiona o palco mantendo a composição: os itens acompanham na mesma proporção
 *  (e os ícones escalam junto via autoK), então o desenho parece o mesmo em qualquer tamanho. */
/** O palco é fixo: 16 × 9 m. */
export const STAGE_W = 16, STAGE_D = 9
export function setStageSize(pr: Project, w: number, d: number) {
  const fx = w / pr.stage.w, fy = d / pr.stage.d
  if (fx !== 1 || fy !== 1) for (const it of pr.items) { it.x = +(it.x * fx).toFixed(4); it.y = +(it.y * fy).toFixed(4) }
  pr.stage.w = w; pr.stage.d = d
}

export function newProject(name = 'Nova banda', lang: 'pt' | 'en' = 'pt'): Project {
  const items: Item[] = [
    newItem('drums', 5, 1.9), newItem('bass_amp', 7, 2.2), newItem('guitar_amp', 3, 2.3),
    newItem('keys', 8.6, 3.2), newItem('vocal', 5, 5.2), newItem('wedge', 5, 6.4), newItem('wedge', 2.6, 5.8),
  ]
  items[3].x = 1.6
  const proj: Project = {
    id: uid(), name, version: 'v1.0', updated: new Date().toISOString().slice(0, 10), lang,
    band: { name, genre: '', origin: '', tagline: '', year: String(new Date().getFullYear()), techName: '', techPhone: '', techEmail: '', mgmtName: '', mgmtPhone: '', mgmtEmail: '' },
    members: [{ id: uid(), name: '', role: lang === 'pt' ? 'Voz' : 'Vocals' }],
    stage: { w: 10, d: 7 }, items, chan: { ov: {}, manual: [], order: [], hidden: [] }, sections: defaultSections(lang),
    press: { bio: '', shortBio: '', discography: '', achievements: '', photo: '', logo: '', links: [] },
    edital: { cnpj: '', cache: '', notes: '' },
    template: 'complete', accent: '#FFB020',
  }
  setStageSize(proj, STAGE_W, STAGE_D) // composição de exemplo pensada em 10×7 → escala para o palco fixo
  return proj
}

interface State {
  projects: Project[]
  currentId: string | null
  board: Board
  selected: string[]
  past: Project[]
  future: Project[]
  cur: () => Project | undefined
  setCurrent: (id: string | null) => void
  addProject: (p?: Project) => void
  removeProject: (id: string) => void
  /** edita o projeto atual; push=false evita empilhar histórico (digitação/arraste contínuo) */
  update: (fn: (p: Project) => void, push?: boolean) => void
  checkpoint: () => void
  undo: () => void
  redo: () => void
  setBoard: (b: Board) => void
  select: (ids: string[]) => void
}

/** Atualiza projetos salvos por versões anteriores. */
export function normalize(p: Project): Project {
  if (p.band.year === undefined) p.band.year = String(new Date().getFullYear()) // migração: projetos antigos ganham o ano atual (vazio escolhido pelo usuário é mantido)
  p.chan = { ...{ ov: {}, manual: [], order: [], hidden: [] }, ...(p.chan ?? {}) }
  p.items = p.items.map(it => {
    const kind = KIND_ALIAS[it.kind] ?? it.kind
    const { mic: _m, stand: _s, ...rest } = it as Item & { mic?: string; stand?: string }
    return { ...rest, kind, params: rest.params ?? {} } as Item
  })
  // migração: músicos digitados à mão (itens, input list) passam a constar na lista de integrantes
  const known = new Set((p.members ?? []).map(m => m.name.trim().toLowerCase()).filter(Boolean)); p.members = p.members ?? []
  const names = [...p.items.map(i => i.who), ...Object.values(p.chan.ov).map(o => o?.who), ...p.chan.manual.map(m => m.who)]
  if (!p.membersSynced) for (const n of names) { const t = (n ?? '').trim(); if (t && !known.has(t.toLowerCase())) { known.add(t.toLowerCase()); p.members.push({ id: uid(), name: t, role: '' }) } }
  p.membersSynced = true
  p.sections = splitPowerSection(p.sections ?? [])
  if (p.stage.w !== STAGE_W || p.stage.d !== STAGE_D) setStageSize(p, STAGE_W, STAGE_D) // palco fixo: itens acompanham a proporção
  return p
}

/** Migração: "Energia e camarim" vira duas seções; o texto já escrito é preservado (nada se perde). */
function splitPowerSection(secs: Section[]): Section[] {
  const out: Section[] = []
  for (const s of secs) {
    const pt = /^energia e camarim$/i.test(s.title.trim()), en = /^power and hospitality$/i.test(s.title.trim())
    if (!pt && !en) { out.push(s); continue }
    const m = (pt ? /(^|[\s.])(Camarim[\s\S]*)$/ : /(^|[\s.])(Dressing room[\s\S]*)$/).exec(s.body)
    const cut = m ? m.index + m[1].length : -1
    const power = cut > 0 ? s.body.slice(0, cut).trim() : s.body, dress = cut > 0 ? s.body.slice(cut).trim() : ''
    out.push({ ...s, title: pt ? 'Energia' : 'Power', body: power })
    out.push({ id: uid(), title: pt ? 'Camarim' : 'Dressing room', body: dress, required: false, enabled: s.enabled })
  }
  return out
}

const load = (): { projects: Project[]; currentId: string | null } => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { try { localStorage.setItem(KEY + '.backup', raw) } catch { /* sem espaço: ignora */ } const d = JSON.parse(raw); d.projects = d.projects.map(normalize); return d }
  } catch { /* ignore */ }
  const p = newProject('Minha Banda')
  return { projects: [p], currentId: null }
}

const persist = (s: { projects: Project[]; currentId: string | null }) => {
  try { localStorage.setItem(KEY, JSON.stringify({ projects: s.projects, currentId: s.currentId })) } catch { /* quota */ }
}

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))

export const useStore = create<State>((set, get) => ({
  ...load(),
  board: 'stage', selected: [], past: [], future: [],
  cur: () => get().projects.find(p => p.id === get().currentId),
  setCurrent: id => { set({ currentId: id, selected: [], past: [], future: [] }); persist(get()) },
  addProject: p => { const np = p ?? newProject(); set(s => ({ projects: [...s.projects, np], currentId: np.id, past: [], future: [] })); persist(get()) },
  removeProject: id => { set(s => ({ projects: s.projects.filter(p => p.id !== id), currentId: s.currentId === id ? null : s.currentId })); persist(get()) },
  checkpoint: () => { const p = get().cur(); if (p) set(s => ({ past: [...s.past.slice(-60), clone(p)], future: [] })) },
  update: (fn, push = true) => {
    const s = get(); const p = s.cur(); if (!p) return
    if (push) s.checkpoint()
    set(st => ({ projects: st.projects.map(x => { if (x.id !== p.id) return x; const c = clone(x); fn(c); c.updated = new Date().toISOString().slice(0, 10); return c }) }))
    persist(get())
  },
  undo: () => {
    const s = get(); const p = s.cur(); const prev = s.past[s.past.length - 1]; if (!p || !prev) return
    set({ projects: s.projects.map(x => x.id === prev.id ? prev : x), past: s.past.slice(0, -1), future: [clone(p), ...s.future], selected: [] }); persist(get())
  },
  redo: () => {
    const s = get(); const p = s.cur(); const nxt = s.future[0]; if (!p || !nxt) return
    set({ projects: s.projects.map(x => x.id === nxt.id ? nxt : x), future: s.future.slice(1), past: [...s.past, clone(p)], selected: [] }); persist(get())
  },
  setBoard: board => set({ board, selected: [] }),
  select: selected => set({ selected }),
}))
