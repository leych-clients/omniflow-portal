import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VerifyShell } from '@/components/certificates/verify-shell'
import { VerifyForm } from '@/components/certificates/verify-form'

export const metadata: Metadata = {
  title: 'Verify a certificate | OMNI Flow Computers',
  robots: { index: false, follow: false },
}

export default function VerifyIndexPage() {
  return (
    <VerifyShell>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Verify a training certificate</CardTitle>
          <CardDescription>
            Every genuine OMNI Flow Computers certificate has a unique verification code and a QR code. Enter the code
            below, or scan the QR code on the certificate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyForm />
        </CardContent>
      </Card>
    </VerifyShell>
  )
}
