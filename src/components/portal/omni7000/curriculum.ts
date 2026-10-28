/**
 * OMNI 7000 simulator – guided course content.
 *
 * DEMO ONLY: the tasks teach navigation on the simulated front panel, not the
 * real firmware. Swap the steps below for real course content later.
 */
import {
  buildView,
  currentScreen,
  hasUnackedAlarm,
  initialState,
  MAIN_MENU,
  type KeyId,
  type ScreenId,
  type SimState,
} from './sim'

export interface CheckContext {
  state: SimState
  /** Every key pressed since the step started (clicks and keyboard). */
  keys: KeyId[]
  /** Selected option for question steps. */
  answer: string | null
}

export interface CheckResult {
  ok: boolean
  message: string
}

export interface Step {
  id: string
  moduleId: string
  title: string
  /** What the learner is asked to do or answer. */
  prompt: string
  /** Shown on request. */
  hint: string
  /** Shown after a correct answer. */
  explain: string
  /** Puts the device in a known starting state. */
  setup: (s: SimState) => SimState
  /** Present for multiple-choice questions. */
  options?: { id: string; label: string }[]
  check: (c: CheckContext) => CheckResult
}

export interface CourseModule {
  id: string
  title: string
  summary: string
}

export const COURSE_TITLE = 'OMNI 7000 Fundamentals'
export const COURSE_SUMMARY =
  'Learn to find your way around the OMNI 7000 front panel. Each step asks you to do something on the device or answer a question, then checks your work.'

export const MODULES: CourseModule[] = [
  { id: 'nav', title: 'Getting around', summary: 'Home, menus and reading a screen' },
  { id: 'runs', title: 'Meter runs', summary: 'Switching runs, totals and scrolling' },
  { id: 'alarms', title: 'Alarms', summary: 'The alarm LED and acknowledging alarms' },
  { id: 'config', title: 'Entering values', summary: 'Using the keypad to change settings' },
]

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Clean device (factory demo values) on a given screen stack, keeping the live clock. */
const fresh =
  (stack: ScreenId[], patch: Partial<SimState> = {}) =>
  (s: SimState): SimState => ({
    ...initialState(),
    tick: s.tick,
    clock: s.clock,
    stack,
    ...patch,
  })

const titleOf = (s: SimState) => buildView(s).title
const pass = (message = 'Correct!'): CheckResult => ({ ok: true, message })
const fail = (message: string): CheckResult => ({ ok: false, message })

const unacked = (s: SimState) => s.alarms.filter((a) => a.active && !a.acked)

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

export const STEPS: Step[] = [
  /* ---------------- Getting around ---------------- */
  {
    id: 'nav-home',
    moduleId: 'nav',
    title: 'Go to the Main Menu',
    prompt:
      'The unit is showing a meter run screen. Get back to the Main Menu, the starting point for every other screen.',
    hint: 'Look at the keypad. The key with the house icon, top-right, is HOME.',
    explain: 'HOME always takes you straight to the Main Menu, no matter how deep you are.',
    setup: fresh(['main', 'run-detail']),
    check: ({ state }) =>
      currentScreen(state) === 'main'
        ? pass()
        : fail(`You're still on "${titleOf(state)}". The Main Menu has not been reached yet.`),
  },
  {
    id: 'nav-station',
    moduleId: 'nav',
    title: 'Open Station Summary',
    prompt: 'From the Main Menu, open the Station Summary screen.',
    hint: 'Use the ▲ ▼ keys to highlight an item, then press OK to open it.',
    explain: 'Highlight with ▲ ▼, open with OK. Most screens are reached this way.',
    setup: fresh(['main']),
    check: ({ state }) => {
      const screen = currentScreen(state)
      if (screen === 'station') return pass()
      if (screen === 'main') {
        return fail(
          `You're still on the Main Menu with "${MAIN_MENU[state.pos.main.cursor].label}" highlighted. Highlighting is not enough: press OK to open it.`,
        )
      }
      return fail(`You opened "${titleOf(state)}", not Station Summary.`)
    },
  },
  {
    id: 'nav-read',
    moduleId: 'nav',
    title: 'Read the Station Summary',
    prompt: 'Look at the Station Summary screen. How many meter runs are currently in service?',
    hint: 'Check the last row on the screen: "Runs In Service".',
    explain:
      'Runs 1–4 are flowing; runs 5 and 6 are idle. The Station Summary adds up all runs in service.',
    setup: fresh(['main', 'station']),
    options: [
      { id: '2', label: '2 of 6' },
      { id: '4', label: '4 of 6' },
      { id: '5', label: '5 of 6' },
      { id: '6', label: '6 of 6' },
    ],
    check: ({ answer }) =>
      answer === '4'
        ? pass()
        : fail('Not quite. Look at the "Runs In Service" row on the screen and try again.'),
  },

  /* ---------------- Meter runs ---------------- */
  {
    id: 'runs-switch',
    moduleId: 'runs',
    title: 'Switch to Meter Run #3',
    prompt: 'You are on Meter Run #1 Detail. Switch the display to Meter Run #3.',
    hint: 'Press ▶ twice, or just press the 3 key on the keypad. The highlighted number in the blue bar is the run being shown.',
    explain: '◀ ▶ step through the runs, and the number keys 1–6 jump straight to a run.',
    setup: fresh(['main', 'run-detail']),
    check: ({ state }) => {
      if (currentScreen(state) !== 'run-detail') {
        return fail(`You left the Meter Run Detail screen and are now on "${titleOf(state)}".`)
      }
      return state.run === 3
        ? pass()
        : fail(`The display is on Meter Run #${state.run}. Change it to #3.`)
    },
  },
  {
    id: 'runs-compare',
    moduleId: 'runs',
    title: 'Find the busiest run',
    prompt:
      'Compare the Gross(IV) Flow of the meter runs. Which run has the highest gross flow right now?',
    hint: 'Step through runs 1 to 4 and compare the Gross(IV) Flow row. Runs 5 and 6 are idle.',
    explain: 'Run #3 is flowing about 1210 Bbl/hr, the highest in the station.',
    setup: fresh(['main', 'run-detail']),
    options: [
      { id: '1', label: 'Meter Run #1' },
      { id: '2', label: 'Meter Run #2' },
      { id: '3', label: 'Meter Run #3' },
      { id: '4', label: 'Meter Run #4' },
    ],
    check: ({ answer }) =>
      answer === '3'
        ? pass()
        : fail(
            'Not quite. Switch between the runs and compare their Gross(IV) Flow values before answering.',
          ),
  },
  {
    id: 'runs-totals',
    moduleId: 'runs',
    title: 'Open the totals for Run #2',
    prompt:
      'Show the Totals screen for Meter Run #2. You can use the green softkey labels at the bottom of the screen.',
    hint: 'First switch to run 2 (◀ ▶ or the 2 key), then press the red button under the "Totals" label.',
    explain:
      'The red buttons under the screen are softkeys. Their function is whatever label appears above them, and it changes from screen to screen.',
    setup: fresh(['main', 'run-detail']),
    check: ({ state }) => {
      const screen = currentScreen(state)
      if (screen === 'run-totals') {
        return state.run === 2
          ? pass()
          : fail(`You're on the Totals screen, but for Meter Run #${state.run}. Go back to run 2.`)
      }
      if (screen === 'run-detail') {
        return fail(
          state.run === 2
            ? "You're on Run #2 Detail. Press the softkey labelled \"Totals\" to open the totals."
            : `You're on the Detail screen for Meter Run #${state.run}, not the Totals for run 2.`,
        )
      }
      return fail(`You're on "${titleOf(state)}". Get back to a meter run screen first.`)
    },
  },
  {
    id: 'runs-scroll',
    moduleId: 'runs',
    title: 'Scroll to the CPL value',
    prompt:
      'The Meter Run Detail list is longer than the screen. Scroll until the "CPL" row is visible.',
    hint: 'Press ▼ repeatedly, or use the "Pg Down" softkey to jump a page at a time.',
    explain:
      'The little ▲ ▼ markers on the right of the screen show there is more to scroll. Pg Down moves a whole page at once.',
    setup: fresh(['main', 'run-detail']),
    check: ({ state }) => {
      if (currentScreen(state) !== 'run-detail') {
        return fail(`You're on "${titleOf(state)}". Go back to a Meter Run Detail screen.`)
      }
      const visible = buildView(state).rows.map((r) => r.label)
      return visible.includes('CPL')
        ? pass()
        : fail('The CPL row is not visible yet. Keep scrolling down. CPL is at the bottom of the list.')
    },
  },

  /* ---------------- Alarms ---------------- */
  {
    id: 'alarms-led',
    moduleId: 'alarms',
    title: 'What is the red LED?',
    prompt: 'The red LED in the top-right corner of the unit is glowing. What does it indicate?',
    hint: 'It is related to the alarm key, the one with the radio-wave icon.',
    explain:
      'The LED stays lit while there is at least one alarm that has not been acknowledged. It turns off once all active alarms are acknowledged.',
    setup: fresh(['main', 'run-detail']),
    options: [
      { id: 'power', label: 'The unit is powered on' },
      { id: 'alarm', label: 'There is at least one unacknowledged alarm' },
      { id: 'idle', label: 'One of the meter runs is idle' },
      { id: 'comm', label: 'The Ethernet link is up' },
    ],
    check: ({ answer }) =>
      answer === 'alarm'
        ? pass()
        : fail('Not quite. Think about which front-panel key sits closest to this LED in function.'),
  },
  {
    id: 'alarms-open',
    moduleId: 'alarms',
    title: 'Open the alarm list with the Alarms key',
    prompt: 'Use the dedicated Alarms key to jump straight to Alarms / Events.',
    hint: 'It is the keypad key with the radio-wave icon, right of the 9 key.',
    explain: 'The Alarms key is a shortcut from anywhere on the unit, with no menus needed.',
    setup: fresh(['main', 'run-detail']),
    check: ({ state, keys }) => {
      if (currentScreen(state) !== 'alarms') {
        return fail(`You're on "${titleOf(state)}", not the alarm list.`)
      }
      return keys.includes('alarm')
        ? pass()
        : fail(
            'You got to Alarms / Events through the menu. This step is about the Alarms key. Press HOME, then use the Alarms key instead.',
          )
    },
  },
  {
    id: 'alarms-ack-one',
    moduleId: 'alarms',
    title: 'Acknowledge one alarm',
    prompt:
      'Acknowledge only the "Stn High Pressure" alarm. Leave the other active alarm alone.',
    hint: 'Highlight "Stn High Pressure" with ▼, then press the "Ack" softkey (not "Ack All").',
    explain:
      '"Ack" acknowledges the highlighted alarm only. "Ack All" clears every active one, which is rarely what you want before you have looked at them.',
    setup: fresh(['main', 'alarms']),
    check: ({ state }) => {
      const pressure = state.alarms.find((a) => a.id === 2)!
      const lowFlow = state.alarms.find((a) => a.id === 1)!
      if (pressure.acked && !lowFlow.acked) return pass()
      if (pressure.acked && lowFlow.acked) {
        return fail('You acknowledged both alarms. Use "Ack" on the highlighted row instead of "Ack All".')
      }
      if (!pressure.acked && lowFlow.acked) {
        return fail('You acknowledged "Run 3 Low Flow", the wrong alarm. Check which row is highlighted.')
      }
      return fail('"Stn High Pressure" is still ACTIVE. Highlight it and press the "Ack" softkey.')
    },
  },
  {
    id: 'alarms-ack-all',
    moduleId: 'alarms',
    title: 'Clear the rest and turn off the LED',
    prompt: 'One alarm is still unacknowledged. Acknowledge it so the red LED goes out.',
    hint: 'Either "Ack" on the highlighted active alarm, or "Ack All".',
    explain: 'With nothing left unacknowledged, the LED switches off, which is a quick way to see the unit is clean.',
    setup: fresh(['main', 'alarms'], {
      alarms: initialState().alarms.map((a) => (a.id === 2 ? { ...a, acked: true } : a)),
    }),
    check: ({ state }) => {
      if (!hasUnackedAlarm(state)) return pass()
      const n = unacked(state).length
      return fail(
        `${n} alarm${n === 1 ? ' is' : 's are'} still unacknowledged, so the LED is still lit. Look for the row marked ACTIVE.`,
      )
    },
  },

  /* ---------------- Entering values ---------------- */
  {
    id: 'config-hour',
    moduleId: 'config',
    title: 'Change the Contract Hour',
    prompt: 'Open Configuration and change the Contract Hour from 7 to 6. Make sure it is saved.',
    hint: 'Press OK on Contract Hour, type 6 on the keypad, then press ENTER (bottom-right key) to save.',
    explain:
      'Typing a number on the keypad fills in the value, and nothing is stored until you press ENTER.',
    setup: fresh(['main', 'config']),
    check: ({ state }) => {
      const v = state.config.contractHour
      if (state.edit) {
        return fail(
          `You typed "${state.edit.buffer}" but have not saved it yet. Press ENTER to store the value.`,
        )
      }
      if (v === 6) return pass()
      if (v === 7) return fail('Contract Hour is still 7. Type the new value and press ENTER to save.')
      return fail(`Contract Hour is now ${v}, but it should be 6.`)
    },
  },
  {
    id: 'config-temp',
    moduleId: 'config',
    title: 'Enter a negative decimal',
    prompt: 'Set the Temp Override to -10.5 degF.',
    hint: 'Highlight Temp Override with ▼, then type 10 (+/-) . 5 and press ENTER. The +/- key toggles the sign and the . key adds a decimal point.',
    explain:
      'The +/- key flips the sign and the . key adds the decimal point. Out-of-range entries are refused, so you can never store a nonsense value.',
    setup: fresh(['main', 'config']),
    check: ({ state }) => {
      if (state.edit) {
        return fail(
          `You typed "${state.edit.buffer}" but have not saved it yet. Press ENTER to store the value.`,
        )
      }
      if (state.config.contractHour !== 7) {
        return fail(
          `You changed Contract Hour (now ${state.config.contractHour}) instead of Temp Override. Highlight the right row with ▼ before typing.`,
        )
      }
      const v = state.config.tempOverride
      if (v === -10.5) return pass()
      if (v === 60) return fail('Temp Override is still 60.00. Highlight it, type the value, and press ENTER.')
      return fail(`Temp Override is ${v}, not -10.5. Use +/- for the sign and . for the decimal point.`)
    },
  },
]

export const stepsForModule = (moduleId: string) => STEPS.filter((s) => s.moduleId === moduleId)
