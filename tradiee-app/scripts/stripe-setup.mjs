// One-off, idempotent Stripe setup for billing.
// Run: cd tradiee-app && node --env-file=.env.local scripts/stripe-setup.mjs
//
// Creates the SMS usage meter + metered price, and reconciles add-on price
// lookup keys to match lib/billing.ts. Safe to re-run — every step checks first.
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const log = (...a) => console.log(...a)

log('MODE:', process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'LIVE' : 'TEST')

// 1. SMS billing meter (idempotent on event_name) --------------------------
const EVENT_NAME = 'tradiee_sms_message' // matches STRIPE_SMS_METER_EVENT_NAME default in lib/sms.ts
const meters = await stripe.billing.meters.list({ limit: 100 })
let meter = meters.data.find(m => m.event_name === EVENT_NAME && m.status === 'active')
if (meter) {
  log(`meter: exists ${meter.id} (${EVENT_NAME})`)
} else {
  meter = await stripe.billing.meters.create({
    display_name: 'SMS messages',
    event_name: EVENT_NAME,
    default_aggregation: { formula: 'sum' },
    customer_mapping: { event_payload_key: 'stripe_customer_id', type: 'by_id' },
    value_settings: { event_payload_key: 'value' },
  })
  log(`meter: CREATED ${meter.id} (${EVENT_NAME})`)
}

// 2. Metered SMS price @ 13c NZD, lookup_key sms_usage_metered --------------
// 13c = BILLING_ADDONS.sms_usage.usagePriceCents in lib/billing.ts
const existingSms = await stripe.prices.list({ lookup_keys: ['sms_usage_metered'], limit: 1 })
if (existingSms.data[0]) {
  log(`sms price: exists ${existingSms.data[0].id}`)
} else {
  const product = await stripe.products.create({ name: 'SMS (per message)' })
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'nzd',
    unit_amount: 13,
    billing_scheme: 'per_unit',
    recurring: { interval: 'month', usage_type: 'metered', meter: meter.id },
    lookup_key: 'sms_usage_metered',
  })
  log(`sms price: CREATED ${price.id} (product ${product.id})`)
}

// 3. Reconcile add-on lookup keys to match lib/billing.ts -------------------
async function ensureLookupKey(priceId, wantKey) {
  const p = await stripe.prices.retrieve(priceId)
  if (p.lookup_key === wantKey) { log(`lookup: ${wantKey} already set (${priceId})`); return }
  await stripe.prices.update(priceId, { lookup_key: wantKey, transfer_lookup_key: true })
  log(`lookup: SET ${wantKey} on ${priceId} (was ${p.lookup_key ?? 'none'})`)
}
await ensureLookupKey('price_1TqtncByhMvC1sKj4UFRIw8A', 'projects_monthly')          // projects add-on
await ensureLookupKey('price_1Tm1UCByhMvC1sKjSb0AA4ki', 'bookings_website_monthly')  // bookings website (was website_monthly)

log('\nDone.')
