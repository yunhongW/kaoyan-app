// ===== 主题系统 - 温暖考研风格 =====

export const colors = {
  // 主色调 - 温暖墨绿
  primary: "#5b8c5e",
  primaryDark: "#3d6b40",
  primaryLight: "#e8f2e8",
  primaryBg: "#f0f7f0",

  // 强调色 - 阳光琥珀
  accent: "#d4a853",
  accentLight: "#fdf6e8",
  accentDark: "#b89130",

  // 功能色
  success: "#5b8c5e",
  successBg: "#eef6ee",
  danger: "#c47a7a",
  dangerBg: "#fdf0f0",
  warning: "#d4a853",
  warningBg: "#fdf6e8",

  // 中性色
  bg: "#f7f6f2",
  card: "#ffffff",
  border: "#e8e4de",
  borderLight: "#f0eee8",

  // 文字
  text: "#2c2c2c",
  textSecondary: "#8a8a8a",
  textTertiary: "#b0b0b0",
  textInverse: "#ffffff",

  // 标签色
  tagBg: "#f0eee8",
  tagText: "#8a8a8a",

  // 进度条背景
  barBg: "#edebe6",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const typography = {
  h1: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 15, fontWeight: "400" },
  bodyBold: { fontSize: 15, fontWeight: "600" },
  caption: { fontSize: 13, fontWeight: "400" },
  small: { fontSize: 12, fontWeight: "500" },
  tiny: { fontSize: 11, fontWeight: "400" },
};

// 科目标签颜色循环
export const subjectColors = [
  "#5b8c5e", "#d4a853", "#8faf8f", "#c4956a",
  "#7a9e7e", "#b8a070", "#4a7b4e", "#a08050",
];
