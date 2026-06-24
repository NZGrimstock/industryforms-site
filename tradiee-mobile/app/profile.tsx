import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function ProfileScreen() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicleReg, setVehicleReg] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles')
        .select('full_name, phone, vehicle_registration')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setFullName(data?.full_name ?? '')
          setPhone(data?.phone ?? '')
          setVehicleReg(data?.vehicle_registration ?? '')
          setLoading(false)
        })
    })
  }, [])

  async function save() {
    if (!userId) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      vehicle_registration: vehicleReg.trim() || null,
    }).eq('id', userId)
    setSaving(false)
    if (error) { Alert.alert('Error', error.message); return }
    Alert.alert('Saved', 'Profile updated.', [{ text: 'OK', onPress: () => router.back() }])
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#f97316" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'My Profile', headerTintColor: '#f97316' }} />
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        <View style={s.field}>
          <Text style={s.label}>Full name</Text>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Phone</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+64 21 …"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Vehicle registration</Text>
          <TextInput
            style={s.input}
            value={vehicleReg}
            onChangeText={setVehicleReg}
            placeholder="ABC123"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
          />
          <Text style={s.hint}>Used in the GPS vehicle logbook</Text>
        </View>

        <TouchableOpacity
          style={[s.btn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Save changes</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827' },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  btn: { backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
