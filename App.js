import React, { useState, useCallback, useEffect } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as store from "./src/store";
import { colors, typography } from "./src/theme";

import DailyScreen from "./src/screens/DailyScreen";
import StatsScreen from "./src/screens/StatsScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
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

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // 设置通知
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") return;
        await Notifications.cancelAllScheduledNotificationsAsync();
        const nt = await store.getNotificationTime();
        await Notifications.scheduleNotificationAsync({
          content: { title: "考研学习", body: "该学习啦！今天的计划完成了吗？" },
          trigger: { hour: nt.hour, minute: nt.minute, repeats: true },
        });
      } catch (e) {}
    })();
  }, []);

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
              else if (route.name === "仪表盘") icon = focused ? "speedometer" : "speedometer-outline";
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
          <Tab.Screen name="仪表盘" component={DashboardScreen} />
          <Tab.Screen name="设置">
            {() => <SettingsScreen refreshAll={handleRefresh} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
