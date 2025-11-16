import { StyleSheet } from "react-native";

export const commonStyles = StyleSheet.create({
  // 화면 상단 헤더 컨테이너
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerBackButton: {
    padding: 0,
    minWidth: 70,
  },
  headerVoiceButton: {
    padding: 0,
  },
});