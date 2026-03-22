import { Redirect, Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useMobileSession } from '../../lib/mobile-session';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabBarIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? Colors.primary : Colors.textMuted}
      />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabsLayout() {
  const session = useMobileSession();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A1628', borderTopWidth: 1, borderTopColor: Colors.border }]} />
        ),
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="score"
        options={{
          title: 'Score',
          tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ventas"
        options={{
          title: 'Actividad',
          tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="credito"
        options={{
          title: 'Crédito',
          tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? 'card' : 'card-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingBottom: 10,
    paddingTop: 6,
    borderTopWidth: 0,
    elevation: 0,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabIconActive: {},
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
