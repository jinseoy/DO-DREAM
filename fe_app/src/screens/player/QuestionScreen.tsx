import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
  ScrollView,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  QuestionScreenNavigationProp,
  QuestionScreenRouteProp,
} from "../../navigation/navigationTypes";
import * as Haptics from "expo-haptics";
import { asrService } from "../../services/asrService";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import BackButton from "../../components/BackButton";
import { createCommonStyles } from "../../styles/commonStyles";
import { ragApi } from "../../api/ragApi";
import type { RagChatRequest } from "../../types/api/ragApiTypes";
import {
  getQuestionHistory,
  createQuestionHistory,
  addMessageToQuestionHistory,
  QuestionMessage,
} from "../../services/questionStorage";
import { useTheme } from "../../contexts/ThemeContext";
import { HEADER_BTN_HEIGHT, HEADER_MIN_HEIGHT } from "../../constants/dimensions";
import { COLORS } from "../../constants/colors";

type MsgType = "user" | "bot";
interface Message {
  id: string;
  type: MsgType;
  text: string;
  timestamp: Date;
}

export default function QuestionScreen() {
  const navigation = useNavigation<QuestionScreenNavigationProp>();
  const route = useRoute<QuestionScreenRouteProp>();
  const {
    material,
    chapterId,
    sectionIndex,
    questionId,
    sessionId: initialSessionId,
  } = route.params;

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  const { colors, fontSize: themeFont, isHighContrast } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, themeFont, isHighContrast), [colors, themeFont, isHighContrast]);
  const commonStyles = React.useMemo(() => createCommonStyles(colors), [colors]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  const [sessionId, setSessionId] = useState<string | null>(
    initialSessionId || null
  );
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(
    questionId || null
  );

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  const offRef = useRef<null | (() => void)>(null);
  const lastCommittedRef = useRef<string>("");
  const lastFinalAtRef = useRef<number>(0);

  const SILENCE_TIMEOUT_MS = 1400;
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeardAtRef = useRef<number>(0);

  const ignoreUntilRef = useRef<number>(0);
  const screenReaderOnRef = useRef<boolean>(false);

  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const wave4 = useRef(new Animated.Value(0)).current;
  const wave5 = useRef(new Animated.Value(0)).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const micBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // =========================
  // 화면 진입 안내 + 포커스
  // =========================
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then(
      (on) => (screenReaderOnRef.current = !!on)
    );
    const sub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (on) => {
        screenReaderOnRef.current = !!on;
      }
    );

    setTimeout(() => {
      if (!mounted) return;

      const announcement = currentQuestionId
        ? "질문하기 화면입니다. 이전 대화를 이어서 계속할 수 있습니다. 화면 상단 오른쪽의 말하기 버튼을 누르거나, 아래 입력창에 질문을 작성하세요."
        : "질문하기 화면입니다. 화면 상단 오른쪽의 말하기 버튼을 누르거나, 아래 입력창에 질문을 작성하세요.";

      AccessibilityInfo.announceForAccessibility(announcement);
      const tag = micBtnRef.current ? findNodeHandle(micBtnRef.current) : null;
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    }, 400);

    return () => {
      mounted = false;
      // @ts-ignore
      sub?.remove?.();
    };
  }, [currentQuestionId]);

  // =========================
  // 기존 히스토리 복원
  // =========================
  useEffect(() => {
    if (questionId) {
      const history = getQuestionHistory(questionId);
      if (history) {
        const restoredMessages: Message[] = history.messages.map(
          (msg, index) => ({
            id: `${history.id}_${index}`,
            type: msg.type,
            text: msg.text,
            timestamp: new Date(msg.timestamp),
          })
        );

        setMessages(restoredMessages);
        setSessionId(history.sessionId);
        setCurrentQuestionId(history.id);

        const lastUserMessage = [...history.messages]
          .reverse()
          .find((m) => m.type === "user");
        if (lastUserMessage) {
          lastCommittedRef.current = lastUserMessage.text;
        }
      }
    }
  }, [questionId]);

  // =========================
  // 웨이브 애니메이션
  // =========================
  useEffect(() => {
    const make = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 380,
            useNativeDriver: true,
          }),
        ])
      );

    let ctrl: Animated.CompositeAnimation | null = null;
    if (listening) {
      ctrl = Animated.parallel([
        make(wave1, 0),
        make(wave2, 90),
        make(wave3, 180),
        make(wave4, 270),
        make(wave5, 360),
      ]);
      ctrl.start();
    } else {
      wave1.setValue(0);
      wave2.setValue(0);
      wave3.setValue(0);
      wave4.setValue(0);
      wave5.setValue(0);
    }
    return () => {
      if (ctrl) ctrl.stop();
    };
  }, [listening, wave1, wave2, wave3, wave4, wave5]);

  // =========================
  // 유틸
  // =========================
  const pushUserMessage = (text: string) => {
    const t = text.trim();
    if (!t) return;
    if (t === lastCommittedRef.current) return;

    const msg: Message = {
      id: `${Date.now()}_${Math.random()}`,
      type: "user",
      text: t,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    lastCommittedRef.current = t;
    lastFinalAtRef.current = Date.now();

    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      50
    );
  };

  const addBotMessage = (text: string) => {
    const msg: Message = {
      id: `${Date.now()}_${Math.random()}`,
      type: "bot",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      50
    );
    AccessibilityInfo.announceForAccessibility(text);
  };

  const formatTime = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${y}. ${m}. ${day}. ${hh}:${mm}:${ss}`;
  };

  const armSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (!listening) return;
      const elapsed = Date.now() - lastHeardAtRef.current;
      if (elapsed >= SILENCE_TIMEOUT_MS) {
        if (interim.trim()) {
          pushUserMessage(interim);
          setInterim("");
        }
        stopListening(false).then(() => {
          AccessibilityInfo.announceForAccessibility("말하기를 종료했습니다.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });
      }
    }, SILENCE_TIMEOUT_MS + 80);
  };

  // =========================
  // ASR
  // =========================
  const subscribeASR = () => {
    if (offRef.current) offRef.current();
    offRef.current = asrService.on((raw, isFinal) => {
      const now = Date.now();
      if (now < ignoreUntilRef.current) return;

      const text = (raw || "").trim();
      if (!text) return;

      lastHeardAtRef.current = now;

      if (isFinal) {
        if (text === lastCommittedRef.current) return;
        pushUserMessage(text);
        setInterim("");
      } else {
        setInterim(text);
      }
      armSilenceTimer();
    });
  };

  const startListening = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    subscribeASR();

    const IGNORE_MS = screenReaderOnRef.current ? 2200 : 300;
    ignoreUntilRef.current = Date.now() + IGNORE_MS;

    await asrService.start({
      lang: "ko-KR",
      interimResults: true,
      continuous: true,
      autoRestart: true,
    });
    lastHeardAtRef.current = Date.now();
    armSilenceTimer();
    setListening(true);
    AccessibilityInfo.announceForAccessibility(
      "음성 인식을 시작합니다. 질문을 말씀하세요."
    );
  };

  const stopListening = async (announce = true) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    await Haptics.selectionAsync();
    await asrService.stop();
    setListening(false);
    if (offRef.current) {
      offRef.current();
      offRef.current = null;
    }
    if (announce)
      AccessibilityInfo.announceForAccessibility("음성 인식을 종료했습니다.");
  };

  // =========================
  // 질문 히스토리 저장
  // =========================
  const saveOrUpdateQuestionHistory = useCallback(
    (question: string, answer: string, newSessionId: string) => {
      try {
        if (currentQuestionId) {
          const userMessage: QuestionMessage = {
            type: "user",
            text: question,
            timestamp: new Date().toISOString(),
          };
          const botMessage: QuestionMessage = {
            type: "bot",
            text: answer,
            timestamp: new Date().toISOString(),
          };

          addMessageToQuestionHistory(currentQuestionId, userMessage);
          addMessageToQuestionHistory(currentQuestionId, botMessage);
        } else {
          const newHistory = createQuestionHistory({
            materialId: material.id.toString(),
            chapterId,
            sessionId: newSessionId,
            question,
            answer,
          });
          setCurrentQuestionId(newHistory.id);
        }
      } catch (error) {
        console.error("[QuestionScreen] 질문 히스토리 저장 실패:", error);
      }
    },
    [currentQuestionId, material.id, chapterId]
  );

  // =========================
  // RAG API
  // =========================
  const sendQuestionToRAG = useCallback(
    async (question: string) => {
      try {
        setIsLoadingResponse(true);

        const payload: RagChatRequest = {
          document_id: material.id.toString(),
          question: question,
          session_id: sessionId,
        };

        const response = await ragApi.chat(payload);

        setSessionId(response.session_id);
        addBotMessage(response.answer);
        saveOrUpdateQuestionHistory(
          question,
          response.answer,
          response.session_id
        );
      } catch (error: any) {
        console.error("[QuestionScreen] RAG API 호출 실패:", error);

        let errorMessage =
          "질문을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.";

        if (error?.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error?.message === "Network Error") {
          errorMessage =
            "네트워크 연결을 확인해주세요. 서버와 통신할 수 없습니다.";
        } else if (error?.code === "ECONNABORTED") {
          errorMessage =
            "서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
        } else if (error?.message) {
          errorMessage = error.message;
        }

        addBotMessage(errorMessage);
        AccessibilityInfo.announceForAccessibility(
          "오류가 발생했습니다. " + errorMessage
        );
      } finally {
        setIsLoadingResponse(false);
      }
    },
    [material.id, sessionId, saveOrUpdateQuestionHistory]
  );

  // =========================
  // 입력 전송 / 뒤로가기
  // =========================
  const handleSend = useCallback(async () => {
    const t = inputText.trim();
    if (!t) {
      AccessibilityInfo.announceForAccessibility("메시지를 입력해주세요.");
      return;
    }

    if (isLoadingResponse) {
      AccessibilityInfo.announceForAccessibility(
        "이전 질문을 처리 중입니다. 잠시만 기다려주세요."
      );
      return;
    }

    pushUserMessage(t);
    setInputText("");
    await sendQuestionToRAG(t);
  }, [inputText, isLoadingResponse, sendQuestionToRAG]);

  const handleBack = useCallback(async () => {
    if (listening) await stopListening(false);
    navigation.goBack();
  }, [listening, navigation, stopListening]);

  // =========================
  // VoiceCommand(rawText)
  // =========================
  const handleQuestionVoiceCommand = useCallback(
    (spoken: string): boolean => {
      const raw = spoken.trim();      if (!raw) return false;
      const t = raw.toLowerCase();

      console.log("[QuestionScreen] rawText 핸들러 호출:", raw);

      if (
        t === "보내" ||
        t === "확인" ||
        t === "보내기" ||
        t.includes("질문 보내")
      ) {
        handleSend();
        return true;
      }

      if (
        t.includes("지워") ||
        t.includes("초기화") ||
        t.includes("다시 시작") ||
        t.includes("대화 삭제") ||
        t === "지우기"
      ) {
        setMessages([]);
        setInterim("");
        setSessionId(null);
        setCurrentQuestionId(null);
        lastCommittedRef.current = "";
        AccessibilityInfo.announceForAccessibility(
          "대화 내용을 모두 지웠습니다."
        );
        return true;
      }

      if (
        t.includes("입력창") ||
        t.includes("키보드") ||
        t.includes("텍스트")
      ) {
        inputRef.current?.focus();
        AccessibilityInfo.announceForAccessibility(
          "질문 입력창에 포커스를 맞췄습니다."
        );
        return true;
      }

      if (isLoadingResponse) {
        AccessibilityInfo.announceForAccessibility(
          "질문을 처리 중입니다. 잠시만 기다려주세요."
        );
        return true;
      }

      console.log("[QuestionScreen] 질문으로 처리:", raw);
      pushUserMessage(raw);
      sendQuestionToRAG(raw);
      return true;
    },
    [handleSend, isLoadingResponse, sendQuestionToRAG]
  );

  const handleQuestionVoiceCommandRef = useRef(handleQuestionVoiceCommand);
  useEffect(() => {
    handleQuestionVoiceCommandRef.current = handleQuestionVoiceCommand;
  }, [handleQuestionVoiceCommand]);

  const handleBackRef = useRef(handleBack);
  useEffect(() => {
    handleBackRef.current = handleBack;
  }, [handleBack]);

  // =========================
  // TriggerContext 등록
  // =========================
  useEffect(() => {
    setCurrentScreenId("Question");

    registerVoiceHandlers("Question", {
      goBack: () => handleBackRef.current(),
      openLibrary: () => handleBackRef.current(),
      rawText: (text: string) => handleQuestionVoiceCommandRef.current(text),
    });

    return () => {
      registerVoiceHandlers("Question", {});
    };
  }, [setCurrentScreenId, registerVoiceHandlers]);

  // 언마운트 정리
  useEffect(() => {
    return () => {
      asrService.abort();
      if (offRef.current) offRef.current();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // draft 말풍선
  const DraftBubble = () =>
    !interim ? null : (
      <View style={[styles.messageRow, styles.userRow]}>
        <View
          style={[styles.bubble, styles.userBubble, styles.draftBubble]}
          accessibilityRole="text"
        >
          <Text style={[styles.msgText, styles.userText]}>{interim}</Text>
          <Text
            style={[styles.timeText, styles.userTime]}
            accessible={false}
            importantForAccessibility="no"
          >
            실시간 인식 중…
          </Text>
        </View>
      </View>
    );

  // 로딩 말풍선
  const LoadingBubble = () =>
    !isLoadingResponse ? null : (
      <View style={[styles.messageRow, styles.botRow]}>
        <View
          style={[styles.bubble, styles.botBubble]}
          accessibilityRole="text"
          accessibilityLabel="답변을 생성하고 있습니다"
        >
          <Text style={[styles.msgText, styles.botText]}>
            두드림 AI가 답변을 생성하고 있습니다...
          </Text>
          <Text
            style={[styles.timeText, styles.botTime]}
            accessible={false}
            importantForAccessibility="no"
          >
            잠시만 기다려주세요
          </Text>
        </View>
      </View>
    );

  const WaveDot = ({ v, i }: { v: Animated.Value; i: number }) => {
    const scale = v.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.5],
    });
    const opacity = v.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    });
    return (
      <Animated.View
        key={i}
        style={[styles.waveDot, { transform: [{ scale }], opacity }]}
      />
    );
  };

  // =========================
  // 렌더링
  // =========================
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* 헤더 */}
        <View style={[commonStyles.headerContainer, styles.header]}>
          <BackButton
            onPress={handleBack}
            style={commonStyles.headerBackButton}
          />

          {/* <Text
            style={styles.title}
            accessibilityRole="header"
            accessibilityLabel="두드림 AI 질문 화면"
          >
            두드림 AI
          </Text> */}

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setMessages([]);
                setInterim("");
                setSessionId(null);
                setCurrentQuestionId(null);
                lastCommittedRef.current = "";
                AccessibilityInfo.announceForAccessibility(
                  "대화 내용을 모두 지웠습니다."
                );
              }}
              accessibilityRole="button"
              accessibilityLabel="대화 지우기"
              accessibilityHint="현재 대화 내용을 모두 삭제합니다"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearTxt}>지우기</Text>
            </TouchableOpacity>

            <VoiceCommandButton
              style={commonStyles.headerVoiceButton}
              accessibilityHint="두 번 탭한 후 질문하거나, 대화 지우기, 입력창 포커스와 같은 음성 명령을 말씀하세요."
            />
          </View>
        </View>

        {/* 대화 영역 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          accessible={false}
        >
          <View
            style={[
              styles.messagesContainer,
              messages.length === 0
                ? styles.messagesEmpty
                : styles.messagesFilled,
            ]}
          >
            {messages.length === 0 ? (
              <View style={styles.welcomeBubble} accessibilityRole="text">
                <Text style={styles.welcomeTxt}>
                  두드림 AI에게 물어보세요. 오른쪽 위 말하기 버튼으로 질문을
                  말하거나, 아래 입력창에 질문을 적고 확인을 눌러 주세요.
                </Text>
                <Text
                  style={styles.botTime}
                  accessible={false}
                  importantForAccessibility="no"
                >
                  {formatTime(new Date())}
                </Text>
              </View>
            ) : (
              <>
                {messages.map((m) => {
                  const isUser = m.type === "user";
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.messageRow,
                        isUser ? styles.userRow : styles.botRow,
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          isUser ? styles.userBubble : styles.botBubble,
                        ]}
                        accessible
                        accessibilityRole="text"
                        accessibilityLabel={m.text}
                      >
                        <Text
                          style={[
                            styles.msgText,
                            isUser ? styles.userText : styles.botText,
                          ]}
                        >
                          {m.text}
                        </Text>
                        <Text
                          style={[
                            styles.timeText,
                            isUser ? styles.userTime : styles.botTime,
                          ]}
                          accessible={false}
                          importantForAccessibility="no"
                        >
                          {formatTime(m.timestamp)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                <DraftBubble />
                <LoadingBubble />
              </>
            )}
          </View>
        </ScrollView>

        {/* 인식 중 웨이브 */}
        {listening && (
          <View
            style={styles.waveBar}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="음성 인식 중입니다"
          >
            <View style={styles.waveDots}>
              <WaveDot v={wave1} i={1} />
              <WaveDot v={wave2} i={2} />
              <WaveDot v={wave3} i={3} />
              <WaveDot v={wave4} i={4} />
              <WaveDot v={wave5} i={5} />
            </View>
          </View>
        )}

        {/* 입력 영역 */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="질문 입력"
            placeholderTextColor="#999"
            multiline
            maxLength={1200}
            accessibilityLabel="질문 입력창"
            accessibilityHint="질문을 입력하고 확인 버튼을 누르세요"
          />

          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            accessibilityRole="button"
            accessibilityLabel="확인"
            accessibilityHint="입력한 질문을 전송합니다"
          >
            <Text style={[styles.sendTxt, !inputText.trim() && styles.sendTxtDisabled]}>확인</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, fontSize: (size: number) => number, isHighContrast: boolean) => {
  const isPrimaryColors = 'primary' in colors;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    inner: {
      flex: 1,
    },

    header: {
      borderBottomWidth: 3,
      borderBottomColor: isHighContrast ? COLORS.secondary.main : (isPrimaryColors ? colors.primary.main : colors.border.default),
      backgroundColor: colors.background.default,
      minHeight: HEADER_MIN_HEIGHT,
    },
    title: {
      fontSize: fontSize(22),
      fontWeight: "600",
      color: colors.text.secondary,
      flex: 1,
      textAlign: "center",
      lineHeight: HEADER_BTN_HEIGHT,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      height: HEADER_BTN_HEIGHT,
    },
    clearButton: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      height: HEADER_BTN_HEIGHT,
      minWidth: 60,
      justifyContent: "center",
      alignItems: "center",
      borderColor: colors.status.error,
      backgroundColor: isPrimaryColors ? colors.status.errorLight : colors.background.elevated,
      borderWidth: 3,
      borderRadius: 12,
    },
    clearTxt: {
      fontSize: fontSize(18),
      color: colors.status.error,
      fontWeight: "700",
    },

    chatArea: {
      flex: 1,
      backgroundColor: isPrimaryColors ? colors.primary.lightest : colors.background.elevated,
    },
    chatContent: {
      flexGrow: 1,
    },
    messagesContainer: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    messagesEmpty: {
      justifyContent: "flex-start",
    },
    messagesFilled: {
      justifyContent: "flex-end",
    },

    messageRow: { marginBottom: 12, flexDirection: "row" },
    userRow: { justifyContent: "flex-end" },
    botRow: { justifyContent: "flex-start" },

    bubble: {
      maxWidth: "85%",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    userBubble: {
      backgroundColor: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      alignSelf: "flex-end",
    },
    botBubble: {
      backgroundColor: isPrimaryColors ? colors.secondary.main : colors.accent.secondary,
      alignSelf: "flex-start",
    },

    draftBubble: {
      opacity: 0.85,
      borderWidth: 2,
      borderColor: isPrimaryColors ? colors.primary.light : colors.border.focus,
    },

    msgText: { fontSize: fontSize(20), lineHeight: 30, marginBottom: 6 },
    userText: { color: isPrimaryColors ? colors.text.inverse : colors.text.primary },
    botText: { color: colors.text.primary },

    timeText: { fontSize: fontSize(13), marginTop: 4 },
    userTime: { color: isPrimaryColors ? colors.primary.lighter : colors.text.secondary },
    botTime: { color: colors.text.tertiary || colors.text.secondary },

    welcomeBubble: {
      backgroundColor: isPrimaryColors ? colors.secondary.main : colors.accent.secondary,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      alignSelf: "flex-start",
      maxWidth: "95%",
    },
    welcomeTxt: {
      fontSize: fontSize(20),
      lineHeight: 30,
      color: colors.text.primary,
      marginBottom: 8,
    },

    waveBar: {
      backgroundColor: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      paddingVertical: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    waveDots: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    waveDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: isPrimaryColors ? colors.secondary.main : colors.accent.secondary,
    },

    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.default,
      borderTopWidth: 2,
      borderTopColor: isPrimaryColors ? colors.border.main : colors.border.default,
      gap: 10,
    },
    input: {
      flex: 1,
      minHeight: HEADER_BTN_HEIGHT,
      maxHeight: 220,
      backgroundColor: isPrimaryColors ? colors.background.elevated : colors.background.elevated,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      fontSize: fontSize(18),
      color: colors.text.secondary,
      borderWidth: 2,
      borderColor: isPrimaryColors ? colors.border.light : colors.border.default,
    },

    sendBtn: {
      height: HEADER_BTN_HEIGHT,
      backgroundColor: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      minWidth: 88,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: isPrimaryColors ? colors.primary.dark : colors.border.focus,
    },
    sendDisabled: {
      backgroundColor: isPrimaryColors ? colors.border.main : colors.border.default,
      borderColor: isPrimaryColors ? colors.border.main : colors.border.default,
    },
    sendTxt: {
      color: "#FFFFFF",
      fontSize: fontSize(16),
      fontWeight: "700",
    },
    sendTxtDisabled: {
      color: "#000000",
    },
  });
};
