import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

export default function ProgressRing({ pct = 0, size = 60, strokeWidth = 5, color = colors.primary }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: colors.barBg,
          },
        ]}
      />
      {/* Filled arc — simulated via border on a half-circle clip approach.
          Since react-native doesn't support conic-gradient, we use a simpler approach:
          render a full circle with a thick border, colored partially via
          overlaying a semi-transparent arc using two half-views.
          For simplicity, we represent progress as a filled background circle
          clipped by a View mask that grows from the bottom. */}
      <View style={[styles.mask, { width: size, height: size, borderRadius: size / 2, overflow: "hidden" }]}>
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${clampedPct}%`,
            backgroundColor: color,
          }}
        />
      </View>
      {/* Center text */}
      <View style={styles.center}>
        <Text style={[styles.pctText, { color }]}>{clampedPct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  circle: { position: "absolute" },
  mask: { position: "absolute", backgroundColor: "transparent" },
  center: { alignItems: "center", justifyContent: "center" },
  pctText: { fontSize: 13, fontWeight: "700" },
});
