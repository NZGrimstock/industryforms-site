import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, Platform,
} from 'react-native'
import { useLocalSearchParams, Stack, router } from 'expo-router'
import { useQuery } from '@powersync/react'

function openPhone(phone: string) {
  Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address)
  const url = Platform.OS === 'ios'
    ? `maps://maps.apple.com/?q=${encoded}`
    : `https://maps.google.com/?q=${encoded}`
  Linking.openURL(url)
}

const JOB_STATUS_COLOR: Record<string, string> = {
  unscheduled: '#6b7280',
  scheduled:   '#3b82f6',
  in_progress: '#f97316',
  on_hold:     '#eab308',
  completed:   '#22c55e',
  cancelled:   '#ef4444',
}

const JOB_STATUS_LABEL: Record<string, string> = {
  unscheduled: 'Unscheduled',
  scheduled:   'Scheduled',
  in_progress: 'In progress',
  on_hold:     'On hold',
  completed:   'Completed',
  cancelled:   'Cancelled',
}

type Customer = {
  id: string
  name: string
  type: string
  email: string | null
  phone: string | null
  billing_address: string | null
  contact_person: string | null
}

type Site = {
  id: string
  label: string | null
  address: string
  access_notes: string | null
}

type Job = {
  id: string
  job_number: string
  title: string
  status: string
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: customers, isLoading } = useQuery<Customer>(
    `SELECT id, name, type, email, phone, billing_address, contact_person
     FROM customers WHERE id = ?`,
    [id]
  )
  const customer = customers?.[0]

  const { data: sites } = useQuery<Site>(
    `SELECT id, label, address, access_notes
     FROM customer_sites WHERE customer_id = ?
     ORDER BY rowid ASC`,
    [id]
  )

  const { data: jobs } = useQuery<Job>(
    `SELECT id, job_number, title, status
     FROM jobs WHERE customer_id = ?
     ORDER BY created_at DESC
     LIMIT 10`,
    [id]
  )

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#f97316" />
      </View>
    )
  }

  if (!customer) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9ca3af' }}>Customer not found</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Stack.Screen options={{ title: customer.name, headerTintColor: '#f97316' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {customer.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{customer.type}</Text>
              </View>
            </View>
          </View>

          {customer.contact_person && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Contact</Text>
              <Text style={styles.metaValue}>{customer.contact_person}</Text>
            </View>
          )}
          {customer.email && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Email</Text>
              <Text style={styles.metaValue} numberOfLines={1}>{customer.email}</Text>
            </View>
          )}
          {customer.phone && (
            <TouchableOpacity style={styles.metaRow} onPress={() => openPhone(customer.phone!)} activeOpacity={0.7}>
              <Text style={styles.metaLabel}>Phone</Text>
              <Text style={[styles.metaValue, { color: '#f97316' }]}>{customer.phone}</Text>
            </TouchableOpacity>
          )}
          {customer.billing_address && (
            <TouchableOpacity style={styles.metaRow} onPress={() => openMaps(customer.billing_address!)} activeOpacity={0.7}>
              <Text style={styles.metaLabel}>Address</Text>
              <Text style={[styles.metaValue, { flex: 1, color: '#f97316' }]} numberOfLines={3}>{customer.billing_address}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sites */}
        {(sites ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sites</Text>
            {(sites ?? []).map((site, idx) => (
              <TouchableOpacity key={site.id} style={[styles.siteRow, idx === 0 && { borderTopWidth: 0 }]} onPress={() => openMaps(site.address)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  {site.label && (
                    <Text style={styles.siteLabel}>{site.label}</Text>
                  )}
                  <Text style={[styles.siteAddress, { color: '#f97316' }]}>{site.address}</Text>
                  {site.access_notes && (
                    <Text style={styles.siteNotes} numberOfLines={2}>{site.access_notes}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent jobs */}
        {(jobs ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recent Jobs</Text>
            {(jobs ?? []).map((job, idx) => {
              const color = JOB_STATUS_COLOR[job.status] ?? '#9ca3af'
              return (
                <TouchableOpacity
                  key={job.id}
                  style={[styles.jobRow, idx === 0 && { borderTopWidth: 0 }]}
                  onPress={() => router.push(`/jobs/${job.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobNumber}>{job.job_number}</Text>
                    <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.statusText, { color }]}>
                      {JOB_STATUS_LABEL[job.status] ?? job.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#f97316' },
  customerName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { fontSize: 11, fontWeight: '600', color: '#3b82f6', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f9fafb', gap: 8 },
  metaLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  metaValue: { fontSize: 13, color: '#374151', fontWeight: '500', textAlign: 'right' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  siteRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  siteLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 2 },
  siteAddress: { fontSize: 14, color: '#111827' },
  siteNotes: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  jobRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f9fafb', gap: 10 },
  jobNumber: { fontSize: 11, color: '#9ca3af', fontWeight: '600', letterSpacing: 0.5, marginBottom: 1 },
  jobTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  statusBadge: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
})
