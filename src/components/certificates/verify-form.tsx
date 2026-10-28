'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function VerifyForm({ initial = '' }: { initial?: string }) {
  const router = useRouter()
  const [code, setCode] = useState(initial)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (cleaned.length < 12) {
      setError('Enter the full verification code printed on the certificate.')
      return
    }
    setError('')
    setLoading(true)
    router.push(`/verify/${encodeURIComponent(cleaned)}`)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
        Verification code
      </label>
      <div className="flex gap-2">
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="OF-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono tracking-wider uppercase"
        />
        <Button type="submit" disabled={loading} className="gap-2 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Verify
        </Button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  )
}
