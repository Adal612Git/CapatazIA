export const Colors = {
  // Backgrounds
  canvas: '#061126',
  surface: '#0F1D3D',
  surfaceElevated: '#162850',
  border: '#1E3A6E',
  borderLight: '#243F73',

  // Brand
  primary: '#22D3EE',    // cyan
  primaryDim: '#0891B2',
  secondary: '#8B5CF6',  // violet
  secondaryDim: '#6D28D9',

  // Semantic
  warning: '#F59E0B',    // amber
  success: '#10B981',    // emerald
  danger: '#EF4444',     // red
  info: '#3B82F6',       // blue

  // Text
  textPrimary: '#F0F9FF',
  textSecondary: '#94A3B8',
  textMuted: '#475569',
  textOnPrimary: '#061126',

  // Score levels
  scoreHigh: '#10B981',    // 85-100
  scoreMid: '#22D3EE',     // 70-84
  scoreLow: '#F59E0B',     // <70

  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#22D3EE', '#0891B2'] as const,
  gradientSecondary: ['#8B5CF6', '#6D28D9'] as const,
  gradientSuccess: ['#10B981', '#059669'] as const,
  gradientDanger: ['#EF4444', '#DC2626'] as const,
  gradientWarning: ['#F59E0B', '#D97706'] as const,
  gradientDark: ['#0F1D3D', '#061126'] as const,
  gradientCard: ['#162850', '#0F1D3D'] as const,
};
