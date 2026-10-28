/**
 * OMNI 7000 front-panel simulator – state machine.
 *
 * DEMO ONLY: screens, menus and values are simulated for training purposes and
 * do not reflect the real OMNI 7000 firmware menu structure.
 */

export const VISIBLE_ROWS = 7
export const RUN_COUNT = 6

export type KeyId =
  | 'soft1'
  | 'soft2'
  | 'soft3'
  | 'soft4'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'ok'
  | 'd0'
  | 'd1'
  | 'd2'
  | 'd3'
  | 'd4'
  | 'd5'
  | 'd6'
  | 'd7'
  | 'd8'
  | 'd9'
  | 'sign'
  | 'dot'
  | 'home'
  | 'back'
  | 'alarm'
  | 'enter'

export type ScreenId =
  | 'main'
  | 'run-detail'
  | 'run-totals'
  | 'station'
  | 'alarms'
  | 'config'
  | 'diag'

export type ConfigKey =
  | 'contractHour'
  | 'tempOverride'
  | 'pressOverride'
  | 'lowFlowAlarm'
  | 'highTempAlarm'
  | 'contrast'

export interface ConfigField {
  key: ConfigKey
  label: string
  unit: string
  decimals: number
  min: number
  max: number
}

export const CONFIG_FIELDS: ConfigField[] = [
  { key: 'contractHour', label: 'Contract Hour', unit: 'hr', decimals: 0, min: 0, max: 23 },
  { key: 'tempOverride', label: 'Temp Override', unit: 'degF', decimals: 2, min: -40, max: 300 },
  { key: 'pressOverride', label: 'Press Override', unit: 'psia', decimals: 3, min: 0, max: 5000 },
  { key: 'lowFlowAlarm', label: 'Low Flow Alarm', unit: 'Bbl/hr', decimals: 1, min: 0, max: 10000 },
  { key: 'highTempAlarm', label: 'High Temp Alarm', unit: 'degF', decimals: 1, min: 0, max: 300 },
  { key: 'contrast', label: 'Display Contrast', unit: '%', decimals: 0, min: 0, max: 100 },
]

export interface Alarm {
  id: number
  text: string
  time: string
  active: boolean
  acked: boolean
}

interface Pos {
  cursor: number
  top: number
}

export interface SimState {
  stack: ScreenId[]
  pos: Record<ScreenId, Pos>
  run: number
  tick: number
  clock: number
  alarms: Alarm[]
  config: Record<ConfigKey, number>
  edit: { buffer: string } | null
  note: { text: string; tick: number } | null
}

export type Action =
  | { type: 'key'; key: KeyId }
  | { type: 'tick'; now: number }
  | { type: 'reset' }
  /** Used by the course to put the device in a known starting state for a step. */
  | { type: 'patch'; fn: (s: SimState) => SimState }

export interface Row {
  label: string
  value?: string
  unit?: string
  editing?: boolean
}

export interface View {
  screen: ScreenId
  title: string
  sub: { kind: 'runs'; run: number } | { kind: 'text'; text: string }
  rows: Row[]
  selected: number | null
  softkeys: [string, string, string, string]
  canScrollUp: boolean
  canScrollDown: boolean
  contrast: number
  alarmLed: boolean
}

/* ------------------------------------------------------------------ */
/* Initial state                                                       */
/* ------------------------------------------------------------------ */

const SCREEN_IDS: ScreenId[] = [
  'main',
  'run-detail',
  'run-totals',
  'station',
  'alarms',
  'config',
  'diag',
]

export function initialState(): SimState {
  const pos = {} as Record<ScreenId, Pos>
  SCREEN_IDS.forEach((id) => {
    pos[id] = { cursor: 0, top: 0 }
  })
  return {
    // Starts on Meter Run #1 Detail (like the photo) with Main Menu underneath.
    stack: ['main', 'run-detail'],
    pos,
    run: 1,
    tick: 0,
    clock: 0,
    alarms: [
      { id: 1, text: 'Run 3 Low Flow', time: '10:41', active: true, acked: false },
      { id: 2, text: 'Stn High Pressure', time: '10:38', active: true, acked: false },
      { id: 3, text: 'Run 5 Not In Svc', time: '08:12', active: true, acked: true },
      { id: 4, text: 'Power Cycle', time: '06:00', active: false, acked: true },
    ],
    config: {
      contractHour: 7,
      tempOverride: 60,
      pressOverride: 14.73,
      lowFlowAlarm: 100,
      highTempAlarm: 120,
      contrast: 50,
    },
    edit: null,
    note: null,
  }
}

/* ------------------------------------------------------------------ */
/* Simulated live data                                                 */
/* ------------------------------------------------------------------ */

const RUN_BASE = [
  { gross: 1052, temp: 86, press: 231, dens: 0.731, mf: 1.0012 },
  { gross: 874.5, temp: 84.2, press: 229.4, dens: 0.728, mf: 0.9998 },
  { gross: 1210.3, temp: 87.9, press: 233.1, dens: 0.733, mf: 1.0021 },
  { gross: 640.8, temp: 85.1, press: 230.2, dens: 0.73, mf: 1.0005 },
  { gross: 0, temp: 72.4, press: 0.5, dens: 0, mf: 1.0 },
  { gross: 0, temp: 71.9, press: 0.4, dens: 0, mf: 1.0 },
]

const K_FACTOR = 1260

function runLive(run: number, tick: number) {
  const b = RUN_BASE[run - 1]
  const seed = run * 1.7
  // Zero at tick 0 so run #1 matches the reference photo exactly.
  const wob = (k: number) => Math.sin(tick * 0.9 + seed + k) - Math.sin(seed + k)
  const active = b.gross > 0
  const gross = active ? b.gross * (1 + 0.0025 * wob(0)) : 0
  const gsv = gross * 0.9856744
  return {
    active,
    gross,
    gsv,
    nsv: gsv,
    mass: gross * 0.2559011,
    temp: b.temp + 0.04 * wob(1),
    press: b.press + 0.25 * wob(2),
    dens: active ? b.dens + 0.0004 * wob(3) : 0,
    mf: b.mf,
    freq: (gross * K_FACTOR) / 3600,
  }
}

const f = (n: number, d: number) => {
  const s = n.toFixed(d)
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s
}

function detailRows(s: SimState): Row[] {
  const r = runLive(s.run, s.tick)
  return [
    { label: 'Gross(IV) Flow', value: f(r.gross, 3), unit: 'Bbl/hr' },
    { label: 'Net(GSV) Flow', value: f(r.gsv, 3), unit: 'Bbl/hr' },
    { label: 'Mass Flow', value: f(r.mass, 3), unit: 'klb/hr' },
    { label: 'Net(NSV) Flow', value: f(r.nsv, 3), unit: 'Bbl/hr' },
    { label: 'Temperature', value: f(r.temp, 2), unit: 'degF' },
    { label: 'Pressure', value: f(r.press, 3), unit: 'psig' },
    { label: 'UnFactored Flow Dens', value: f(r.dens, 3), unit: 'g/cc' },
    { label: 'Meter Factor', value: f(r.mf, 4), unit: '' },
    { label: 'K-Factor', value: f(K_FACTOR, 2), unit: 'pls/Bbl' },
    { label: 'Pulse Frequency', value: f(r.freq, 2), unit: 'Hz' },
    { label: 'CTL', value: f(r.active ? 0.9987 : 1, 4), unit: '' },
    { label: 'CPL', value: f(r.active ? 1.0004 : 1, 4), unit: '' },
  ]
}

function totalsRows(s: SimState): Row[] {
  const r = runLive(s.run, s.tick)
  const base = 48213.512 + s.run * 1311.37
  const hrs = s.tick / 3600
  return [
    { label: 'Gross Total', value: f(base + r.gross * hrs, 3), unit: 'Bbl' },
    { label: 'Net(GSV) Total', value: f(base * 0.9856744 + r.gsv * hrs, 3), unit: 'Bbl' },
    { label: 'Mass Total', value: f(base * 0.2559011 + r.mass * hrs, 3), unit: 'klb' },
    { label: 'Net(NSV) Total', value: f(base * 0.9856744 + r.nsv * hrs, 3), unit: 'Bbl' },
    { label: 'Prev Day Gross', value: f(r.active ? 25061.2 + s.run * 17.4 : 0, 3), unit: 'Bbl' },
    { label: 'Prev Day Net', value: f(r.active ? 24702.8 + s.run * 17.1 : 0, 3), unit: 'Bbl' },
    { label: 'Prev Day Mass', value: f(r.active ? 6413.9 + s.run * 4.4 : 0, 3), unit: 'klb' },
  ]
}

function stationRows(s: SimState): Row[] {
  const runs = Array.from({ length: RUN_COUNT }, (_, i) => runLive(i + 1, s.tick))
  const live = runs.filter((r) => r.active)
  const sum = (k: 'gross' | 'gsv' | 'mass' | 'nsv') => runs.reduce((a, r) => a + r[k], 0)
  const avg = (k: 'temp' | 'press') =>
    live.length ? live.reduce((a, r) => a + r[k], 0) / live.length : 0
  return [
    { label: 'Station Gross Flow', value: f(sum('gross'), 3), unit: 'Bbl/hr' },
    { label: 'Station Net(GSV)', value: f(sum('gsv'), 3), unit: 'Bbl/hr' },
    { label: 'Station Mass Flow', value: f(sum('mass'), 3), unit: 'klb/hr' },
    { label: 'Station Net(NSV)', value: f(sum('nsv'), 3), unit: 'Bbl/hr' },
    { label: 'Average Temp', value: f(avg('temp'), 2), unit: 'degF' },
    { label: 'Average Pressure', value: f(avg('press'), 3), unit: 'psig' },
    { label: 'Runs In Service', value: `${live.length} of ${RUN_COUNT}`, unit: '' },
  ]
}

function diagRows(s: SimState): Row[] {
  const d = s.clock ? new Date(s.clock) : null
  const two = (n: number) => String(n).padStart(2, '0')
  const up = 3 * 86400 + 4 * 3600 + 12 * 60 + s.tick
  return [
    { label: 'Model', value: 'OMNI 7000', unit: '' },
    { label: 'Firmware', value: 'DEMO 1.00', unit: '' },
    { label: 'Serial No', value: 'DEMO0001', unit: '' },
    {
      label: 'Uptime',
      value: `${Math.floor(up / 86400)}d ${two(Math.floor((up % 86400) / 3600))}:${two(Math.floor((up % 3600) / 60))}`,
      unit: '',
    },
    {
      label: 'Time',
      value: d ? `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}` : '--:--:--',
      unit: '',
    },
    {
      label: 'Date',
      value: d ? `${two(d.getMonth() + 1)}/${two(d.getDate())}/${two(d.getFullYear() % 100)}` : '--/--/--',
      unit: '',
    },
    { label: 'Ethernet', value: 'LINK UP', unit: '' },
    { label: 'Serial Port 1', value: 'OK', unit: '' },
    { label: 'Backup Battery', value: 'GOOD', unit: '' },
    { label: 'CPU Load', value: `${12 + (s.tick % 4)}`, unit: '%' },
  ]
}

function alarmRows(s: SimState): Row[] {
  return s.alarms.map((a) => ({
    label: a.text,
    value: !a.active ? 'CLEARED' : a.acked ? 'ACKED' : 'ACTIVE',
    unit: a.time,
  }))
}

function configRows(s: SimState): Row[] {
  const cursor = s.pos.config.cursor
  return CONFIG_FIELDS.map((fld, i) => {
    const editing = !!s.edit && i === cursor
    return {
      label: fld.label,
      value: editing ? `${s.edit!.buffer}_` : f(s.config[fld.key], fld.decimals),
      unit: fld.unit,
      editing,
    }
  })
}

export const MAIN_MENU: { label: string; target: ScreenId }[] = [
  { label: 'Meter Run Detail', target: 'run-detail' },
  { label: 'Meter Run Totals', target: 'run-totals' },
  { label: 'Station Summary', target: 'station' },
  { label: 'Alarms / Events', target: 'alarms' },
  { label: 'Configuration', target: 'config' },
  { label: 'Diagnostics', target: 'diag' },
]

const SELECTABLE: Record<ScreenId, boolean> = {
  main: true,
  'run-detail': false,
  'run-totals': false,
  station: false,
  alarms: true,
  config: true,
  diag: false,
}

function allRows(s: SimState, screen: ScreenId): Row[] {
  switch (screen) {
    case 'main':
      return MAIN_MENU.map((m) => ({ label: m.label }))
    case 'run-detail':
      return detailRows(s)
    case 'run-totals':
      return totalsRows(s)
    case 'station':
      return stationRows(s)
    case 'alarms':
      return alarmRows(s)
    case 'config':
      return configRows(s)
    case 'diag':
      return diagRows(s)
  }
}

export function currentScreen(s: SimState): ScreenId {
  return s.stack[s.stack.length - 1]
}

export function hasUnackedAlarm(s: SimState) {
  return s.alarms.some((a) => a.active && !a.acked)
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export function buildView(s: SimState): View {
  const screen = currentScreen(s)
  const rows = allRows(s, screen)
  const { top, cursor } = s.pos[screen]
  const selectable = SELECTABLE[screen]

  let title = ''
  let defaultSub = ''
  let sub: View['sub']
  let softkeys: View['softkeys'] = ['', '', 'Pg Up', 'Pg Down']

  switch (screen) {
    case 'main':
      title = 'Main Menu'
      defaultSub = 'UP/DOWN to select, OK to open'
      softkeys = ['Select', '', '', '']
      break
    case 'run-detail':
      title = `Meter Run #${s.run} Detail`
      softkeys = ['Totals', '', 'Pg Up', 'Pg Down']
      break
    case 'run-totals':
      title = `Meter Run #${s.run} Totals`
      softkeys = ['Detail', '', 'Pg Up', 'Pg Down']
      break
    case 'station':
      title = 'Station Summary'
      defaultSub = 'Station 1'
      break
    case 'alarms': {
      const n = s.alarms.filter((a) => a.active && !a.acked).length
      title = 'Alarms / Events'
      defaultSub = n ? `${n} unacknowledged` : 'All alarms acknowledged'
      softkeys = ['Ack', 'Ack All', 'Pg Up', 'Pg Down']
      break
    }
    case 'config':
      title = 'Configuration'
      defaultSub = 'OK or type a number to edit'
      softkeys = ['Edit', '', 'Pg Up', 'Pg Down']
      if (s.edit) {
        defaultSub = 'ENTER=Save  BACK=Cancel'
        softkeys = ['Save', 'Cancel', 'Clear', '']
      }
      break
    case 'diag':
      title = 'Diagnostics'
      defaultSub = 'OMNI 7000 Flow Computer'
      break
  }

  const noteActive = s.note && s.tick - s.note.tick < 4
  if (screen === 'run-detail' || screen === 'run-totals') {
    sub = noteActive
      ? { kind: 'text', text: s.note!.text }
      : { kind: 'runs', run: s.run }
  } else {
    sub = { kind: 'text', text: noteActive ? s.note!.text : defaultSub }
  }

  const maxTop = Math.max(0, rows.length - VISIBLE_ROWS)
  return {
    screen,
    title,
    sub,
    rows: rows.slice(top, top + VISIBLE_ROWS),
    selected: selectable ? cursor - top : null,
    softkeys,
    canScrollUp: top > 0,
    canScrollDown: top < maxTop,
    contrast: s.config.contrast,
    alarmLed: hasUnackedAlarm(s),
  }
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function note(s: SimState, text: string): SimState {
  return { ...s, note: { text, tick: s.tick } }
}

function setPos(s: SimState, screen: ScreenId, p: Partial<Pos>): SimState {
  return { ...s, pos: { ...s.pos, [screen]: { ...s.pos[screen], ...p } } }
}

function moveSelection(s: SimState, screen: ScreenId, delta: number): SimState {
  const len = allRows(s, screen).length
  const p = s.pos[screen]
  const cursor = clamp(p.cursor + delta, 0, len - 1)
  let top = p.top
  if (cursor < top) top = cursor
  if (cursor >= top + VISIBLE_ROWS) top = cursor - VISIBLE_ROWS + 1
  return setPos(s, screen, { cursor, top })
}

function moveScroll(s: SimState, screen: ScreenId, delta: number): SimState {
  const len = allRows(s, screen).length
  const maxTop = Math.max(0, len - VISIBLE_ROWS)
  return setPos(s, screen, { top: clamp(s.pos[screen].top + delta, 0, maxTop) })
}

/** Up / Down / Pg Up / Pg Down shared by every list-style screen. */
function navigateList(s: SimState, screen: ScreenId, key: KeyId): SimState | null {
  const sel = SELECTABLE[screen]
  const move = (d: number) => (sel ? moveSelection(s, screen, d) : moveScroll(s, screen, d))
  switch (key) {
    case 'up':
      return move(-1)
    case 'down':
      return move(1)
    case 'soft3':
      return move(-VISIBLE_ROWS)
    case 'soft4':
      return move(VISIBLE_ROWS)
  }
  return null
}

function push(s: SimState, id: ScreenId): SimState {
  if (currentScreen(s) === id) return s
  return { ...s, stack: [...s.stack, id].slice(-8) }
}

function replaceTop(s: SimState, id: ScreenId): SimState {
  return { ...s, stack: [...s.stack.slice(0, -1), id] }
}

const digitOf = (key: KeyId) => (/^d\d$/.test(key) ? Number(key[1]) : null)

function pressEdit(s: SimState, key: KeyId): SimState {
  const buf = s.edit!.buffer
  const d = digitOf(key)
  if (d !== null) {
    return buf.length >= 10 ? s : { ...s, edit: { buffer: buf + d } }
  }
  switch (key) {
    case 'dot':
      return buf.includes('.') ? s : { ...s, edit: { buffer: (buf === '' ? '0' : buf) + '.' } }
    case 'sign':
      return { ...s, edit: { buffer: buf.startsWith('-') ? buf.slice(1) : '-' + buf } }
    case 'soft3':
      return { ...s, edit: { buffer: '' } }
    case 'back':
    case 'soft2':
      return note({ ...s, edit: null }, 'Entry cancelled')
    case 'ok':
    case 'enter':
    case 'soft1': {
      if (buf === '' || buf === '-') return note({ ...s, edit: null }, 'No change')
      const field = CONFIG_FIELDS[s.pos.config.cursor]
      const v = Number(buf)
      if (!Number.isFinite(v) || v < field.min || v > field.max) {
        return note(s, `Range: ${field.min} to ${field.max}`)
      }
      const rounded = Number(v.toFixed(field.decimals))
      return note(
        { ...s, edit: null, config: { ...s.config, [field.key]: rounded } },
        `${field.label} saved`,
      )
    }
  }
  return s
}

function pressKey(s: SimState, key: KeyId): SimState {
  if (s.edit) return pressEdit(s, key)

  // Global keys
  switch (key) {
    case 'home':
      return { ...s, stack: ['main'] }
    case 'alarm':
      return push(s, 'alarms')
    case 'back':
      return s.stack.length > 1
        ? { ...s, stack: s.stack.slice(0, -1) }
        : note(s, 'Already at Main Menu')
  }

  const screen = currentScreen(s)
  const d = digitOf(key)
  const activate = key === 'ok' || key === 'enter'

  switch (screen) {
    case 'main': {
      if (activate || key === 'soft1') {
        return push(s, MAIN_MENU[s.pos.main.cursor].target)
      }
      if (d !== null && d >= 1 && d <= MAIN_MENU.length) {
        return setPos(s, 'main', { cursor: d - 1, top: 0 })
      }
      return navigateList(s, screen, key) ?? s
    }

    case 'run-detail':
    case 'run-totals': {
      if (key === 'soft1') return replaceTop(s, screen === 'run-detail' ? 'run-totals' : 'run-detail')
      if (key === 'left') return { ...s, run: clamp(s.run - 1, 1, RUN_COUNT) }
      if (key === 'right') return { ...s, run: clamp(s.run + 1, 1, RUN_COUNT) }
      if (d !== null) {
        return d >= 1 && d <= RUN_COUNT ? { ...s, run: d } : note(s, 'Runs are numbered 1 to 6')
      }
      return navigateList(s, screen, key) ?? s
    }

    case 'alarms': {
      if (activate || key === 'soft1') {
        const a = s.alarms[s.pos.alarms.cursor]
        if (!a || !a.active || a.acked) return note(s, 'Nothing to acknowledge')
        return note(
          { ...s, alarms: s.alarms.map((x) => (x.id === a.id ? { ...x, acked: true } : x)) },
          'Alarm acknowledged',
        )
      }
      if (key === 'soft2') {
        const n = s.alarms.filter((x) => x.active && !x.acked).length
        if (!n) return note(s, 'Nothing to acknowledge')
        return note(
          { ...s, alarms: s.alarms.map((x) => (x.active ? { ...x, acked: true } : x)) },
          `${n} alarm${n === 1 ? '' : 's'} acknowledged`,
        )
      }
      return navigateList(s, screen, key) ?? s
    }

    case 'config': {
      if (activate || key === 'soft1') return { ...s, edit: { buffer: '' } }
      if (d !== null) return { ...s, edit: { buffer: String(d) } }
      if (key === 'dot') return { ...s, edit: { buffer: '0.' } }
      if (key === 'sign') return { ...s, edit: { buffer: '-' } }
      return navigateList(s, screen, key) ?? s
    }

    default:
      return navigateList(s, screen, key) ?? s
  }
}

export function reduce(s: SimState, a: Action): SimState {
  switch (a.type) {
    case 'tick':
      return { ...s, tick: s.tick + 1, clock: a.now }
    case 'reset':
      return initialState()
    case 'patch':
      return a.fn(s)
    case 'key':
      return pressKey(s, a.key)
  }
}
