import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";

interface ChapterCompletionModalProps {
  visible: boolean;
  onQuiz: () => void;
  onSkip: () => void;
}

export default function ChapterCompletionModal({
  visible,
  onQuiz,
  onSkip,
}: ChapterCompletionModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onSkip}
    >
      <View style={styles.completionOverlay}>
        <View style={styles.completionCard}>
          <Text style={styles.completionTitle}>챕터 학습 완료!</Text>
          <Text style={styles.completionMessage}>
            퀴즈로 학습 내용을 확인해보세요.
          </Text>
          <TouchableOpacity
            style={styles.quizButton}
            onPress={onQuiz}
            accessible
            accessibilityLabel="퀴즈 풀기"
            accessibilityRole="button"
          >
            <Text style={styles.quizButtonText}>퀴즈 풀기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            accessible
            accessibilityLabel="교재 목록으로 이동"
            accessibilityRole="button"
          >
            <Text style={styles.skipButtonText}>교재 목록으로 이동</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  completionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  completionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 16,
    textAlign: "center",
  },
  completionMessage: {
    fontSize: 20,
    color: "#333",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 28,
  },
  quizButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 40,
    minHeight: 72,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#388E3C",
  },
  quizButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  skipButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 64,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  skipButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
  },
});