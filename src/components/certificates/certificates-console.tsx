'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Ban, Copy, ExternalLink, Loader2, Plus, QrCode, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'

type Status = 'valid' | 'revoked' | 'superseded' | 'expired'

interface Item {
  id: string
  verification_code: string
  recipient_name: string
  company_name: string | null
  course_title: string
  completed_on: string
  expires_on: string | null
  status: string
  effective_status: Status
  revoked_reason: string | null
  issued_at: string
}

const STATUS_BADGE: Record<Status, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  valid: { label: 'Valid', variant: 'success' },
  revoked: { label: 'Revoked', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'warning' },
  superseded: { label: 'Superseded', variant: 'secondary' },
}

const today = () => new Date().toISOString().slice(0, 10)
const plusYears = (n: number) => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + n)
  return d.toISOString().slice(0, 10)
}

export function CertificatesConsole({ demo = false }: { demo?: boolean }) {
  const request = useCallback(
    (url: string, init?: RequestInit) => (demo ? fetch(url, init) : fetchWithAdminAuth(url, init)),
    [demo]
  )

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [course, setCourse] = useState('OMNI Flow Computer Configuration & Custody Transfer')
  const [completedOn, setCompletedOn] = useState(today())
  const [expiresOn, setExpiresOn] = useState(plusYears(3))
  const [issuing, setIssuing] = useState(false)
  const [formError, setFormError] = useState('')

  const [revokeTarget, setRevokeTarget] = useState<Item | null>(null)
  const [reason, setReason] = useState('')
  const [revoking, setRevoking] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await request('/api/admin/certificates', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load certificates')
      setItems(data.items ?? [])
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => {
    void load()
  }, [load])

  const issue = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIssuing(true)
    try {
      const res = await request('/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: name,
          company_name: company || null,
          course_title: course,
          completed_on: completedOn,
          expires_on: expiresOn || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to issue certificate')
      toast.success(`Issued ${data.item.verification_code}`)
      setName('')
      setCompany('')
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to issue certificate')
    } finally {
      setIssuing(false)
    }
  }

  const revoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const res = await request(`/api/admin/certificates/${revokeTarget.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to revoke')
      toast.success(`Revoked ${revokeTarget.verification_code}`)
      setRevokeTarget(null)
      setReason('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke')
    } finally {
      setRevoking(false)
    }
  }

  const copyLink = async (code: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/verify/${code}`)
    toast.success('Verification link copied')
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Certificates</h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Issue certificates with a unique verification code and QR code, and revoke them if needed. Anyone can check
            a certificate at <Link href="/verify" className="text-red-600 underline">/verify</Link>.
          </p>
        </div>
      </div>

      {demo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">Demo mode</p>
          <p className="mt-1">
            Data is stored in memory with sample records and resets on server restart. No sign-in is required here.
            Try verifying a valid, expired, revoked, or tampered record from the table, or issue a new one and scan its
            QR code.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue a certificate</CardTitle>
          <CardDescription>
            Roster-based issuance is also available through the API using a confirmed registration; this form issues
            manually, for example to backfill older certificates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={issue} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-800 dark:text-zinc-200">Recipient name *</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-800 dark:text-zinc-200">Company (as on certificate)</span>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={500} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-800 dark:text-zinc-200">Course *</span>
              <Input value={course} onChange={(e) => setCourse(e.target.value)} required maxLength={300} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-800 dark:text-zinc-200">Completed on *</span>
              <Input type="date" value={completedOn} onChange={(e) => setCompletedOn(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-800 dark:text-zinc-200">Expires on (optional)</span>
              <Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={issuing} className="gap-2">
                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Issue certificate
              </Button>
              {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issued certificates</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">No certificates issued yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => {
                  const badge = STATUS_BADGE[c.effective_status] ?? STATUS_BADGE.valid
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{c.verification_code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{c.recipient_name}</div>
                        {c.company_name && <div className="text-xs text-slate-500">{c.company_name}</div>}
                      </TableCell>
                      <TableCell className="max-w-[16rem] text-sm">{c.course_title}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{c.completed_on}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {c.revoked_reason && (
                          <div className="mt-1 max-w-[14rem] text-xs text-slate-500">{c.revoked_reason}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Open verification page">
                            <Link href={`/verify/${c.verification_code}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          {c.effective_status === 'valid' && (
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Open printable certificate with QR">
                              <Link href={`/verify/${c.verification_code}/certificate`} target="_blank">
                                <QrCode className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Copy verification link"
                            onClick={() => void copyLink(c.verification_code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {c.status === 'valid' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              title="Revoke"
                              onClick={() => setRevokeTarget(c)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke certificate</DialogTitle>
            <DialogDescription>
              {revokeTarget?.verification_code} ({revokeTarget?.recipient_name}) will show as revoked on the public
              verification page immediately.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (internal, not shown publicly)"
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={revoking || reason.trim().length < 3} onClick={() => void revoke()}>
              {revoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
