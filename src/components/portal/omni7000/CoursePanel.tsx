'use client'

import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleDot,
  GraduationCap,
  Lightbulb,
  MinusCircle,
  Play,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  COURSE_SUMMARY,
  COURSE_TITLE,
  MODULES,
  STEPS,
  stepsForModule,
  type CheckResult,
} from './curriculum'
import type { KeyId, SimState } from './sim'

type Phase = 'intro' | 'running' | 'done'

interface Result {
  attempts: number
  passed: boolean
  skipped: boolean
}

interface Props {
  state: SimState
  /** Every key pressed so far (clicks + keyboard). */
  keyHistory: KeyId[]
  /** Applies a change to the simulated device. */
  onPatch: (fn: (s: SimState) => SimState) => void
}

const SKIP_AFTER_ATTEMPTS = 2

export function CoursePanel({ state, keyHistory, onPatch }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [index, setIndex] = useState(0)
  const [startSeq, setStartSeq] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<CheckResult | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [results, setResults] = useState<Record<string, Result>>({})

  const step = STEPS[index]
  const total = STEPS.length
  const passedCount = STEPS.filter((s) => results[s.id]?.passed).length
  const firstTryCount = STEPS.filter((s) => results[s.id]?.passed && results[s.id].attempts === 1).length
  const skippedCount = STEPS.filter((s) => results[s.id]?.skipped).length
  const stepPassed = !!results[step.id]?.passed

  function beginStep(i: number) {
    setIndex(i)
    setAnswer(null)
    setFeedback(null)
    setShowHint(false)
    setAttempts(0)
    setStartSeq(keyHistory.length)
    onPatch(STEPS[i].setup)
  }

  function start() {
    setResults({})
    setPhase('running')
    beginStep(0)
  }

  function check() {
    const res = step.check({ state, keys: keyHistory.slice(startSeq), answer })
    const n = attempts + 1
    setAttempts(n)
    setFeedback(res)
    setResults((r) => ({
      ...r,
      [step.id]: { attempts: n, passed: res.ok, skipped: false },
    }))
  }

  function next() {
    if (index >= total - 1) {
      setPhase('done')
    } else {
      beginStep(index + 1)
    }
  }

  function skip() {
    setResults((r) => ({ ...r, [step.id]: { attempts, passed: false, skipped: true } }))
    next()
  }

  const isQuestion = !!step.options
  const canCheck = !isQuestion || answer !== null
  const stepModule = MODULES.find((m) => m.id === step.moduleId)!

  return (
    <div className="space-y-5">
      {phase === 'intro' && (
        <Card className="border-0 bg-gradient-to-r from-blue-50 to-slate-50 shadow-lg dark:border dark:border-white/[0.08] dark:from-blue-950/30 dark:to-slate-950/30">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{COURSE_TITLE}</h2>
                <p className="text-sm text-slate-600 dark:text-zinc-400">
                  {MODULES.length} modules · {total} steps · about 10 minutes
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-zinc-400">{COURSE_SUMMARY}</p>
            <ul className="space-y-2 text-sm">
              {MODULES.map((m, i) => (
                <li key={m.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-medium text-slate-900 dark:text-zinc-100">{m.title}</span>
                    <span className="text-slate-600 dark:text-zinc-400"> · {m.summary}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Button onClick={start} className="bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700">
              <Play className="mr-2 h-4 w-4" />
              Start course
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === 'running' && (
        <Card className="border-0 shadow-sm dark:border dark:border-white/[0.08]">
          <CardContent className="space-y-5 p-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-zinc-500">
                <span>
                  Module {MODULES.indexOf(stepModule) + 1} · {stepModule.title}
                </span>
                <span>
                  Step {index + 1} of {total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${(passedCount / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Task */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{step.title}</h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400">{step.prompt}</p>
              {!isQuestion && (
                <p className="text-xs text-slate-500 dark:text-zinc-500">
                  Do it on the device, then press <span className="font-medium">Check answer</span>.
                </p>
              )}
            </div>

            {/* Options */}
            {step.options && (
              <div role="radiogroup" aria-label="Answer" className="grid gap-2 sm:grid-cols-2">
                {step.options.map((o) => {
                  const selected = answer === o.id
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={stepPassed}
                      onClick={() => {
                        setAnswer(o.id)
                        setFeedback(null)
                      }}
                      className={cn(
                        'rounded-lg border px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-default',
                        selected
                          ? 'border-blue-600 bg-blue-50 font-medium text-blue-900 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-100'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:text-zinc-300 dark:hover:bg-white/[0.04]',
                      )}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div
                role="status"
                aria-live="polite"
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 text-sm',
                  feedback.ok
                    ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100'
                    : 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100',
                )}
              >
                {feedback.ok ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{feedback.ok ? 'Correct!' : 'Not quite'}</p>
                  <p>{feedback.ok ? step.explain : feedback.message}</p>
                </div>
              </div>
            )}

            {showHint && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p>{step.hint}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {stepPassed ? (
                <Button onClick={next} className="bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700">
                  {index >= total - 1 ? 'See results' : 'Next step'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={check}
                    disabled={!canCheck}
                    className="bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700"
                  >
                    Check answer
                  </Button>
                  <Button variant="outline" onClick={() => setShowHint((v) => !v)}>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    {showHint ? 'Hide hint' : 'Hint'}
                  </Button>
                  {!isQuestion && (
                    <Button variant="outline" onClick={() => beginStep(index)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restart step
                    </Button>
                  )}
                  {attempts >= SKIP_AFTER_ATTEMPTS && (
                    <Button variant="ghost" onClick={skip} className="text-slate-500 dark:text-zinc-400">
                      Skip step
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {phase === 'done' && (
        <Card className="border-0 bg-gradient-to-r from-blue-50 to-slate-50 shadow-lg dark:border dark:border-white/[0.08] dark:from-blue-950/30 dark:to-slate-950/30">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Course complete</h2>
                <p className="text-sm text-slate-600 dark:text-zinc-400">
                  {passedCount} of {total} steps correct · {firstTryCount} on the first try
                  {skippedCount > 0 ? ` · ${skippedCount} skipped` : ''}
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm">
              {MODULES.map((m) => {
                const steps = stepsForModule(m.id)
                const ok = steps.filter((s) => results[s.id]?.passed).length
                return (
                  <li key={m.id} className="flex items-center justify-between gap-4">
                    <span className="text-slate-900 dark:text-zinc-100">{m.title}</span>
                    <span
                      className={cn(
                        'font-medium',
                        ok === steps.length
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {ok}/{steps.length}
                    </span>
                  </li>
                )
              })}
            </ul>
            <Button onClick={start} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Restart course
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Outline */}
      <Card className="border-0 shadow-sm dark:border dark:border-white/[0.08]">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Course outline</h3>
            <span className="text-xs text-slate-500 dark:text-zinc-500">
              {passedCount}/{total} complete
            </span>
          </div>
          {MODULES.map((m, mi) => (
            <div key={m.id}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                {mi + 1}. {m.title}
              </p>
              <ul className="space-y-1">
                {stepsForModule(m.id).map((s) => {
                  const r = results[s.id]
                  const current = phase === 'running' && s.id === step.id
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
                        current
                          ? 'bg-blue-50 font-medium text-blue-900 dark:bg-blue-500/15 dark:text-blue-100'
                          : 'text-slate-600 dark:text-zinc-400',
                      )}
                    >
                      {r?.passed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                      ) : r?.skipped ? (
                        <MinusCircle className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : current ? (
                        <CircleDot className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-slate-300 dark:text-zinc-600" />
                      )}
                      {s.title}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          <p className="border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
            Demo course. Screens and values are simulated and don&apos;t represent the actual OMNI 7000
            firmware. Keyboard shortcuts work too: arrows, Space = OK, Enter, Esc, H, A, F1–F4, 0–9.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
