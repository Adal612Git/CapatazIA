export const currentUser = {
  id: 'u1',
  name: 'Diego Torres',
  role: 'Operador',
  sede: 'Guadalajara Centro',
  avatar: 'DT',
  score: 63,
  email: 'diego@capataz.ai',
};

export const scoreBreakdown = {
  cumplimiento: 58,
  velocidad: 71,
  consistencia: 62,
  actividad: 60,
};

export const scoreHistory = [
  { week: 'Sem 1', score: 55 },
  { week: 'Sem 2', score: 58 },
  { week: 'Sem 3', score: 60 },
  { week: 'Sem 4', score: 63 },
  { week: 'Sem 5', score: 61 },
  { week: 'Sem 6', score: 63 },
];

export const teamScores = [
  { name: 'Laura Martínez', role: 'Supervisora', score: 91, avatar: 'LM', trend: '+3' },
  { name: 'Ana Belén Soto', role: 'Operadora', score: 88, avatar: 'AB', trend: '+2' },
  { name: 'Fernanda Ruiz', role: 'Operadora', score: 84, avatar: 'FR', trend: '+1' },
  { name: 'José Luis Vega', role: 'Supervisor Jr.', score: 71, avatar: 'JL', trend: '-2' },
  { name: 'Diego Torres', role: 'Operador', score: 63, avatar: 'DT', trend: '+4', isMe: true },
];

export const myTasks = [
  {
    id: 't1',
    title: 'Inspección tablero eléctrico - Planta Norte',
    priority: 'alta',
    status: 'pendiente',
    dueTime: '10:30',
    hasChecklist: true,
    overdue: true,
  },
  {
    id: 't2',
    title: 'Carga de evidencia fotográfica de visita',
    priority: 'media',
    status: 'en_proceso',
    dueTime: '12:00',
    hasChecklist: false,
    overdue: false,
  },
  {
    id: 't3',
    title: 'Revisión semanal de extintores',
    priority: 'baja',
    status: 'pendiente',
    dueTime: '16:00',
    hasChecklist: true,
    overdue: false,
  },
];

export const weeklyActivity = [
  { day: 'L', completed: 3, total: 4 },
  { day: 'M', completed: 2, total: 3 },
  { day: 'X', completed: 4, total: 4 },
  { day: 'J', completed: 1, total: 3 },
  { day: 'V', completed: 2, total: 4 },
  { day: 'S', completed: 0, total: 1 },
  { day: 'D', completed: 0, total: 0 },
];

export const creditProducts = [
  {
    id: 'p1',
    name: 'Adelanto de Nómina',
    description: 'Hasta 50% de tu quincena',
    maxAmount: 4500,
    rate: '0%',
    term: 'Quincena',
    icon: 'wallet',
    available: true,
    requiredScore: 50,
    color: '#22D3EE',
  },
  {
    id: 'p2',
    name: 'Microcrédito Personal',
    description: 'Para imprevistos del hogar',
    maxAmount: 8000,
    rate: '2.5% mensual',
    term: '6 meses',
    icon: 'cash',
    available: true,
    requiredScore: 60,
    color: '#8B5CF6',
  },
  {
    id: 'p3',
    name: 'Crédito Herramientas',
    description: 'Equipa tu trabajo',
    maxAmount: 15000,
    rate: '1.8% mensual',
    term: '12 meses',
    icon: 'construct',
    available: false,
    requiredScore: 75,
    color: '#10B981',
  },
  {
    id: 'p4',
    name: 'Seguro de Trabajo',
    description: 'Protección ante incidentes',
    maxAmount: 0,
    rate: '$89/mes',
    term: 'Mensual',
    icon: 'shield-checkmark',
    available: true,
    requiredScore: 0,
    color: '#F59E0B',
  },
];

export const transactions = [
  {
    id: 'tx1',
    type: 'credito',
    title: 'Adelanto de Nómina',
    amount: +2500,
    date: '10 Mar 2026',
    status: 'completado',
  },
  {
    id: 'tx2',
    type: 'pago',
    title: 'Pago Microcrédito',
    amount: -833,
    date: '05 Mar 2026',
    status: 'completado',
  },
  {
    id: 'tx3',
    type: 'credito',
    title: 'Microcrédito Personal',
    amount: +5000,
    date: '01 Feb 2026',
    status: 'activo',
  },
  {
    id: 'tx4',
    type: 'pago',
    title: 'Pago Microcrédito',
    amount: -833,
    date: '01 Mar 2026',
    status: 'completado',
  },
  {
    id: 'tx5',
    type: 'bono',
    title: 'Bono Desempeño Q1',
    amount: +750,
    date: '28 Feb 2026',
    status: 'completado',
  },
];

export const alerts = [
  {
    id: 'a1',
    title: 'Tarea vencida',
    description: 'Inspección tablero eléctrico no completada',
    severity: 'alta',
    time: 'Hace 45 min',
    read: false,
  },
  {
    id: 'a2',
    title: 'Score mejoró',
    description: 'Tu Capataz Score subió 4 puntos esta semana',
    severity: 'info',
    time: 'Hoy 09:00',
    read: false,
  },
  {
    id: 'a3',
    title: 'Nuevo producto disponible',
    description: 'Calificas para el Adelanto de Nómina',
    severity: 'info',
    time: 'Ayer',
    read: true,
  },
];
