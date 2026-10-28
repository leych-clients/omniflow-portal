import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Building2, CalendarCheck, CalendarX, CheckCircle2, FileText, ShieldAlert, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VerifyShell } from '@/components/certificates/verify-shell'
import { VerifyForm } from '@/components/certificates/verify-form'
import {
  formatCertificateDate,
  normalizeVerificationCode,
  toVerificationResult,
  type VerificationResult,
} from '@/lib/certificates'
import { getCertificateStore } from '@/lib/certificates-store'
import { rateLimitCurrentRequest } from '@/lib/certificates-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Certificate verification | OMNI Flow Computers',
  robots: { index: false, follow: false },
}

type Outcome =
  | { kind: 'rate_limited'; retryAfterSec: number }
  | { kind: 'error' }
  | { kind: 'result'; code: string | null; result: VerificationResult }

async function resolve(rawCode: string): Promise<Outcome> {
  const limit = await rateLimitCurrentRequest()
  if (!limit.ok) return { kind: 'rate_limited', retryAfterSec: limit.retryAfterSec }

  const code = normalizeVerificationCode(decodeURIComponent(rawCode))
  if (!code) return { kind: 'result', code: null, result: { found: false } }
  try {
    return { kind: 'result', code, result: toVerificationResult(await getCertificateStore().getByCode(code)) }
  } catch (e) {
    console.error('verify page:', e)
    return { kind: 'error' }
  }
}

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'green' | 'red' | 'amber'
  icon: React.ReactNode
  title: string
  children?: React.ReactNode
}) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
    red: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
    amber: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  }
  return (
    <div className={`flex items-start gap-3 border-b px-6 py-5 ${tones[tone]}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <h1 className="text-lg font-bold leading-tight">{title}</h1>
        {children && <p className="mt-1 text-sm opacity-90">{children}</p>}
      </div>
    </div>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 text-slate-400 dark:text-zinc-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-zinc-100 break-words">{children}</p>
      </div>
    </div>
  )
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params
  const outcome = await resolve(rawCode)

  if (outcome.kind === 'rate_limited') {
    return (
      <VerifyShell>
        <Card className="shadow-lg overflow-hidden">
          <Banner tone="amber" icon={<AlertTriangle className="h-6 w-6" />} title="Too many attempts">
            Please wait about {outcome.retryAfterSec} seconds and try again.
          </Banner>
        </Card>
      </VerifyShell>
    )
  }

  if (outcome.kind === 'error') {
    return (
      <VerifyShell>
        <Card className="shadow-lg overflow-hidden">
          <Banner tone="amber" icon={<AlertTriangle className="h-6 w-6" />} title="Verification unavailable">
            We could not check this certificate right now. Please try again in a few minutes.
          </Banner>
        </Card>
      </VerifyShell>
    )
  }

  const { result, code } = outcome

  if (!result.found) {
    return (
      <VerifyShell>
        <Card className="shadow-lg overflow-hidden">
          <Banner tone="red" icon={<XCircle className="h-6 w-6" />} title="No matching certificate found">
            This code does not match any certificate issued by OMNI Flow Computers. If you were given this certificate
            as proof of training, it may not be genuine.
          </Banner>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              Check the code for typos and try again, or contact OMNI Flow Computers training to confirm.
            </p>
            <VerifyForm initial={code ?? ''} />
          </CardContent>
        </Card>
      </VerifyShell>
    )
  }

  const { certificate: c, status, integrity } = result
  const isValid = status === 'valid' && integrity

  return (
    <VerifyShell>
      <Card className="shadow-lg overflow-hidden">
        {!integrity ? (
          <Banner tone="red" icon={<ShieldAlert className="h-6 w-6" />} title="Record failed integrity check">
            The stored record for this certificate does not match its signature and cannot be trusted. Contact OMNI Flow
            Computers before relying on it.
          </Banner>
        ) : status === 'valid' ? (
          <Banner tone="green" icon={<CheckCircle2 className="h-6 w-6" />} title="Valid certificate">
            This certificate was issued by OMNI Flow Computers and is currently in good standing.
          </Banner>
        ) : status === 'expired' ? (
          <Banner tone="amber" icon={<CalendarX className="h-6 w-6" />} title="Certificate expired">
            This certificate is genuine but expired on {formatCertificateDate(c.expires_on!)}.
          </Banner>
        ) : status === 'superseded' ? (
          <Banner tone="amber" icon={<AlertTriangle className="h-6 w-6" />} title="Certificate superseded">
            A newer certificate has replaced this one.
          </Banner>
        ) : (
          <Banner tone="red" icon={<XCircle className="h-6 w-6" />} title="Certificate revoked">
            OMNI Flow Computers revoked this certificate
            {c.revoked_at ? ` on ${formatCertificateDate(c.revoked_at)}` : ''}. It should not be accepted as proof of
            training.
          </Banner>
        )}

        <CardContent className="divide-y divide-slate-100 dark:divide-white/[0.06] pt-2">
          <Row icon={<CheckCircle2 className="h-4 w-4" />} label="Awarded to">
            <span className="text-base">{c.recipient_name}</span>
          </Row>
          {c.company_name && (
            <Row icon={<Building2 className="h-4 w-4" />} label="Company">
              {c.company_name}
            </Row>
          )}
          <Row icon={<FileText className="h-4 w-4" />} label="Course">
            {c.course_title}
          </Row>
          <Row icon={<CalendarCheck className="h-4 w-4" />} label="Completed">
            {formatCertificateDate(c.completed_on)}
          </Row>
          {c.expires_on && (
            <Row icon={<CalendarX className="h-4 w-4" />} label="Valid through">
              {formatCertificateDate(c.expires_on)}
            </Row>
          )}
          <div className="py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              Verification code
            </p>
            <p className="font-mono text-sm tracking-wider text-slate-900 dark:text-zinc-100">{c.verification_code}</p>
          </div>
        </CardContent>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] px-6 py-4">
          <Button asChild variant="ghost" className="gap-2 -ml-3 text-slate-600 dark:text-zinc-400">
            <Link href="/verify">
              <ArrowLeft className="h-4 w-4" />
              Verify another
            </Link>
          </Button>
          {isValid && (
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/verify/${c.verification_code}/certificate`}>
                <FileText className="h-4 w-4" />
                View certificate
              </Link>
            </Button>
          )}
        </div>
      </Card>
    </VerifyShell>
  )
}
