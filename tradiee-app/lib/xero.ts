const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID!
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET!
const XERO_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/xero/callback`

const XERO_SCOPES = 'openid profile email accounting.transactions accounting.contacts offline_access'

export function getXeroAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: XERO_CLIENT_ID,
    redirect_uri: XERO_REDIRECT_URI,
    scope: XERO_SCOPES,
    state,
  })
  return `https://login.xero.com/identity/connect/authorize?${params}`
}

export async function exchangeXeroCode(code: string) {
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: XERO_REDIRECT_URI }),
  })
  if (!res.ok) throw new Error('Failed to exchange Xero code')
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

export async function refreshXeroToken(refreshToken: string) {
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error('Failed to refresh Xero token')
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

export async function getXeroTenants(accessToken: string): Promise<Array<{ tenantId: string; tenantName: string }>> {
  const res = await fetch('https://api.xero.com/connections', {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to get Xero tenants')
  const data = await res.json()
  return data.map((c: { tenantId: string; tenantName: string }) => ({ tenantId: c.tenantId, tenantName: c.tenantName }))
}

export async function xeroRequest(path: string, tenantId: string, accessToken: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.xero.com/api.xro/2.0${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers ?? {}) as Record<string, string>),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Xero API error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function syncInvoiceToXero({
  accessToken,
  tenantId,
  invoice,
  customer,
}: {
  accessToken: string
  tenantId: string
  invoice: {
    id: string
    invoice_number: string
    date?: string | null
    due_date: string | null
    subtotal: number
    gst_amount: number
    total: number
    notes: string | null
    invoice_line_items: Array<{ description: string; quantity: number; unit_price: number; line_total: number }>
  }
  customer: { name: string; email: string | null }
}) {
  // Upsert contact
  const contactRes = await xeroRequest('/Contacts', tenantId, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      Contacts: [{ Name: customer.name, EmailAddress: customer.email ?? undefined }],
    }),
  })
  const contactId = contactRes.Contacts?.[0]?.ContactID

  // Create/update invoice
  const xeroInvoice = {
    Type: 'ACCREC',
    Contact: { ContactID: contactId },
    InvoiceNumber: invoice.invoice_number,
    DueDate: invoice.due_date ? invoice.due_date.split('T')[0] : undefined,
    LineAmountTypes: 'EXCLUSIVE',
    LineItems: invoice.invoice_line_items.map(l => ({
      Description: l.description,
      Quantity: Number(l.quantity),
      UnitAmount: Number(l.unit_price),
      TaxType: 'OUTPUT2',
    })),
    Reference: invoice.id,
  }

  const res = await xeroRequest('/Invoices', tenantId, accessToken, {
    method: 'POST',
    body: JSON.stringify({ Invoices: [xeroInvoice] }),
  })

  return res.Invoices?.[0]?.InvoiceID as string | undefined
}
