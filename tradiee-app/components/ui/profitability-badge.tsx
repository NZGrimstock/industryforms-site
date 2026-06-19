import { formatCurrency } from '@/lib/utils'

interface ProfitabilityData {
  quotedSubtotal: number       // from accepted quote
  materialsCost: number        // job_materials sum of (quantity × unit_cost)
  labourCost: number           // timesheets sum of (hours × cost_rate)
}

export function getProfitabilityStatus(data: ProfitabilityData) {
  const totalCost = data.materialsCost + data.labourCost
  const quoted = data.quotedSubtotal
  if (quoted === 0) return null

  const ratio = totalCost / quoted

  if (ratio < 0.7) return { label: 'Under budget', color: 'green' as const, emoji: '🟢', pct: Math.round(ratio * 100) }
  if (ratio < 1.0) return { label: 'Approaching limit', color: 'yellow' as const, emoji: '🟡', pct: Math.round(ratio * 100) }
  return { label: 'Over budget', color: 'red' as const, emoji: '🔴', pct: Math.round(ratio * 100) }
}

export function ProfitabilityBadge({ data, compact = false }: { data: ProfitabilityData; compact?: boolean }) {
  const status = getProfitabilityStatus(data)
  if (!status) return null

  const totalCost = data.materialsCost + data.labourCost
  const margin = data.quotedSubtotal - totalCost
  const marginPct = data.quotedSubtotal > 0 ? (margin / data.quotedSubtotal) * 100 : 0

  if (compact) {
    return (
      <span title={`${status.label} — ${status.pct}% of budget used`} className="text-base">{status.emoji}</span>
    )
  }

  const bgMap = { green: 'bg-green-50 border-green-200', yellow: 'bg-yellow-50 border-yellow-200', red: 'bg-red-50 border-red-200' }
  const textMap = { green: 'text-green-800', yellow: 'text-yellow-800', red: 'text-red-800' }
  const subMap = { green: 'text-green-600', yellow: 'text-yellow-700', red: 'text-red-600' }

  return (
    <div className={`border rounded-xl p-4 ${bgMap[status.color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{status.emoji}</span>
          <span className={`text-sm font-semibold ${textMap[status.color]}`}>{status.label}</span>
        </div>
        <span className={`text-xs font-medium ${subMap[status.color]}`}>{status.pct}% of budget used</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${status.color === 'green' ? 'bg-green-500' : status.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(status.pct, 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className={`text-xs ${subMap[status.color]} mb-0.5`}>Quoted</p>
          <p className={`text-sm font-semibold ${textMap[status.color]}`}>{formatCurrency(data.quotedSubtotal)}</p>
        </div>
        <div>
          <p className={`text-xs ${subMap[status.color]} mb-0.5`}>Cost so far</p>
          <p className={`text-sm font-semibold ${textMap[status.color]}`}>{formatCurrency(totalCost)}</p>
        </div>
        <div>
          <p className={`text-xs ${subMap[status.color]} mb-0.5`}>Est. margin</p>
          <p className={`text-sm font-semibold ${status.color === 'red' ? 'text-red-600' : textMap[status.color]}`}>
            {formatCurrency(margin)} ({marginPct.toFixed(0)}%)
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/40 grid grid-cols-2 gap-2 text-xs">
        <div className={subMap[status.color]}>Materials: {formatCurrency(data.materialsCost)}</div>
        <div className={subMap[status.color]}>Labour: {formatCurrency(data.labourCost)}</div>
      </div>
    </div>
  )
}
