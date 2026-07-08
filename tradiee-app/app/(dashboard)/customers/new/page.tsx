import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { CustomerForm } from '@/components/forms/customer-form'

export default async function NewCustomerPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('company_id, full_name, role').eq('id', (await supabase.auth.getUser()).data.user!.id).single()
  const { data: pricingGroups } = await supabase.from('customer_groups').select('id, name').eq('company_id', profile!.company_id).order('name')
  return (
    <>
      <Header title="New customer" profile={profile} />
      <div className="p-6 max-w-2xl">
        <CustomerForm companyId={profile!.company_id} pricingGroups={pricingGroups ?? []} />
      </div>
    </>
  )
}
