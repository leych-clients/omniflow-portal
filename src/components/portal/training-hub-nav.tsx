'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calendar, Cpu, List, LayoutGrid, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

type TrainingHubTab = 'courses' | 'schedule' | 'simulator'

interface TrainingHubNavProps {
  activeTab: TrainingHubTab
}

export function TrainingHubNav({ activeTab }: TrainingHubNavProps) {
  return (
    <div className="mb-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-zinc-100">Training Center</h1>
          <p className="text-lg text-slate-600 dark:text-zinc-400">
            Browse courses and sign up for upcoming classes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/training/my-registrations">
              <List className="mr-2 h-4 w-4" />
              My classes
            </Link>
          </Button>
          <Button asChild className="bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700">
            <Link href="/training/request">
              <MessageSquare className="mr-2 h-4 w-4" />
              Support & quotes
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-white/[0.08] dark:bg-white/[0.05]">
        <Link
          href="/training"
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-initial',
            activeTab === 'courses'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/[0.12] dark:text-zinc-100'
              : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          )}
        >
          <LayoutGrid className="h-4 w-4 shrink-0 opacity-70" />
          Courses
        </Link>
        <Link
          href="/training/schedule"
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-initial',
            activeTab === 'schedule'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/[0.12] dark:text-zinc-100'
              : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          )}
        >
          <Calendar className="h-4 w-4 shrink-0 opacity-70" />
          Schedule
        </Link>
        <Link
          href="/training/simulator"
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-initial',
            activeTab === 'simulator'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/[0.12] dark:text-zinc-100'
              : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          )}
        >
          <Cpu className="h-4 w-4 shrink-0 opacity-70" />
          OMNI 7000 Simulator
        </Link>
      </div>
    </div>
  )
}
