import { CheckCircle2, Clock } from 'lucide-react'

import {
  attendeeDisplayName,
  compareAttendeeToAccount,
  hasSignupDetails,
  rosterStatusInfo,
  type RosterAccount,
  type RosterAttendeeFields,
} from '@/lib/training-roster-attendee'

export function RosterStatusBadge({
  status,
  waitlistPosition,
}: {
  status: string
  waitlistPosition: number | null | undefined
}) {
  const info = rosterStatusInfo(status, waitlistPosition)
  const tone =
    info.kind === 'enrolled'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
      : info.kind === 'waitlisted'
        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
        : 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-zinc-300'
  const Icon = info.kind === 'enrolled' ? CheckCircle2 : info.kind === 'waitlisted' ? Clock : null
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tone}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {info.label}
      {info.positionText && (
        <span className="tabular-nums" aria-label={`position ${info.positionText.slice(1)}`}>
          {info.positionText}
        </span>
      )}
    </span>
  )
}

const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-wide text-zinc-500'

/** Name, email, phone and company typed on the signup form, with a hint when they differ from the account. */
export function RosterAttendeeDetails({
  registration,
  account,
  showLabel = true,
}: {
  registration: RosterAttendeeFields
  account: RosterAccount
  showLabel?: boolean
}) {
  if (!hasSignupDetails(registration)) {
    return (
      <div>
        {showLabel && <p className={LABEL_CLASS}>Attendee</p>}
        <p className="mt-0.5 text-xs italic text-zinc-500 dark:text-zinc-400">
          No signup details (see account)
        </p>
      </div>
    )
  }
  const diff = compareAttendeeToAccount(registration, account)
  const name = attendeeDisplayName(registration)
  const email = registration.contact_email?.trim()
  const phone = registration.contact_phone?.trim()
  const company = registration.certificate_company_name?.trim()
  return (
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {showLabel && <p className={LABEL_CLASS}>Attendee</p>}
        {diff.differs && (
          <span
            className="rounded border border-sky-200 bg-sky-50 px-1.5 py-px text-[10px] font-medium text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
            title={
              diff.nameDiffers && diff.emailDiffers
                ? 'Signup name and email do not match the account'
                : diff.nameDiffers
                  ? 'Signup name does not match the account name'
                  : 'Signup email does not match the account email'
            }
          >
            Different from account
          </span>
        )}
      </div>
      <p className="text-zinc-900 dark:text-zinc-100">{name || '—'}</p>
      {email && <p className="break-all text-zinc-700 dark:text-zinc-300">{email}</p>}
      {phone && <p className="text-zinc-700 dark:text-zinc-300">{phone}</p>}
      {company && <p className="text-xs text-zinc-500 dark:text-zinc-400">{company}</p>}
    </div>
  )
}

/** The portal account that submitted (or was added to) the registration. */
export function RosterAccountDetails({
  account,
  showLabel = true,
}: {
  account: RosterAccount
  showLabel?: boolean
}) {
  return (
    <div className="space-y-0.5">
      {showLabel && <p className={LABEL_CLASS}>Account</p>}
      <p className="text-zinc-800 dark:text-zinc-200">{account.name || '—'}</p>
      <p className="break-all text-zinc-700 dark:text-zinc-300">{account.email}</p>
    </div>
  )
}
