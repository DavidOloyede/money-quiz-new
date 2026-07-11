/**
 * The five-tab shell — Today (the daily habit loop), Quiz, Dashboard, Import,
 * Settings — ordered by mobile value per the roadmap. Account pushes over the
 * tabs from Settings.
 */
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ColorValue } from 'react-native'

import { fonts, useAppTheme } from '@/theme'

type IconName = keyof typeof Ionicons.glyphMap

function tab(title: string, icon: IconName, iconFocused: IconName) {
  return {
    title,
    tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <Ionicons name={focused ? iconFocused : icon} size={22} color={color} />
    ),
  }
}

export default function TabsLayout() {
  const { colors } = useAppTheme()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 10 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={tab('Today', 'sunny-outline', 'sunny')} />
      <Tabs.Screen name="quiz" options={tab('Quiz', 'school-outline', 'school')} />
      <Tabs.Screen name="dashboard" options={tab('Dashboard', 'pie-chart-outline', 'pie-chart')} />
      <Tabs.Screen name="import" options={tab('Import', 'download-outline', 'download')} />
      <Tabs.Screen name="settings" options={tab('Settings', 'settings-outline', 'settings')} />
    </Tabs>
  )
}
