import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { applyForCredit, useMobileBundle } from '../../lib/mobile-session';

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString('es-MX')} MXN`;
}

export default function CreditoScreen() {
  const { session, bundle, loading, error, reload } = useMobileBundle();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [rationale, setRationale] = useState('Necesidad operativa o personal validada en la demo.');
  const [submitting, setSubmitting] = useState(false);

  if (loading || !bundle || !session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>{error || 'Cargando productos financieros...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedProduct = bundle.creditProducts.find((product) => product.id === selectedProductId) ?? null;

  async function submitRequest() {
    if (!selectedProduct || !session) {
      return;
    }

    const numericAmount = Number(amount || selectedProduct.maxAmount || 0);
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      Alert.alert('Monto inválido', 'Captura un monto válido para la solicitud.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await applyForCredit(session, selectedProduct.id, numericAmount, rationale);
      setSelectedProductId(null);
      setAmount('');
      setSubmitting(false);
      await reload();
      Alert.alert('Solicitud enviada', result.message);
    } catch (nextError) {
      setSubmitting(false);
      Alert.alert('No se pudo enviar', nextError instanceof Error ? nextError.message : 'Error inesperado');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#061126', '#0F1D3D']} style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTag}>CAPATAZ CAPITAL</Text>
            <Text style={styles.heroTitle}>{formatMoney(bundle.accountSummary.availableBalance)}</Text>
            <Text style={styles.heroText}>Saldo disponible hoy</Text>
          </View>
          <View style={styles.heroStats}>
            <Text style={styles.heroStatsValue}>{bundle.currentUser.score}</Text>
            <Text style={styles.heroStatsLabel}>score</Text>
          </View>
        </LinearGradient>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{formatMoney(bundle.accountSummary.pendingBalance)}</Text>
            <Text style={styles.kpiLabel}>Pendiente</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{formatMoney(bundle.accountSummary.creditLimit)}</Text>
            <Text style={styles.kpiLabel}>Línea visible</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{bundle.accountSummary.activeApplications}</Text>
            <Text style={styles.kpiLabel}>Solicitudes</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Productos disponibles</Text>
          {bundle.creditProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[styles.productCard, !product.available && styles.productCardLocked]}
              activeOpacity={0.88}
              onPress={() => product.available && setSelectedProductId(product.id)}
            >
              <View style={[styles.productIcon, { backgroundColor: product.color + '20' }]}>
                <Ionicons name={product.icon as any} size={18} color={product.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDesc}>{product.description}</Text>
                <Text style={styles.productMeta}>
                  {product.maxAmount > 0 ? formatMoney(product.maxAmount) : product.rate} · {product.term}
                </Text>
              </View>
              <Text style={[styles.productBadge, { color: product.available ? Colors.success : Colors.warning }]}>
                {product.available ? 'Solicitar' : `+${Math.max(product.requiredScore - bundle.currentUser.score, 0)} pts`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Solicitudes y movimientos</Text>
          {bundle.applications.map((application) => (
            <View key={application.id} style={styles.applicationRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.applicationTitle}>{application.productName}</Text>
                <Text style={styles.applicationMeta}>
                  {formatMoney(application.requestedAmount)} · {application.termLabel}
                </Text>
              </View>
              <Text style={styles.applicationStatus}>{application.status}</Text>
            </View>
          ))}
          {bundle.transactions.slice(0, 5).map((transaction) => (
            <View key={transaction.id} style={styles.transactionRow}>
              <View style={[styles.transactionIcon, { backgroundColor: transaction.amount >= 0 ? Colors.success + '20' : Colors.danger + '20' }]}>
                <Ionicons name={transaction.amount >= 0 ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={16} color={transaction.amount >= 0 ? Colors.success : Colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.transactionTitle}>{transaction.title}</Text>
                <Text style={styles.transactionDate}>{transaction.date}</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: transaction.amount >= 0 ? Colors.success : Colors.danger }]}>
                {transaction.amount >= 0 ? '+' : ''}{formatMoney(transaction.amount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lectura IA</Text>
          {bundle.financeInsights.map((insight) => (
            <View key={insight.id} style={styles.insightRow}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightBody}>{insight.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={Boolean(selectedProduct)} transparent animationType="slide" onRequestClose={() => setSelectedProductId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
            <Text style={styles.modalSubtitle}>Esta solicitud se guarda en el runtime central y aparece también en web y WhatsApp.</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder={`Monto sugerido ${selectedProduct ? formatMoney(selectedProduct.maxAmount) : ''}`}
              placeholderTextColor={Colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              multiline
              value={rationale}
              onChangeText={setRationale}
              placeholder="Motivo de la solicitud"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity style={styles.submitButton} activeOpacity={0.88} onPress={() => void submitRequest()} disabled={submitting}>
              <LinearGradient colors={Colors.gradientPrimary} style={styles.submitGradient}>
                {submitting ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.submitText}>Enviar solicitud</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedProductId(null)} style={styles.closeButton}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  scroll: { padding: 16, gap: 16 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
  hero: {
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroTag: { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: Colors.textPrimary, fontSize: 28, fontWeight: '900', marginTop: 8 },
  heroText: { color: Colors.textSecondary, marginTop: 4 },
  heroStats: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#061126',
    borderWidth: 2,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatsValue: { color: Colors.textPrimary, fontSize: 24, fontWeight: '900' },
  heroStatsLabel: { color: Colors.textSecondary, fontSize: 10 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiValue: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  kpiLabel: { color: Colors.textSecondary, fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  productCard: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  productCardLocked: { opacity: 0.7 },
  productIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  productName: { color: Colors.textPrimary, fontWeight: '700' },
  productDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 3 },
  productMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 5 },
  productBadge: { fontWeight: '700', fontSize: 11 },
  applicationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  applicationTitle: { color: Colors.textPrimary, fontWeight: '700' },
  applicationMeta: { color: Colors.textSecondary, fontSize: 11, marginTop: 3 },
  applicationStatus: { color: Colors.primary, fontWeight: '700', textTransform: 'capitalize' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  transactionIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  transactionTitle: { color: Colors.textPrimary, fontWeight: '600' },
  transactionDate: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  transactionAmount: { fontWeight: '700', fontSize: 12 },
  insightRow: { gap: 4 },
  insightTitle: { color: Colors.textPrimary, fontWeight: '700' },
  insightBody: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: Colors.textSecondary, lineHeight: 18, fontSize: 12 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.canvas,
    color: Colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  submitButton: { marginTop: 8 },
  submitGradient: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  submitText: { color: Colors.textOnPrimary, fontWeight: '800', fontSize: 15 },
  closeButton: { alignItems: 'center', paddingVertical: 10 },
  closeText: { color: Colors.textSecondary },
});
