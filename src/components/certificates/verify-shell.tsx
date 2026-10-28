import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'

export function VerifyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#0a0a0a] dark:to-[#111] px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Logo href="https://omniflow.com" width={150} height={52} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
            Certificate Verification
          </p>
        </div>
        {children}
        <p className="mt-8 text-center text-xs text-slate-500 dark:text-zinc-500">
          Certificates are issued by OMNI Flow Computers. Only the record shown on this page is authoritative; a
          document with no matching record should be treated as not genuine.
        </p>
      </div>
    </div>
  )
}
