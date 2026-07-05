import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Line, Polyline, Circle, Text as SvgText } from "react-native-svg";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";
import { Ionicons } from "@expo/vector-icons";

function getScoreColor(pct) {
  if (pct >= 0.8) return colors.success;
  if (pct >= 0.6) return colors.primary;
  if (pct >= 0.4) return colors.warning;
  return colors.danger;
}

export default function ExamScoreTrend({ papers, scoreTarget = 70, onDelete }) {
  if (!papers || papers.length === 0) {
    return (
      <Text style={{ textAlign: "center", color: colors.textTertiary, padding: 20 }}>
        还没有真题记录，去"仪表盘"页面添加吧
      </Text>
    );
  }

  // Sort by date ascending
  const sorted = [...papers].sort((a, b) => a.date.localeCompare(b.date));

  const W = 300, H = 180, PAD_L = 40, PAD_R = 10, PAD_T = 10, PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxPct = 100;
  const toX = (i) => PAD_L + (i / Math.max(1, sorted.length - 1)) * chartW;
  const toY = (pct) => PAD_T + chartH - (pct / maxPct) * chartH;

  const targetY = toY(scoreTarget);
  const points = sorted
    .map((p, i) => {
      const pct = p.totalScore > 0 ? Math.round((p.score / p.totalScore) * 100) : 0;
      return `${toX(i)},${toY(pct)}`;
    })
    .join(" ");

  return (
    <View>
      {/* Chart */}
      <View style={{ alignItems: "center", marginBottom: spacing.md }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Y-axis */}
          <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + chartH} stroke={colors.border} strokeWidth={1} />
          {/* X-axis */}
          <Line x1={PAD_L} y1={PAD_T + chartH} x2={PAD_L + chartW} y2={PAD_T + chartH} stroke={colors.border} strokeWidth={1} />
          {/* Target line */}
          <Line
            x1={PAD_L} y1={targetY} x2={PAD_L + chartW} y2={targetY}
            stroke={colors.accent} strokeWidth={1.5} strokeDasharray="6,3"
          />
          <SvgText x={PAD_L + 2} y={targetY - 4} fontSize={10} fill={colors.accent} fontWeight="600">
            目标{scoreTarget}%
          </SvgText>
          {/* Y-axis labels */}
          <SvgText x={PAD_L - 6} y={PAD_T + 5} fontSize={9} fill={colors.textTertiary} textAnchor="end">100</SvgText>
          <SvgText x={PAD_L - 6} y={PAD_T + chartH / 2 + 4} fontSize={9} fill={colors.textTertiary} textAnchor="end">50</SvgText>
          <SvgText x={PAD_L - 6} y={PAD_T + chartH} fontSize={9} fill={colors.textTertiary} textAnchor="end">0</SvgText>
          {/* Trend line */}
          {sorted.length >= 2 && (
            <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinejoin="round" />
          )}
          {/* Data points */}
          {sorted.map((p, i) => {
            const pct = p.totalScore > 0 ? Math.round((p.score / p.totalScore) * 100) : 0;
            return (
              <Circle
                key={p.id}
                cx={toX(i)}
                cy={toY(pct)}
                r={5}
                fill={getScoreColor(pct / 100)}
                stroke="#fff"
                strokeWidth={1.5}
              />
            );
          })}
        </Svg>
      </View>

      {/* Detail list */}
      <Text style={{ ...typography.small, color: colors.textSecondary, fontWeight: "600", marginBottom: spacing.sm }}>
        成绩记录
      </Text>
      {sorted.map((p) => {
        const pct = p.totalScore > 0 ? Math.round((p.score / p.totalScore) * 100) : 0;
        return (
          <View
            key={p.id}
            style={{
              flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm,
              borderBottomWidth: 1, borderBottomColor: colors.borderLight,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, fontWeight: "600", color: colors.text }}>
                {p.subject} {p.year}年
              </Text>
              <Text style={{ ...typography.tiny, color: colors.textTertiary }}>
                {p.date}{p.notes ? " - " + p.notes : ""}
              </Text>
            </View>
            <Text style={{ ...typography.h3, color: getScoreColor(pct / 100), marginRight: spacing.sm }}>
              {p.score}/{p.totalScore}
            </Text>
            <Text style={{ ...typography.small, color: getScoreColor(pct / 100), fontWeight: "700", minWidth: 36, textAlign: "right" }}>
              {pct}%
            </Text>
            {onDelete && (
              <TouchableOpacity style={{ padding: spacing.sm, marginLeft: spacing.xs }} onPress={() => onDelete(p.id)}>
                <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}
