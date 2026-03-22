import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { setMobileSession, useMobileBundle } from '../../lib/mobile-session';

export default function PerfilScreen() {
  const { bundle, loading, error } = useMobileBundle();

  if (loading || !bundle) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>{error || 'Cargando perfil...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#0A1F4E', '#0F1D3D']} style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{bundle.currentUser.avatar}</Text>
          </View>
          <Text style={styles.profileName}>{bundle.currentUser.name}</Text>
          <Text style={styles.profileRole}>{bundle.currentUser.role} · {bundle.currentUser.sede}</Text>
          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{bundle.currentUser.score}</Text>
              <Text style={styles.profileStatLabel}>Score</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{bundle.accountSummary.activeApplications}</Text>
              <Text style={styles.profileStatLabel}>Solicitudes</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{bundle.achievements.filter((item) => item.earned).length}</Text>
              <Text style={styles.profileStatLabel}>Logros</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Logros</Text>
          <View style={styles.achievementGrid}>
            {bundle.achievements.map((achievement) => (
              <View key={achievement.id} style={[styles.achievementCard, !achievement.earned && styles.achievementCardLocked]}>
                <View style={[styles.achievementIcon, { backgroundColor: achievement.color + '25' }]}>
                  <Ionicons name={achievement.icon as any} size={18} color={achievement.color} />
                </View>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDesc}>{achievement.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preferencias demo</Text>
          {[
            ['Notificaciones push', true],
            ['Alertas de score', true],
            ['Ofertas de crédito', bundle.creditProducts.some((product) => product.available)],
          ].map(([label, value]) => (
            <View key={label as string} style={styles.settingRow}>
              <Text style={styles.settingLabel}>{label}</Text>
              <Switch
                value={Boolean(value)}
                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                thumbColor={Boolean(value) ? Colors.primary : Colors.textMuted}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.88}
          onPress={() => {
            setMobileSession(null);
            router.replace('/(auth)/login');
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  scroll: { padding: 16, gap: 16 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
  profileCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.textOnPrimary, fontSize: 24, fontWeight: '900' },
  profileName: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 14 },
  profileRole: { color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  profileStats: { flexDirection: 'row', gap: 24, marginTop: 18 },
  profileStat: { alignItems: 'center' },
  profileStatValue: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900' },
  profileStatLabel: { color: Colors.textSecondary, fontSize: 10, marginTop: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 14,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementCard: {
    width: '48%',
    backgroundColor: Colors.canvas,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  achievementCardLocked: { opacity: 0.65 },
  achievementIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  achievementTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 12, marginTop: 10, textAlign: 'center' },
  achievementDesc: { color: Colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 4, textAlign: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel: { color: Colors.textPrimary, fontWeight: '600' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.danger + '15',
    borderColor: Colors.danger + '35',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
  },
  logoutText: { color: Colors.danger, fontWeight: '700' },
});
