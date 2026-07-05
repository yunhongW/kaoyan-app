import React, { useRef, useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { colors } from "../theme";

export default function AnimatedBar({ pct, height = 6, color = colors.primary }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[styles.bg, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            width: anim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: colors.barBg, overflow: "hidden", flex: 1 },
  fill: { position: "absolute", left: 0, top: 0 },
});
