import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useQuery } from '@powersync/react'
import { SafeAreaView } from 'react-native-safe-area-context'

const STATUS_COLOR: Record<string, string> = {
  draft:    '#6b7280',
  sent:     '#3b82f6',
  accepted: '#22c55e',
  declined: '#ef4444',
  expired:  '#9ca3af',
}

const STATUS_LABEL: Record<string, string> = {
  draft:    'Draft',
  sent:     'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired:  'Expired',
}

type Quote = {
  id: string
  quote_number: string
  title: string
  status: string
  subtotal: number
  gst_amount: number
  total: number
  customer_name: string | null
  expires_at: string | null
  customer_message: string | null
  notes: string | null
}

type Section = {
  id: string
  title: string
  sort_order: number
}

type LineItem = {
  id: string
  section_id: string | null
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
  sort_order: number
}

function formatAmount(amount: number) {
  return '$' + (amount ?? 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: quotes, isLoading } = useQuery<Quote>(
    `SELECT q.id, q.quote_number, q.title, q.status, q.subtotal, q.gst_amount, q.total,
            q.expires_at, q.customer_message, q.notes,
            c.name AS customer_name
     FROM quotes q
     LEFT JOIN customers c ON c.id = q.customer_id
     WHERE q.id = ?`,
    [id]
  )
  const quote = quotes?.[0]

  const { data: sections } = useQuery<Section>(
    `SELECT id, title, sort_order FROM quote_sections
     WHERE quote_id = ? ORDER BY sort_order ASC`,
    [id]
  )

  const { data: lineItems } = useQuery<LineItem>(
    `SELECT id, section_id, description, quantity, unit, unit_price, line_total, sort_order
     FROM quote_line_items
     WHERE quote_id = ?
     ORDER BY sort_order ASC`,
    [id]
  )

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#f97316" />
      </View>
    )
  }

  if (!quote) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9ca3af' }}>Quote not found</Text>
      </View>
    )
  }

  const color = STATUS_COLOR[quote.status] ?? '#9ca3af'

  // Group line items by section
  const sectionMap = new Map<string, LineItem[]>()
  const unsectioned: LineItem[] = []
  for (const item of lineItems ?? []) {
    if (item.section_id) {
      const arr = sectionMap.get(item.section_id) ?? []
      arr.push(item)
      sectionMap.set(item.section_id, arr)
    } else {
      unsectioned.push(item)
    }
  }

  const subtotal = (lineItems ?? []).reduce((sum, i) => sum + (i.line_total ?? 0), 0)

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Stack.Screen options={{ title: quote.quote_number, headerTintColor: '#f97316' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.docNumber}>{quote.quote_number}</Text>
              <Text style={styles.docTitle}>{quote.title}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.statusText, { color }]}>
                {STATUS_LABEL[quote.status] ?? quote.status}
              </Text>
            </View>
          </View>

          {quote.customer_message && (
            <Text style={styles.description}>{quote.customer_message}</Text>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Customer</Text>
            <Text style={styles.metaValue}>{quote.customer_name ?? '—'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Valid Until</Text>
            <Text style={styles.metaValue}>{formatDate(quote.expires_at)}</Text>
          </View>
          {quote.notes && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Notes</Text>
              <Text style={[styles.metaValue, { flex: 1 }]} numberOfLines={3}>{quote.notes}</Text>
            </View>
          )}
        </View>

        {/* Line items */}
        {(lineItems ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Line Items</Text>

            {/* Unsectioned items */}
            {unsectioned.map(item => (
              <LineItemRow key={item.id} item={item} />
            ))}

            {/* Sectioned items */}
            {(sections ?? []).map(section => {
              const items = sectionMap.get(section.id) ?? []
              if (items.length === 0) return null
              return (
                <View key={section.id}>
                  <Text style={styles.sectionHeader}>{section.title}</Text>
                  {items.map(item => (
                    <LineItemRow key={item.id} item={item} />
                  ))}
                </View>
              )
            })}

            {/* Totals */}
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatAmount(subtotal)}</Text>
              </View>
              <View style={[styles.totalRow, styles.totalRowFinal]}>
                <Text style={styles.totalLabelBold}>Total</Text>
                <Text style={styles.totalValueBold}>{formatAmount(quote.total ?? 0)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function LineItemRow({ item }: { item: LineItem }) {
  return (
    <View style={styles.lineRow}>
      <Text style={styles.lineDesc} numberOfLines={2}>{item.description}</Text>
      <Text style={styles.lineQty}>{item.quantity} {item.unit}</Text>
      <Text style={styles.lineTotal}>{formatAmount(item.line_total ?? 0)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  docNumber: { fontSize: 12, color: '#9ca3af', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  docTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statusBadge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f9fafb', gap: 8 },
  metaLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  metaValue: { fontSize: 13, color: '#374151', fontWeight: '500', textAlign: 'right' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#f97316', marginTop: 10, marginBottom: 4 },
  lineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#f9fafb', gap: 8 },
  lineDesc: { flex: 1, fontSize: 14, color: '#374151' },
  lineQty: { fontSize: 13, color: '#6b7280', minWidth: 56, textAlign: 'right' },
  lineTotal: { fontSize: 14, fontWeight: '600', color: '#111827', minWidth: 72, textAlign: 'right' },
  totalsBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalRowFinal: { marginTop: 4, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  totalValue: { fontSize: 13, color: '#374151' },
  totalLabelBold: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalValueBold: { fontSize: 15, fontWeight: '700', color: '#111827' },
})
