import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { InvoiceTemplatesClient } from './templates-client'

export default async function InvoiceTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('company_id, full_name, role').eq('id', user!.id).single()
  const [templatesRes, customersRes] = await Promise.all([
    supabase.from('document_templates').select('id, name, created_at').eq('company_id', profile!.company_id).eq('kind', 'invoice').order('name'),
    supabase.from('customers').select('id, name').eq('company_id', profile!.company_id).order('name'),
  ])

  return (
    <>
      <Header title="Invoice templates" profile={profile} />
      <InvoiceTemplatesClient templates={templatesRes.data ?? []} customers={customersRes.data ?? []} />
    </>
  )
}
