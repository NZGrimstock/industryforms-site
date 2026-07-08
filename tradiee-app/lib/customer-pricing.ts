// Codex build audit marker (2026-07-08): resolves per-customer-group price overrides.
export type PriceOverrideRow = {
  customer_group_id: string
  sell_price: number
}

export type PriceableItem = {
  sell_price: number
  customer_group_prices?: PriceOverrideRow[] | null
}

export type CustomerWithPricingGroup = {
  pricing_group_id?: string | null
}

export function priceForCustomerGroup(item: PriceableItem, customer?: CustomerWithPricingGroup | null): number {
  const groupId = customer?.pricing_group_id
  if (!groupId) return Number(item.sell_price) || 0
  const override = item.customer_group_prices?.find(row => row.customer_group_id === groupId)
  return Number(override?.sell_price ?? item.sell_price) || 0
}
