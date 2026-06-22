'use client'
import Link from 'next/link'
import { Pencil, Printer, Briefcase, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { FormField } from './edit/builder'

interface Submission {
  id: string
  template_name: string
  submitted_at: string
  answers: unknown
  job_id: string | null
}

interface Props {
  template: { id: string; name: string; description: string | null; fields: unknown; is_active: boolean }
  submissions: Submission[]
}

function FieldPreview({ field }: { field: FormField }) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {field.type === 'text' && (
        <div className="h-9 rounded-lg border border-gray-200 bg-gray-50" />
      )}
      {field.type === 'textarea' && (
        <div className="h-20 rounded-lg border border-gray-200 bg-gray-50" />
      )}
      {field.type === 'number' && (
        <div className="h-9 w-32 rounded-lg border border-gray-200 bg-gray-50" />
      )}
      {field.type === 'checkbox' && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 rounded border border-gray-300 bg-white" /> Yes
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 rounded border border-gray-300 bg-white" /> No
          </label>
        </div>
      )}
      {field.type === 'select' && (
        <div className="h-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center px-3">
          <span className="text-xs text-gray-400">{(field.options ?? []).join(' / ')}</span>
        </div>
      )}
      {field.type === 'date' && (
        <div className="h-9 w-40 rounded-lg border border-gray-200 bg-gray-50" />
      )}
      {field.type === 'signature' && (
        <div className="h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
          <span className="text-xs text-gray-400">Signature</span>
        </div>
      )}
      {field.type === 'photo' && (
        <div className="h-20 w-28 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
          <span className="text-xs text-gray-400">Photo</span>
        </div>
      )}
    </div>
  )
}

function printBlank(template: Props['template']) {
  const fields = (template.fields as FormField[]) ?? []
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${template.name}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #111; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    p.desc { color: #6b7280; font-size: 13px; margin-bottom: 32px; }
    .field { margin-bottom: 20px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .req { color: #ef4444; }
    .input-line { border-bottom: 1.5px solid #d1d5db; height: 32px; width: 100%; }
    .input-box { border: 1.5px solid #d1d5db; border-radius: 6px; min-height: 80px; width: 100%; }
    .sig-box { border: 1.5px solid #d1d5db; border-radius: 6px; height: 90px; width: 100%; }
    .photo-box { border: 1.5px solid #d1d5db; border-radius: 6px; height: 80px; width: 120px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 11px; }
    .checkbox-row { display: flex; gap: 24px; }
    .checkbox-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .checkbox { width: 16px; height: 16px; border: 1.5px solid #d1d5db; border-radius: 3px; }
    footer { margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${template.name}</h1>
  ${template.description ? `<p class="desc">${template.description}</p>` : ''}
  <div class="field"><label>Date</label><div class="input-line"></div></div>
  <div class="field"><label>Technician</label><div class="input-line"></div></div>
  <div class="field"><label>Job / Site</label><div class="input-line"></div></div>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
  ${fields.map(f => {
    let input = ''
    if (f.type === 'text' || f.type === 'number' || f.type === 'date') input = '<div class="input-line"></div>'
    else if (f.type === 'textarea') input = '<div class="input-box"></div>'
    else if (f.type === 'signature') input = '<div class="sig-box"></div>'
    else if (f.type === 'photo') input = '<div class="photo-box">Photo</div>'
    else if (f.type === 'checkbox') input = '<div class="checkbox-row"><div class="checkbox-item"><div class="checkbox"></div> Yes</div><div class="checkbox-item"><div class="checkbox"></div> No</div></div>'
    else if (f.type === 'select') input = `<div class="checkbox-row">${(f.options ?? []).map(o => `<div class="checkbox-item"><div class="checkbox"></div> ${o}</div>`).join('')}</div>`
    return `<div class="field"><label>${f.label}${f.required ? ' <span class="req">*</span>' : ''}</label>${input}</div>`
  }).join('')}
  <footer>Powered by IndustryForms &nbsp;·&nbsp; ${template.name} &nbsp;·&nbsp; Page 1</footer>
  <script>window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export function FormPreview({ template, submissions }: Props) {
  const fields = (template.fields as FormField[]) ?? []

  return (
    <div className="p-6">
      <div className="max-w-3xl">
        {/* Actions bar */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/forms/${template.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent,#f97316)] hover:bg-[var(--accent-hover,#ea580c)] text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Pencil className="h-4 w-4" /> Edit form
          </Link>
          <button
            onClick={() => printBlank(template)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
          >
            <Printer className="h-4 w-4" /> Print blank
          </button>
          <span className="ml-auto text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Fill this form on the Job page
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form preview */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">{template.name}</h2>
            {template.description && <p className="text-sm text-gray-500 mb-4">{template.description}</p>}
            {fields.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No fields yet — <Link href={`/forms/${template.id}/edit`} className="text-orange-500 underline">edit the form</Link> to add some.</p>
            ) : (
              <div className="mt-4">
                {fields.map(f => <FieldPreview key={f.id} field={f} />)}
              </div>
            )}
          </div>

          {/* Recent submissions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              Recent submissions
            </h3>
            {submissions.length === 0 ? (
              <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-400">No submissions yet</p>
                <p className="text-xs text-gray-400 mt-1">Open a Job and fill this form from the Site forms card</p>
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.map(s => (
                  <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{s.template_name}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(s.submitted_at)}</span>
                    </div>
                    {s.job_id && (
                      <Link href={`/jobs/${s.job_id}`} className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> View job
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
