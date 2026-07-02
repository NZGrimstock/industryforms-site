'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; text: string }

export function AIAssist() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: msgs.slice(-8) }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      setMsgs(m => [...m, { role: 'assistant', text: data.reply ?? data.error ?? 'Sorry, something went wrong.' }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', text: 'Failed to reach the assistant. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-14 right-4 md:bottom-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all"
        style={{ background: 'var(--brand, #f97316)' }}
        aria-label="AI Assistant"
      >
        {open
          ? <X className="h-5 w-5 text-white" />
          : <MessageCircle className="h-5 w-5 text-white" />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-28 right-4 md:bottom-20 z-40 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: '480px' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{ background: 'var(--brand, #f97316)' }}>
            <MessageCircle className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">AI Assistant</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ maxHeight: '320px' }}>
            {msgs.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-4">
                Ask me how to do anything in IndustryForms — e.g. <em>"How do I send an invoice?"</em>
              </p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] text-xs rounded-xl px-3 py-2 whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                  style={m.role === 'user' ? { background: 'var(--brand, #f97316)' } : undefined}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 p-3 border-t border-gray-100">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything…"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--brand, #f97316)' } as React.CSSProperties}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="p-2 rounded-lg text-white disabled:opacity-40 transition-colors"
              style={{ background: 'var(--brand, #f97316)' }}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
