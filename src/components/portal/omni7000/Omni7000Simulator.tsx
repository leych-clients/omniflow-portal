'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { GraduationCap, Keyboard, MousePointerClick, RotateCcw, Info, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  DEVICE_H,
  DEVICE_W,
  KEYBOARD_MAP,
  KEYS,
  KEY_LABEL,
  LCD,
  LED,
  type KeyDef,
} from './keys'
import {
  buildView,
  initialState,
  reduce,
  type KeyId,
  type SimState,
  type View,
} from './sim'
import { CoursePanel } from './CoursePanel'

const MAX_WIDTH = 540
const ROW_H = 20
const BODY_TOP = 38
const MONO = 'Menlo, Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace'

/* ------------------------------------------------------------------ */
/* LCD                                                                 */
/* ------------------------------------------------------------------ */

function Lcd({ view }: { view: View }) {
  const brightness = 0.7 + (view.contrast / 100) * 0.6
  const sub = view.sub

  return (
    <div
      className="absolute overflow-hidden select-none"
      style={{
        left: LCD.x,
        top: LCD.y,
        width: LCD.w,
        height: LCD.h,
        background: '#c5d0dc',
        color: '#141922',
        fontFamily: MONO,
        fontSize: 14.3,
        lineHeight: `${ROW_H}px`,
        filter: `brightness(${brightness})`,
      }}
      aria-live="polite"
      aria-label={`OMNI 7000 display: ${view.title}`}
    >
      {/* Title bar */}
      <div
        className="absolute inset-x-0 top-0 truncate px-[2px] font-semibold"
        style={{ height: 19, lineHeight: '19px', background: '#07090c', color: '#eef2f7' }}
      >
        {view.title}
      </div>

      {/* Sub header */}
      <div
        className="absolute inset-x-0 whitespace-pre"
        style={{ top: 19, height: 16, lineHeight: '16px', background: '#7490b6', color: '#f1f5fa' }}
      >
        {sub.kind === 'runs' ? (
          <>
            <span className="absolute left-[3px]">Meter Run:</span>
            <span className="absolute flex" style={{ left: 103 }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <span
                  key={n}
                  className="inline-block text-center"
                  style={{
                    width: 21.5,
                    background: n === sub.run ? '#0b3bd1' : 'transparent',
                  }}
                >
                  {n}
                </span>
              ))}
            </span>
          </>
        ) : (
          <span className="absolute left-[3px] right-[3px] truncate">{sub.text}</span>
        )}
      </div>

      {/* Rows */}
      {view.rows.map((row, i) => {
        const selected = view.selected === i
        return (
          <div
            key={`${i}-${row.label}`}
            className="absolute"
            style={{
              top: BODY_TOP + i * ROW_H,
              left: 2,
              width: 332,
              height: ROW_H,
              background: selected ? (row.editing ? '#b3260f' : '#0b3bd1') : 'transparent',
              color: selected ? '#fff' : undefined,
            }}
          >
            <span className="absolute whitespace-pre" style={{ left: 6 }}>
              {row.label}
            </span>
            {row.value !== undefined && (
              <span className="absolute whitespace-pre text-right" style={{ left: 120, width: 137 }}>
                {row.value}
              </span>
            )}
            {row.unit && (
              <span className="absolute whitespace-pre" style={{ left: 263 }}>
                {row.unit}
              </span>
            )}
          </div>
        )
      })}

      {/* Scroll arrows */}
      {(view.canScrollUp || view.canScrollDown) && (
        <>
          <Arrow top={42} glyph="▲" active={view.canScrollUp} />
          <Arrow top={162} glyph="▼" active={view.canScrollDown} />
        </>
      )}

      {/* Softkey labels */}
      {view.softkeys.map((label, i) =>
        label ? (
          <div
            key={i}
            className="absolute truncate text-center"
            style={{
              left: 2 + i * 88,
              top: 193,
              width: 85,
              height: 17,
              lineHeight: '17px',
              background: '#16852b',
              color: '#f2fff4',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        ) : null,
      )}

      {/* Glass */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0.06) 100%)',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.35)',
        }}
      />
    </div>
  )
}

function Arrow({ top, glyph, active }: { top: number; glyph: string; active: boolean }) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: 336,
        top,
        width: 15,
        height: 17,
        background: '#0a0c10',
        color: '#fff',
        fontSize: 11,
        lineHeight: 1,
        opacity: active ? 1 : 0.28,
      }}
    >
      {glyph}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Key hotspot                                                         */
/* ------------------------------------------------------------------ */

const SHAPE_RADIUS: Record<KeyDef['shape'], string> = {
  oval: '9999px',
  round: '9999px',
  wedge: '14px',
  key: '10px',
}

function Hotspot({
  def,
  pressed,
  showHints,
  onPress,
  onDown,
  onUp,
}: {
  def: KeyDef
  pressed: boolean
  showHints: boolean
  onPress: (k: KeyId) => void
  onDown: (k: KeyId) => void
  onUp: () => void
}) {
  return (
    <button
      type="button"
      data-hotspot
      aria-label={def.kbd ? `${def.label} (${def.kbd})` : def.label}
      title={def.kbd ? `${def.label}  [${def.kbd}]` : def.label}
      onClick={() => onPress(def.id)}
      onPointerDown={() => onDown(def.id)}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      className={cn(
        'absolute cursor-pointer outline-none transition-[background-color,box-shadow,transform] duration-75',
        'hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400',
        pressed && 'translate-y-px scale-[0.96] bg-black/45 shadow-[inset_0_3px_8px_rgba(0,0,0,0.7)]',
        showHints && !pressed && 'bg-sky-400/20 ring-2 ring-sky-400/80',
      )}
      style={{
        left: def.cx - def.w / 2,
        top: def.cy - def.h / 2,
        width: def.w,
        height: def.h,
        borderRadius: SHAPE_RADIUS[def.shape],
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Simulator                                                           */
/* ------------------------------------------------------------------ */

const GUIDE = [
  'Press HOME for the Main Menu, then use ▲ ▼ and OK to open a screen.',
  'On Meter Run Detail, press ◀ ▶ or keys 1–6 to switch meter runs. Press the “Totals” softkey to flip to totals.',
  'Open Alarms / Events and press the “Ack” softkey. The red LED turns off once everything is acknowledged.',
  'Open Configuration, press OK on a setting, type a number on the keypad, then ENTER to save. Display Contrast changes the screen brightness.',
]

export function Omni7000Simulator() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState)
  const [pressed, setPressed] = useState<KeyId | null>(null)
  const [log, setLog] = useState<string[]>([])
  /** Every key pressed so far. The course uses it to grade "did you use key X". */
  const [keyHistory, setKeyHistory] = useState<KeyId[]>([])
  const [tab, setTab] = useState<'course' | 'free'>('course')
  const [showHints, setShowHints] = useState(false)
  const [scale, setScale] = useState(1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const view = buildView(state)

  // Live data + clock
  useEffect(() => {
    dispatch({ type: 'tick', now: Date.now() })
    const id = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 1000)
    return () => clearInterval(id)
  }, [])

  // Fit the device to its container
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setScale(Math.min(entry.contentRect.width, MAX_WIDTH) / DEVICE_W)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const press = useCallback((key: KeyId) => {
    dispatch({ type: 'key', key })
    setLog((l) => [KEY_LABEL[key] ?? key, ...l].slice(0, 12))
    setKeyHistory((h) => [...h, key])
  }, [])

  const patch = useCallback(
    (fn: (s: SimState) => SimState) => dispatch({ type: 'patch', fn }),
    [],
  )

  const flash = useCallback((key: KeyId) => {
    setPressed(key)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setPressed(null), 130)
  }, [])

  // Computer keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      // Space/Enter on a normal page button (e.g. "Check answer") must activate that button,
      // not press a key on the device. Device hotspots are tagged with data-hotspot.
      if (t?.tagName === 'BUTTON' && !t.hasAttribute('data-hotspot') && (e.key === ' ' || e.key === 'Enter')) return
      const key = KEYBOARD_MAP[e.key]
      if (!key) return
      e.preventDefault()
      if (e.repeat && !/^(up|down|left|right)$/.test(key)) return
      flash(key)
      press(key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flash, press])

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  const releasePointer = useCallback(() => setPressed(null), [])

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
      {/* Device */}
      <div ref={wrapRef} className="w-full" style={{ maxWidth: MAX_WIDTH }}>
        <div
          className="relative mx-auto"
          style={{ width: DEVICE_W * scale, height: DEVICE_H * scale }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: DEVICE_W,
              height: DEVICE_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/omni7000-front.png"
              alt="OMNI 7000 front panel"
              width={DEVICE_W}
              height={DEVICE_H}
              draggable={false}
              className="absolute inset-0 select-none drop-shadow-2xl"
            />

            {/* Alarm LED (covers the LED baked into the photo) */}
            <div
              className="pointer-events-none absolute rounded-full"
              style={{
                left: LED.x - 18,
                top: LED.y - 18,
                width: 36,
                height: 36,
                background: view.alarmLed
                  ? 'radial-gradient(circle, #ffb36b 0%, #ff4a1c 28%, rgba(255,60,20,0.35) 52%, rgba(20,20,20,0) 72%)'
                  : 'radial-gradient(circle, #2a2c30 0%, #1b1d20 45%, rgba(24,24,26,0) 72%)',
                transition: 'background 200ms',
                animation: view.alarmLed ? 'omni7000-pulse 1.4s ease-in-out infinite' : undefined,
              }}
            />

            <Lcd view={view} />

            {KEYS.map((k) => (
              <Hotspot
                key={k.id}
                def={k}
                pressed={pressed === k.id}
                showHints={showHints}
                onPress={press}
                onDown={setPressed}
                onUp={releasePointer}
              />
            ))}
          </div>
        </div>
        <style>{`@keyframes omni7000-pulse{0%,100%{opacity:1}50%{opacity:.55}}`}</style>

        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant={showHints ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowHints((v) => !v)}
            className={showHints ? 'bg-blue-600 text-white hover:bg-blue-700' : undefined}
          >
            <MousePointerClick className="mr-2 h-4 w-4" />
            {showHints ? 'Hide key outlines' : 'Show key outlines'}
          </Button>
        </div>
      </div>

      {/* Side panel */}
      <div className="min-w-0 space-y-5">
        <div
          role="tablist"
          aria-label="Simulator mode"
          className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-white/[0.08] dark:bg-white/[0.05]"
        >
          {(
            [
              { id: 'course', label: 'Guided course', icon: GraduationCap },
              { id: 'free', label: 'Free play', icon: Gamepad2 },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-white/[0.12] dark:text-zinc-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100',
              )}
            >
              <t.icon className="h-4 w-4 shrink-0 opacity-70" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Kept mounted (just hidden) so course progress survives switching tabs. */}
        <div className={cn(tab !== 'course' && 'hidden')}>
          <CoursePanel state={state} keyHistory={keyHistory} onPatch={patch} />
        </div>

        <div className={cn('space-y-5', tab !== 'free' && 'hidden')}>
        <Card className="border-0 shadow-sm dark:border dark:border-white/[0.08]">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                  Free play
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                  Click the keys on the device, or use your keyboard. Currently showing:{' '}
                  <span className="font-medium text-slate-900 dark:text-zinc-100">{view.title}</span>
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  dispatch({ type: 'reset' })
                  setLog([])
                  setKeyHistory([])
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset device
              </Button>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">Try this</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-zinc-400">
                {GUIDE.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm dark:border dark:border-white/[0.08]">
          <CardContent className="space-y-3 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Key presses</h3>
            <div className="flex min-h-8 flex-wrap gap-1.5">
              {log.length === 0 ? (
                <span className="text-sm text-slate-500 dark:text-zinc-500">Nothing pressed yet.</span>
              ) : (
                log.map((l, i) => (
                  <span
                    key={`${i}-${l}`}
                    className={cn(
                      'rounded-md border px-2 py-0.5 font-mono text-xs',
                      i === 0
                        ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-200'
                        : 'border-slate-200 text-slate-600 dark:border-white/[0.08] dark:text-zinc-400',
                    )}
                  >
                    {l}
                  </span>
                ))
              )}
            </div>

            <div className="flex items-start gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
              <Keyboard className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Keyboard: arrows = D-pad, Space = OK, Enter = ENTER, Esc = Back, H = Home, A = Alarms,
                F1–F4 = softkeys, 0–9 . - = keypad.
              </p>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-zinc-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Demo only. Screens, menus and values are simulated and don&apos;t represent the actual
                OMNI 7000 firmware.
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
