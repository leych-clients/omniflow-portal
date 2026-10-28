import type { KeyId } from './sim'

/** Native size of /images/omni7000-front.png. All coordinates below are in these pixels. */
export const DEVICE_W = 497
export const DEVICE_H = 913

/** Where the simulated LCD sits on top of the photo. */
export const LCD = { x: 76, y: 132, w: 351, h: 212 }

/** Center of the alarm LED in the photo. */
export const LED = { x: 401, y: 89 }

export type KeyShape = 'oval' | 'round' | 'wedge' | 'key'

export interface KeyDef {
  id: KeyId
  /** Human readable name (tooltip, key log). */
  label: string
  /** Computer keyboard shortcut, shown in the help panel. */
  kbd?: string
  /** Center + size, in device pixels. */
  cx: number
  cy: number
  w: number
  h: number
  shape: KeyShape
}

const SOFT_X = [114, 207, 300, 390]
const SOFT_Y = 387
const PAD_X = [109, 205, 301, 396]
const PAD_Y = [628, 687, 745, 803]

const soft = (i: number): KeyDef => ({
  id: `soft${i + 1}` as KeyId,
  label: `Softkey ${i + 1}`,
  kbd: `F${i + 1}`,
  cx: SOFT_X[i],
  cy: SOFT_Y,
  w: 70,
  h: 42,
  shape: 'oval',
})

const pad = (
  id: KeyId,
  label: string,
  col: number,
  row: number,
  kbd?: string,
): KeyDef => ({ id, label, kbd, cx: PAD_X[col], cy: PAD_Y[row], w: 74, h: 42, shape: 'key' })

export const KEYS: KeyDef[] = [
  soft(0),
  soft(1),
  soft(2),
  soft(3),

  { id: 'up', label: 'Up', kbd: '↑', cx: 252, cy: 462, w: 104, h: 30, shape: 'wedge' },
  { id: 'down', label: 'Down', kbd: '↓', cx: 252, cy: 581, w: 104, h: 30, shape: 'wedge' },
  { id: 'left', label: 'Left', kbd: '←', cx: 178, cy: 522, w: 44, h: 98, shape: 'wedge' },
  { id: 'right', label: 'Right', kbd: '→', cx: 326, cy: 522, w: 44, h: 98, shape: 'wedge' },
  { id: 'ok', label: 'OK', kbd: 'Space', cx: 252, cy: 522, w: 68, h: 68, shape: 'round' },

  pad('d1', '1', 0, 0, '1'),
  pad('d2', '2', 1, 0, '2'),
  pad('d3', '3', 2, 0, '3'),
  pad('home', 'Home', 3, 0, 'H'),
  pad('d4', '4', 0, 1, '4'),
  pad('d5', '5', 1, 1, '5'),
  pad('d6', '6', 2, 1, '6'),
  pad('back', 'Back', 3, 1, 'Esc'),
  pad('d7', '7', 0, 2, '7'),
  pad('d8', '8', 1, 2, '8'),
  pad('d9', '9', 2, 2, '9'),
  pad('alarm', 'Alarms', 3, 2, 'A'),
  pad('sign', '+/-', 0, 3, '-'),
  pad('d0', '0', 1, 3, '0'),
  pad('dot', '.', 2, 3, '.'),
  pad('enter', 'Enter', 3, 3, 'Enter'),
]

export const KEY_LABEL: Record<string, string> = Object.fromEntries(
  KEYS.map((k) => [k.id, k.label]),
)

/** Computer keyboard → front-panel key. */
export const KEYBOARD_MAP: Record<string, KeyId> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ' ': 'ok',
  Enter: 'enter',
  Escape: 'back',
  Backspace: 'back',
  h: 'home',
  H: 'home',
  a: 'alarm',
  A: 'alarm',
  '.': 'dot',
  '-': 'sign',
  '+': 'sign',
  F1: 'soft1',
  F2: 'soft2',
  F3: 'soft3',
  F4: 'soft4',
  '0': 'd0',
  '1': 'd1',
  '2': 'd2',
  '3': 'd3',
  '4': 'd4',
  '5': 'd5',
  '6': 'd6',
  '7': 'd7',
  '8': 'd8',
  '9': 'd9',
}
