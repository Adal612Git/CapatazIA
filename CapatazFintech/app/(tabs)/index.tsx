import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useMobileBundle } from '../../lib/mobile-session';

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString('es-MX')} MXN`;
}

export default function HomeScreen() {
  const { bundle, loading, error } = useMobileBundle();

  if (loading || !bundle) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>{error || 'Conectando con Capataz...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreadAlerts = bundle.alerts.filter((alert) => !alert.read).length;
  const completedToday = bundle.myTasks.filter((task) => task.status === 'completado').length;
  const overdueTasks = bundle.myTasks.filter((task) => task.overdue).length;
  const recommendedProduct = bundle.creditProducts[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {bundle.currentUser.name.split(' ')[0]}</Text>
            <Text style={styles.subtitle}>{bundle.currentUser.sede}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="notifications-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.headerBadgeText}>{unreadAlerts}</Text>
          </View>
        </View>

        <LinearGradient colors={['#0A1F4E', '#0F1D3D']} style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>CAPATAZ SCORE</Text>
            <Text style={styles.heroTitle}>{bundle.currentUser.score}/100</Text>
            <Text style={styles.heroSub}>{bundle.currentUser.statusLabel}</Text>
            <TouchableOpacity style={styles.heroButton} onPress={() => router.push('/(tabs)/score')}>
              <Text style={styles.heroButtonText}>Ver detalle</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroRing}>
            <Text style={styles.heroRingValue}>{bundle.currentUser.score}</Text>
            <Text style={styles.heroRingLabel}>nivel actual</Text>
          </View>
        </LinearGradient>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{completedToday}</Text>
            <Text style={styles.kpiLabel}>Tareas cerradas</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{overdueTasks}</Text>
            <Text style={styles.kpiLabel}>Vencidas</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{bundle.accountSummary.activeApplications}</Text>
            <Text style={styles.kpiLabel}>Solicitudes</Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.88} onPress={() => router.push('/(tabs)/credito')}>
          <LinearGradient colors={['#1A0F4E', '#2D1B8E', '#8B5CF640']} style={styles.creditBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.creditBannerTag}>CAPITAL DISPONIBLE</Text>
              <Text style={styles.creditBannerTitle}>{recommendedProduct?.name ?? 'Capataz Capital'}</Text>
              <Text style={styles.creditBannerText}>
                {formatMoney(bundle.accountSummary.availableBalance)} libres · {recommendedProduct?.rate ?? '0%'}
              </Text>
            </View>
            <Ionicons name="card-outline" size={24} color={Colors.textPrimary} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mi carga operativa</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/ventas')}>
            <Text style={styles.sectionAction}>Ver más</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {bundle.myTasks.slice(0, 4).map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={[styles.taskDot, { backgroundColor: task.overdue ? Colors.danger : Colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {task.dueTime} · {task.hasChecklist ? 'Checklist' : 'Sin checklist'}
                </Text>
              </View>
              <Text style={styles.taskStatus}>{task.status}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lectura IA</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/credito')}>
            <Text style={styles.sectionAction}>Fintech</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {bundle.financeInsights.slice(0, 3).map((insight) => (
            <View key={insight.id} style={styles.insightRow}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightBody}>{insight.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Factores del score</Text>
        </View>

        <View style={styles.card}>
          {[
            ['Cumplimiento', bundle.scoreBreakdown.cumplimiento, Colors.success],
            ['Velocidad', bundle.scoreBreakdown.velocidad, Colors.primary],
            ['Consistencia', bundle.scoreBreakdown.consistencia, Colors.secondary],
            ['Actividad', bundle.scoreBreakdown.actividad, Colors.warning],
          ].map(([label, value, color]) => (
            <View key={label as string} style={styles.factorRow}>
              <Text style={styles.factorLabel}>{label}</Text>
              <View style={styles.factorTrack}>
                <View style={[styles.factorFill, { width: `${Number(value)}%` as const, backgroundColor: color as string }]} />
              </View>
              <Text style={[styles.factorValue, { color: color as string }]}>{value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  scroll: { padding: 16, gap: 16 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  greeting: { color: Colors.textPrimary, fontSize: 24, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, marginTop: 4 },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerBadgeText: { color: Colors.textPrimary, fontWeight: '700' },
  hero: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroCopy: { flex: 1, paddingRight: 16 },
  heroEyebrow: { color: Colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: Colors.textPrimary, fontSize: 34, fontWeight: '900', marginTop: 8 },
  heroSub: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 6 },
  heroButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '18',
    borderColor: Colors.primary + '35',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroButtonText: { color: Colors.primary, fontWeight: '700' },
  heroRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#061126',
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingValue: { color: Colors.textPrimary, fontSize: 28, fontWeight: '900' },
  heroRingLabel: { color: Colors.textSecondary, fontSize: 10 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiValue: { color: Colors.textPrimary, fontSize: 24, fontWeight: '900' },
  kpiLabel: { color: Colors.textSecondary, fontSize: 11, marginTop: 4 },
  creditBanner: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
  },
  creditBannerTag: { color: Colors.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  creditBannerTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 6 },
  creditBannerText: { color: Colors.textSecondary, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },
  sectionAction: { color: Colors.primary, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskDot: { width: 10, height: 10, borderRadius: 5 },
  taskTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  taskMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  taskStatus: { color: Colors.primary, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  insightRow: { gap: 4 },
  insightTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  insightBody: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  factorLabel: { color: Colors.textSecondary, width: 92, fontSize: 12 },
  factorTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.canvas, overflow: 'hidden' },
  factorFill: { height: '100%', borderRadius: 4 },
  factorValue: { width: 34, textAlign: 'right', fontWeight: '700' },
});
