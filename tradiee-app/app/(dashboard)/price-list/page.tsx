import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { PriceListClient } from './client'

export default async function PriceListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('company_id, full_name, role').eq('id', user!.id).single()

  const [itemsRes, kitsRes] = await Promise.all([
    supabase.from('price_list_items').select('*').eq('company_id', profile!.company_id).order('name'),
    supabase.from('kits').select('*, kit_items(*, price_list_items(*))').eq('company_id', profile!.company_id).order('name'),
  ])

  return (
    <>
      <Header title="Price List" profile={profile} />
      <PriceListClient
        companyId={profile!.company_id}
        items={itemsRes.data ?? []}
        kits={kitsRes.data ?? []}
      />
    </>
  )
}
