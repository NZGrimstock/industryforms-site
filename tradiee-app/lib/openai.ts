type OpenAIContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail?: 'low' | 'high' | 'auto' }
  | { type: 'input_file'; file_data: string; filename?: string }

type OpenAIInput =
  | string
  | Array<{
      role: 'user' | 'developer' | 'system'
      content: string | OpenAIContent[]
    }>

export const OPENAI_MODEL_NANO = process.env.OPENAI_MODEL_NANO ?? 'gpt-5.4-nano'
export const OPENAI_MODEL_MINI = process.env.OPENAI_MODEL_MINI ?? 'gpt-5.4-mini'

export function openAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

export async function createOpenAIText(params: {
  model: string
  input: OpenAIInput
  instructions?: string
  maxOutputTokens?: number
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI is not configured')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      input: params.input,
      instructions: params.instructions,
      max_output_tokens: params.maxOutputTokens,
      store: false,
    }),
  })

  const payload = await response.json().catch(() => null) as OpenAIResponse | null
  if (!response.ok) {
    const message = payload?.error?.message ?? `OpenAI request failed (${response.status})`
    throw new Error(message)
  }

  const outputText = payload?.output_text ?? collectOutputText(payload)
  if (!outputText.trim()) throw new Error('OpenAI returned an empty response')
  return outputText.trim()
}

export function parseJsonObject<T>(raw: string): T {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Model did not return JSON')
  return JSON.parse(match[0]) as T
}

type OpenAIResponse = {
  output_text?: string
  error?: { message?: string }
  output?: Array<{
    type?: string
    content?: Array<{ type?: string; text?: string }>
  }>
}

function collectOutputText(payload: OpenAIResponse | null): string {
  return (payload?.output ?? [])
    .flatMap(item => item.content ?? [])
    .filter(part => part.type === 'output_text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('\n')
}
