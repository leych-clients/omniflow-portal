import { notFound } from 'next/navigation'
import { CertificatesConsole } from '@/components/certificates/certificates-console'
import { isCertificatesDemo } from '@/lib/certificates'

export const dynamic = 'force-dynamic'

export default function CertificatesDemoPage() {
  if (!isCertificatesDemo()) notFound()
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] p-4 sm:p-8">
      <CertificatesConsole demo />
    </div>
  )
}
