// Subscription plans (single source of truth). Keep the labels and seat caps
// in sync with what Settings → Billing and the upgrade prompts show.

export type PlanKey = 'trial' | 'solo' | 'team' | 'pro'

export type Plan = {
  key: PlanKey
  label: string
  /** Max number of *active* user seats on this plan; `Infinity` for unlimited. */
  maxSeats: number
  /** Monthly price (NZD). 0 for trial. */
  monthly: number
}

// Prices mirror the Stripe products (NZD). Stripe is the source of truth for
// what's actually charged (checkout looks up by `<key>_monthly`); these are the
// display values shown in-app and must be kept in sync with the dashboard.
export const PLANS: Plan[] = [
  { key: 'trial', label: 'Trial',              maxSeats: 1,        monthly: 0  },
  { key: 'solo',  label: 'Solo (1 user)',      maxSeats: 1,        monthly: 29 },
  { key: 'team',  label: 'Team (up to 10)',    maxSeats: 10,       monthly: 49 },
  { key: 'pro',   label: 'Pro (unlimited)',    maxSeats: Infinity, monthly: 99 },
]

const BY_KEY: Record<PlanKey, Plan> = Object.fromEntries(PLANS.map(p => [p.key, p])) as Record<PlanKey, Plan>

export function getPlan(key: string | null | undefined): Plan {
  return BY_KEY[(key ?? 'trial') as PlanKey] ?? BY_KEY.trial
}

/**
 * Given the current plan and the desired total active seats, return the
 * smallest plan that can hold them — or null if the current plan already fits.
 * Trial counts as "solo-sized" for upgrade purposes: trialling users with one
 * more seat get prompted to upgrade to Team.
 */
export function planForSeats(current: Plan, desiredSeats: number): Plan | null {
  if (desiredSeats <= current.maxSeats) return null
  // Find the next plan with capacity. Trial → Team (skip Solo, since Solo also
  // caps at 1 and wouldn't help).
  const sortedByCap = [...PLANS].sort((a, b) => a.maxSeats - b.maxSeats)
  return sortedByCap.find(p => p.maxSeats >= desiredSeats && p.monthly >= current.monthly && p.key !== current.key) ?? null
}
