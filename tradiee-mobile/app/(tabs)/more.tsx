import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

type Profile = { full_name: string | null; email: string }

export default function MoreScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => setProfile({ full_name: data?.full_name ?? null, email: user.email ?? '' }))
    })
  }, [])

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/login')
        }
      }
    ])
  }

  const menuItems = [
    { icon: '👤', label: 'My profile', onPress: () => {} },
    { icon: '🔔', label: 'Notifications', onPress: () => {} },
    { icon: '🔒', label: 'Change password', onPress: () => {} },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>More</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {profile && (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile.full_name ?? profile.email)[0].toUpperCase()}
              </Text>
            </View>
            <View>
              {profile.full_name && <Text style={styles.profileName}>{profile.full_name}</Text>}
              <Text style={styles.profileEmail}>{profile.email}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {menuItems.map(item => (
            <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress} activeOpacity={0.6}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.menuRow}>
            <Text style={styles.menuIcon}>📱</Text>
            <Text style={styles.menuLabel}>Version</Text>
            <Text style={styles.menuValue}>1.0.0</Text>
          </View>
          <View style={styles.menuRow}>
            <Text style={styles.menuIcon}>⚡</Text>
            <Text style={styles.menuLabel}>Sync mode</Text>
            <Text style={styles.menuValue}>PowerSync</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#f97316' },
  profileName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  profileEmail: { fontSize: 14, color: '#6b7280' },
  section: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f9fafb', gap: 12 },
  menuIcon: { fontSize: 18, width: 26 },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827' },
  menuValue: { fontSize: 14, color: '#9ca3af' },
  chevron: { fontSize: 20, color: '#d1d5db' },
  signOutBtn: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  signOutText: { color: '#ef4444', fontWeight: '600', fontSize: 16 },
})
