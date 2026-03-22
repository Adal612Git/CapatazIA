import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getApiConnectionHint, loginAgainstApi } from '../../lib/mobile-session';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('diego@capataz.ai');
  const [password, setPassword] = useState('capataz123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiBaseUrl = getApiConnectionHint();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginAgainstApi(email, password, 'automotive');
      setLoading(false);
      router.replace('/(tabs)');
    } catch (nextError) {
      setLoading(false);
      setError(nextError instanceof Error ? nextError.message : 'Ingresa tus credenciales');
    }
  };

  return (
    <LinearGradient colors={['#020B1A', '#061126', '#0F1D3D']} style={styles.container}>
      {/* Background decorative circles */}
      <View style={[styles.circle, { top: -60, right: -60, backgroundColor: '#22D3EE15' }]} />
      <View style={[styles.circle, { bottom: 80, left: -80, backgroundColor: '#8B5CF615', width: 240, height: 240 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <LinearGradient colors={['#22D3EE', '#0891B2']} style={styles.logoBox}>
            <Text style={styles.logoChar}>C</Text>
          </LinearGradient>
          <Text style={styles.brandName}>Capataz</Text>
          <Text style={styles.brandTagline}>Tu trabajo, tu crédito</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bienvenido</Text>
          <Text style={styles.cardSubtitle}>Inicia sesión para continuar</Text>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={Colors.textMuted}
                placeholder="correo@empresa.com"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor={Colors.textMuted}
                placeholder="••••••••"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#22D3EE', '#0891B2']} style={styles.loginBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Entrar</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.textOnPrimary} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        {/* Demo hint */}
        <View style={styles.demoHint}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.demoHintText}>Backend actual: {apiBaseUrl}</Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  circle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoChar: {
    fontSize: 36,
    fontWeight: '800',
    color: '#061126',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#EF444415',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
  },
  loginBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotText: {
    color: Colors.primary,
    fontSize: 13,
  },
  demoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 24,
  },
  demoHintText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
