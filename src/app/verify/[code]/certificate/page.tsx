import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintButton } from '@/components/certificates/print-button'
import { formatCertificateDate, normalizeVerificationCode, toVerificationResult } from '@/lib/certificates'
import { getCertificateStore } from '@/lib/certificates-store'
import { getBaseUrl, rateLimitCurrentRequest } from '@/lib/certificates-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Certificate of Completion | OMNI Flow Computers',
  robots: { index: false, follow: false },
}

export default async function CertificateViewPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params
  const code = normalizeVerificationCode(decodeURIComponent(rawCode))
  if (!code || !(await rateLimitCurrentRequest()).ok) notFound()

  const result = toVerificationResult(await getCertificateStore().getByCode(code))
  if (!result.found || result.status !== 'valid' || !result.integrity) notFound()
  const c = result.certificate

  const verifyUrl = `${await getBaseUrl()}/verify/${c.verification_code}`
  const qrSvg = await QRCode.toString(verifyUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#111827', light: '#ffffff' } })

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0a0a0a] px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: letter landscape; margin: 0 } @media print { body { background: #fff !important } }`}</style>

      <div className="mx-auto mb-6 flex max-w-[1056px] items-center justify-between print:hidden">
        <Button asChild variant="ghost" className="gap-2 -ml-3">
          <Link href={`/verify/${c.verification_code}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to verification
          </Link>
        </Button>
        <PrintButton />
      </div>

      <div className="mx-auto aspect-[11/8.5] w-full max-w-[1056px] bg-white text-slate-900 shadow-xl print:max-w-none print:w-screen print:h-screen print:shadow-none">
        <div className="relative flex h-full flex-col items-center justify-between border-[14px] border-double border-red-700 p-[4%] text-center">
          <div className="space-y-1">
            <p className="text-xl font-bold tracking-[0.25em] text-red-700 sm:text-2xl">OMNI FLOW COMPUTERS</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 sm:text-xs">Training &amp; Certification</p>
          </div>

          <div className="space-y-3">
            <p className="text-3xl font-light tracking-wide sm:text-5xl">Certificate of Completion</p>
            <p className="text-xs text-slate-500 sm:text-sm">This certifies that</p>
            <p className="font-serif text-3xl font-semibold italic sm:text-5xl">{c.recipient_name}</p>
            {c.company_name && <p className="text-sm text-slate-600 sm:text-lg">{c.company_name}</p>}
            <p className="text-xs text-slate-500 sm:text-sm">has successfully completed</p>
            <p className="mx-auto max-w-3xl text-lg font-semibold sm:text-3xl">{c.course_title}</p>
            <p className="text-xs text-slate-600 sm:text-base">
              Completed {formatCertificateDate(c.completed_on)}
              {c.expires_on && <> &middot; Valid through {formatCertificateDate(c.expires_on)}</>}
            </p>
          </div>

          <div className="flex w-full items-end justify-between gap-4 text-left">
            <div className="text-[10px] text-slate-500 sm:text-xs">
              <p className="font-semibold uppercase tracking-wide">Verification code</p>
              <p className="font-mono text-sm tracking-widest text-slate-900 sm:text-lg">{c.verification_code}</p>
              <p className="mt-1 max-w-xs">
                Verify authenticity at <span className="font-semibold">{verifyUrl.replace(/^https?:\/\//, '')}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="hidden max-w-[9rem] text-right text-[10px] text-slate-500 sm:block">
                Scan to confirm this certificate against the OMNI Flow Computers record.
              </p>
              <div
                className="h-20 w-20 shrink-0 sm:h-28 sm:w-28 [&>svg]:h-full [&>svg]:w-full"
                aria-label={`QR code linking to ${verifyUrl}`}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
