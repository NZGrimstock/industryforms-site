import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { FormPreview } from './preview'

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: submissions } = await supabase
    .from('form_submissions')
    .select('id, template_name, submitted_at, answers, job_id')
    .eq('template_id', id)
    .order('submitted_at', { ascending: false })
    .limit(20)

  return (
    <>
      <Header title={template.name} profile={profile} />
      <FormPreview template={template} submissions={submissions ?? []} />
    </>
  )
}
