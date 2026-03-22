import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useMobileBundle } from '../../lib/mobile-session';

export default function ScoreScreen() {
  const { bundle, loading, error } = useMobileBundle();

  if (loading || !bundle) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>{error || 'Calculando score en vivo...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const factors = [
    { label: 'Cumplimiento', value: bundle.scoreBreakdown.cumplimiento, color: Colors.success, icon: 'checkmark-circle' },
    { label: 'Velocidad', value: bundle.scoreBreakdown.velocidad, color: Colors.primary, icon: 'flash' },
    { label: 'Consistencia', value: bundle.scoreBreakdown.consistencia, color: Colors.secondary, icon: 'repeat' },
    { label: 'Actividad', value: bundle.scoreBreakdown.actividad, color: Colors.warning, icon: 'pulse' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#061126', '#0F1D3D', '#162850']} style={styles.hero}>
          <View style={styles.heroRing}>
            <Text style={styles.heroScore}>{bundle.currentUser.score}</Text>
            <Text style={styles.heroLabel}>de 100</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Capataz Score</Text>
            <Text style={styles.heroSubtitle}>{bundle.currentUser.name}</Text>
            <Text style={styles.heroBody}>{bundle.currentUser.statusLabel}</Text>
            <View style={styles.heroTrend}>
              <Ionicons name="trending-up" size={14} color={Colors.success} />
              <Text style={styles.heroTrendText}>Tu historial ya está conectado con crédito y beneficios</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Factores del score</Text>
          {factors.map((factor) => (
            <View key={factor.label} style={styles.factorRow}>
              <View style={[styles.factorIcon, { backgroundColor: factor.color + '20' }]}>
                <Ionicons name={factor.icon as any} size={16} color={factor.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.factorHeader}>
                  <Text style={styles.factorLabel}>{factor.label}</Text>
                  <Text style={[styles.factorValue, { color: factor.color }]}>{factor.value}</Text>
                </View>
                <View style={styles.factorTrack}>
                  <View style={[styles.factorFill, { width: `${factor.value}%`, backgroundColor: factor.color }]} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Historial reciente</Text>
          <View style={styles.historyRow}>
            {bundle.scoreHistory.map((point) => (
              <View key={point.week} style={styles.historyColumn}>
                <View style={styles.historyBarTrack}>
                  <View style={[styles.historyBarFill, { height: `${point.score}%` }]} />
                </View>
                <Text style={styles.historyScore}>{point.score}</Text>
                <Text style={styles.historyWeek}>{point.week}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ranking del equipo</Text>
          {bundle.teamScores.slice(0, 6).map((member, index) => (
            <View key={member.name} style={styles.teamRow}>
              <Text style={styles.teamRank}>{index + 1}</Text>
              <View style={styles.teamAvatar}>
                <Text style={styles.teamAvatarText}>{member.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>
                  {member.name} {member.isMe ? '(Tú)' : ''}
                </Text>
                <Text style={styles.teamRole}>{member.role}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.teamScore}>{member.score}</Text>
                <Text style={styles.teamTrend}>{member.trend}</Text>
              </View>
            </View>
          ))}
        </View>

        <LinearGradient colors={['#0A1F4E', '#162850']} style={styles.bottomCard}>
          <Ionicons name="card-outline" size={22} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bottomTitle}>Score conectado a Capataz Capital</Text>
            <Text style={styles.bottomBody}>
              Productos, adelantos y aprobaciones usan el mismo score que ves aquí.
            </Text>
          </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  scroll: { padding: 16, gap: 16 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
  hero: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  heroRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#061126',
  },
  heroScore: { color: Colors.textPrimary, fontSize: 34, fontWeight: '900' },
  heroLabel: { color: Colors.textSecondary, fontSize: 11 },
  heroCopy: { flex: 1 },
  heroTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  heroSubtitle: { color: Colors.primary, marginTop: 4, fontWeight: '700' },
  heroBody: { color: Colors.textSecondary, marginTop: 8, lineHeight: 18, fontSize: 12 },
  heroTrend: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: Colors.success + '18',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroTrendText: { color: Colors.success, flex: 1, fontSize: 11 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 14,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  factorRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  factorIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  factorLabel: { color: Colors.textPrimary, fontWeight: '600' },
  factorValue: { fontWeight: '800' },
  factorTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.canvas, overflow: 'hidden' },
  factorFill: { height: '100%', borderRadius: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  historyColumn: { flex: 1, alignItems: 'center' },
  historyBarTrack: {
    width: '100%',
    maxWidth: 28,
    height: 110,
    borderRadius: 8,
    backgroundColor: Colors.canvas,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  historyBarFill: { width: '100%', backgroundColor: Colors.primary, borderRadius: 8 },
  historyScore: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 8 },
  historyWeek: { color: Colors.textSecondary, fontSize: 10, marginTop: 2 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamRank: { color: Colors.textMuted, width: 18, textAlign: 'center', fontWeight: '700' },
  teamAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: { color: Colors.textPrimary, fontWeight: '800' },
  teamName: { color: Colors.textPrimary, fontWeight: '700' },
  teamRole: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  teamScore: { color: Colors.textPrimary, fontSize: 16, fontWeight: '900' },
  teamTrend: { color: Colors.success, fontSize: 11, marginTop: 2 },
  bottomCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  bottomTitle: { color: Colors.textPrimary, fontWeight: '700' },
  bottomBody: { color: Colors.textSecondary, marginTop: 4, lineHeight: 18, fontSize: 12 },
});
