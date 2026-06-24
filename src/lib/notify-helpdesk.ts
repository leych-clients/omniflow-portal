/**
 * Sends a notification email to helpdesk@omniflow.com via Resend.
 * Used when a user is created or accepts an invite.
 */

const HELPDESK_EMAIL = 'helpdesk@omniflow.com'

export type HelpdeskNotifyType = 'user_created' | 'invite_accepted' | 'self_registered'

export interface HelpdeskNotifyData {
  email: string
  name?: string
  company?: string
  title?: string
  phone?: string
  adminUrl?: string
}

export async function notifyHelpdesk(
  type: HelpdeskNotifyType,
  data: HelpdeskNotifyData
): Promise<{ ok: boolean; error?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const REQUEST_FROM = process.env.REQUEST_FROM

  if (!RESEND_API_KEY || !REQUEST_FROM) {
    console.warn('notifyHelpdesk: missing RESEND_API_KEY or REQUEST_FROM, skipping')
    return { ok: false, error: 'Email not configured' }
  }

  const subject =
    type === 'self_registered'
      ? `Portal: New self-registration (pending approval) – ${data.email}`
      : type === 'user_created'
        ? `Portal: New user created – ${data.email}`
        : `Portal: Invite accepted – ${data.email}`

  const text =
    type === 'self_registered'
      ? `A new user has self-registered on the OMNI portal and is pending admin approval.

Email: ${data.email}
Name: ${data.name ?? '—'}
Company: ${data.company ?? '—'}
Title: ${data.title ?? '—'}
Phone: ${data.phone ?? '—'}

Their account is locked until an administrator unlocks it in Admin → Users.
${data.adminUrl ? `Review users: ${data.adminUrl}` : ''}`.trim()
      : type === 'user_created'
        ? `A new user has been added to the OMNI portal.

Email: ${data.email}
Name: ${data.name ?? '—'}`
        : `A user has accepted their invite and set their password.

Email: ${data.email}
Name: ${data.name ?? '—'}

They can now sign in to the portal.`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: REQUEST_FROM,
        to: [HELPDESK_EMAIL],
        subject,
        text,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('notifyHelpdesk Resend error:', res.status, errBody)
      return { ok: false, error: errBody }
    }

    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('notifyHelpdesk error:', msg)
    return { ok: false, error: msg }
  }
}
