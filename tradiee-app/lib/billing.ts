export type BillingCompany = {
  subscription_status: string | null
  subscription_plan: string | null
  trial_ends_at: string | null
  billing_exempt: boolean | null
}

/**
 * Whether an account may use the app. Access is granted when ANY of:
 *  - the user is a super admin (unrestricted), or
 *  - the company is billing-exempt (comped / app-store review account), or
 *  - the company has an active paid subscription, or
 *  - the company is still inside its trial window.
 * Otherwise the trial has lapsed with no subscription → paywalled.
 */
export function hasAccess(isSuperAdmin: boolean, company: BillingCompany | null): boolean {
  if (isSuperAdmin) return true
  if (!company) return false
  if (company.billing_exempt) return true
  if (company.subscription_status === 'active') return true
  if (company.trial_ends_at && new Date(company.trial_ends_at).getTime() > Date.now()) return true
  return false
}
