import React, { useState, useCallback } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "./src/theme";

import DailyScreen from "./src/screens/DailyScreen";
import StatsScreen from "./src/screens/StatsScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDateChange = useCallback((delta, goToday) => {
    if (goToday) {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      setCurrentDate(d);
    } else {
      setCurrentDate((prev) => {
        const d2 = new Date(prev);
        d2.setDate(d2.getDate() + delta);
        return d2;
      });
    }
  }, []);

  const handleSelectDate = useCallback((date) => setCurrentDate(date), []);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let icon;
              if (route.name === "学习") icon = focused ? "book" : "book-outline";
              else if (route.name === "统计") icon = focused ? "stats-chart" : "stats-chart-outline";
              else if (route.name === "日历") icon = focused ? "calendar" : "calendar-outline";
              else icon = focused ? "settings" : "settings-outline";
              return <Ionicons name={icon} size={size} color={color} />;
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarStyle: {
              backgroundColor: colors.card,
              borderTopColor: colors.borderLight,
              borderTopWidth: 1,
              paddingBottom: 6,
              paddingTop: 6,
              height: 58,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
            headerShown: false,
          })}
        >
          <Tab.Screen name="学习">
            {() => <DailyScreen key={refreshKey} date={currentDate} onDateChange={handleDateChange} />}
          </Tab.Screen>
          <Tab.Screen name="统计" component={StatsScreen} />
          <Tab.Screen name="日历">
            {() => <CalendarScreen onSelectDate={handleSelectDate} />}
          </Tab.Screen>
          <Tab.Screen name="设置">
            {() => <SettingsScreen refreshAll={handleRefresh} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
