export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPEG, PNG, and WEBP files are supported' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mediaType = file.type as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docBlock: any = {
      type: mediaType === 'application/pdf' ? 'document' : 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 },
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            docBlock,
            {
              type: 'text',
              text: `Extract all line items from this supplier invoice. Return ONLY a JSON object with this exact structure:
{
  "supplier": "supplier name",
  "invoice_number": "invoice number or null",
  "invoice_date": "YYYY-MM-DD or null",
  "total": 123.45,
  "items": [
    {
      "description": "item description",
      "quantity": 1,
      "unit": "each",
      "unit_cost": 12.34,
      "line_total": 12.34,
      "part_number": "ABC123 or null"
    }
  ]
}

Rules:
- quantity and unit_cost must be numbers (not strings)
- unit should be "each", "m", "m2", "L", "kg", "hr" or similar
- If GST is included on a line, strip it out — return ex-GST unit costs
- Include all product lines; skip freight, delivery fees, and GST summary lines
- Return ONLY the JSON, no other text`,
            },
          ],
        },
      ],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not extract data from document', raw: text }, { status: 422 })

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (e: unknown) {
    console.error('[supplier-invoice/parse]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Parse failed' }, { status: 500 })
  }
}
