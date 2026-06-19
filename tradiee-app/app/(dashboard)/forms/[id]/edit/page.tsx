import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { FormBuilder } from './builder'

export default async function FormEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('company_id, full_name, role').eq('id', user!.id).single()

  const { data: template } = await supabase
    .from('form_templates')
    .select('*')
    .eq('id', id)
    .eq('company_id', profile!.company_id)
    .single()

  if (!template) notFound()

  return (
    <>
      <Header title={`Edit — ${template.name}`} profile={profile} />
      <FormBuilder template={template} companyId={profile!.company_id} />
    </>
  )
}
