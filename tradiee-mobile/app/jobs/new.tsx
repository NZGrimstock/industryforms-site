import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList,
} from 'react-native'
import { router, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

type Customer = { id: string; name: string; phone: string | null }

export default function NewJobScreen() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('company_id').eq('id', user.id).single()
        .then(({ data: prof }) => {
          if (!prof) return
          setCompanyId(prof.company_id)
          supabase.from('customers')
            .select('id, name, phone')
            .eq('company_id', prof.company_id)
            .eq('is_active', true)
            .order('name')
            .limit(300)
            .then(({ data }) => setCustomers(data ?? []))
        })
    })
  }, [])

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  async function save() {
    if (!title.trim()) { Alert.alert('Title required', 'Please enter a job title.'); return }
    if (!companyId || !userId) return
    setSaving(true)
    const { data, error } = await supabase.from('jobs').insert({
      title: title.trim(),
      description: description.trim() || null,
      company_id: companyId,
      customer_id: customerId,
      assigned_to: userId,
      status: 'unscheduled',
    }).select('id').single()
    setSaving(false)
    if (error) { Alert.alert('Error', error.message); return }
    router.replace(`/jobs/${data.id}`)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'New Job', headerTintColor: '#f97316' }} />
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        <View style={s.field}>
          <Text style={s.label}>Job title *</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Replace hot water cylinder"
            placeholderTextColor="#9ca3af"
            autoFocus
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Customer</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
            <Text style={customerId ? s.pickerVal : s.pickerPlaceholder}>
              {customerName || 'Select a customer…'}
            </Text>
            <Feather name="chevron-down" size={16} color="#9ca3af" />
          </TouchableOpacity>
          {customerId && (
            <TouchableOpacity onPress={() => { setCustomerId(null); setCustomerName('') }} style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>Clear ×</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.field}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, s.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional details about the job…"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, (!title.trim() || saving) && { opacity: 0.5 }]}
          onPress={save}
          disabled={!title.trim() || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Create Job</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Select Customer</Text>
            <TouchableOpacity onPress={() => { setShowPicker(false); setCustomerSearch('') }}>
              <Text style={s.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={s.searchBox}>
            <Feather name="search" size={15} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholder="Search customers…"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
          </View>
          <FlatList
            data={filteredCustomers}
            keyExtractor={c => c.id}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.custRow}
                onPress={() => {
                  setCustomerId(item.id)
                  setCustomerName(item.name)
                  setShowPicker(false)
                  setCustomerSearch('')
                }}
                activeOpacity={0.6}
              >
                <Text style={s.custName}>{item.name}</Text>
                {item.phone && <Text style={s.custSub}>{item.phone}</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>No customers found</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827' },
  multiline: { minHeight: 100, paddingTop: 12 },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  pickerVal: { fontSize: 15, color: '#111827' },
  pickerPlaceholder: { fontSize: 15, color: '#9ca3af' },
  btn: { backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalClose: { fontSize: 15, color: '#f97316', fontWeight: '600' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  custRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  custName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  custSub: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
})
