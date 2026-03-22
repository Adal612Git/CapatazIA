import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useMobileBundle } from '../../lib/mobile-session';

export default function VentasScreen() {
  const { bundle, loading, error } = useMobileBundle();

  if (loading || !bundle) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>{error || 'Cargando actividad operativa...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalCompleted = bundle.weeklyActivity.reduce((sum, entry) => sum + entry.completed, 0);
  const totalAssigned = bundle.weeklyActivity.reduce((sum, entry) => sum + entry.total, 0);
  const completionRate = totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Actividad</Text>
            <Text style={styles.subtitle}>{bundle.currentUser.sede}</Text>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateValue}>{completionRate}%</Text>
            <Text style={styles.rateLabel}>cumplimiento</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Semana operativa</Text>
          <View style={styles.chartRow}>
            {bundle.weeklyActivity.map((entry) => (
              <View key={entry.day} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  <View
                    style={[
                      styles.chartFill,
                      { height: `${entry.total ? (entry.completed / entry.total) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.chartValue}>{entry.completed}/{entry.total}</Text>
                <Text style={styles.chartLabel}>{entry.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Estado de mis tareas</Text>
          {bundle.myTasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={[styles.taskDot, { backgroundColor: task.overdue ? Colors.danger : Colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {task.priority} · {task.status} · {task.dueTime}
                </Text>
              </View>
              <Text style={styles.taskChecklist}>{task.hasChecklist ? 'Checklist' : 'Simple'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Alertas recientes</Text>
          {bundle.alerts.map((alert) => (
            <View key={alert.id} style={styles.alertRow}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertBody}>{alert.description}</Text>
              <Text style={styles.alertTime}>{alert.time}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, marginTop: 4 },
  rateBadge: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary + '40',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rateValue: { color: Colors.primary, fontSize: 20, fontWeight: '900' },
  rateLabel: { color: Colors.textSecondary, fontSize: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  chartColumn: { flex: 1, alignItems: 'center' },
  chartTrack: {
    width: '100%',
    maxWidth: 28,
    height: 110,
    borderRadius: 8,
    backgroundColor: Colors.canvas,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartFill: { width: '100%', backgroundColor: Colors.primary, borderRadius: 8 },
  chartValue: { color: Colors.textPrimary, fontWeight: '700', fontSize: 11, marginTop: 8 },
  chartLabel: { color: Colors.textSecondary, fontSize: 10, marginTop: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskDot: { width: 10, height: 10, borderRadius: 5 },
  taskTitle: { color: Colors.textPrimary, fontWeight: '700' },
  taskMeta: { color: Colors.textSecondary, fontSize: 11, marginTop: 3, textTransform: 'capitalize' },
  taskChecklist: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  alertRow: { gap: 4 },
  alertTitle: { color: Colors.textPrimary, fontWeight: '700' },
  alertBody: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  alertTime: { color: Colors.textMuted, fontSize: 11 },
});
