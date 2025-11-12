import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
  Alert,
  ScrollView,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { QuestionScreenNavigationProp } from "../../navigation/navigationTypes";
import * as Haptics from "expo-haptics";
import { asrService } from "../../services/asrService";

type MsgType = "user" | "bot";
interface Message {
  id: string;
  type: MsgType;
  text: string;
  timestamp: Date;
}

type RouteParams = { autoStartASR?: boolean };

export default function QuestionScreen() {
  const navigation = useNavigation<QuestionScreenNavigationProp>();
  const route = useRoute<any>();
  const { autoStartASR } = (route?.params as RouteParams) || {};

  // 채팅 데이터
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  // ASR 상태
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState(""); // 실시간(중간) 텍스트
  const offRef = useRef<null | (() => void)>(null);

  // 🔧 중복 확정 방지용
  const lastCommittedRef = useRef<string>("");      // 마지막으로 말풍선에 올린 텍스트
  const lastFinalAtRef = useRef<number>(0);         // 마지막 확정 시간 (ms)

  // 발화 종료(침묵) 감지
  const SILENCE_TIMEOUT_MS = 1400;
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeardAtRef = useRef<number>(0);

  // 🔧 TalkBack 안내음 무시 타임윈도
  const ignoreUntilRef = useRef<number>(0);         // 이 시간 이전 이벤트는 무시
  const screenReaderOnRef = useRef<boolean>(false);

  // 웨이브(인식 중 시각 피드백)
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const wave4 = useRef(new Animated.Value(0)).current;
  const wave5 = useRef(new Animated.Value(0)).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const micBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // 화면 진입 안내 + 포커스
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => (screenReaderOnRef.current = !!on));
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", (on) => {
      screenReaderOnRef.current = !!on;
    });

    setTimeout(() => {
      if (!mounted) return;
      AccessibilityInfo.announceForAccessibility(
        "질문하기 화면입니다. 아래의 말하기 버튼을 누르거나, 입력창에 질문을 작성하세요."
      );
      const tag = micBtnRef.current ? findNodeHandle(micBtnRef.current) : null;
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    }, 400);

    return () => {
      // @ts-ignore
      sub?.remove?.();
      mounted = false;
    };
  }, []);

  // QuestionScreen 진입 시 자동 인식 시작
  useEffect(() => {
    if (!autoStartASR) return;
    const delay = screenReaderOnRef.current ? 1200 : 600; // TalkBack 켜져있으면 더 늦게 시작
    const t = setTimeout(() => {
      startListening().catch(() => inputRef.current?.focus());
    }, delay);
    return () => clearTimeout(t);
  }, [autoStartASR]);

  // 웨이브 애니메이션
  useEffect(() => {
    const make = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 380, useNativeDriver: true }),
        ])
      );

    let ctrl: Animated.CompositeAnimation | null = null;
    if (listening) {
      ctrl = Animated.parallel([make(wave1, 0), make(wave2, 90), make(wave3, 180), make(wave4, 270), make(wave5, 360)]);
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

  // 메시지 추가(중복 필터 포함)
  const pushUserMessage = (text: string) => {
    const t = text.trim();
    if (!t) return;

    // 🔧 완전 중복 차단
    if (t === lastCommittedRef.current) return;

    const msg: Message = { id: `${Date.now()}_${Math.random()}`, type: "user", text: t, timestamp: new Date() };
    setMessages((prev) => [...prev, msg]);
    lastCommittedRef.current = t;
    lastFinalAtRef.current = Date.now();

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const addBotMessage = (text: string) => {
    const msg: Message = { id: `${Date.now()}_${Math.random()}`, type: "bot", text, timestamp: new Date() };
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
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

  // 침묵 타임아웃 arm/disarm
  const armSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (!listening) return;
      const elapsed = Date.now() - lastHeardAtRef.current;
      if (elapsed >= SILENCE_TIMEOUT_MS) {
        if (interim.trim()) {
          pushUserMessage(interim); // 확정 전에 마지막 중간문장만 채택
          setInterim("");
        }
        stopListening(false).then(() => {
          AccessibilityInfo.announceForAccessibility("말하기를 종료했습니다.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });
      }
    }, SILENCE_TIMEOUT_MS + 80);
  };

  // ASR 구독
  const subscribeASR = () => {
    if (offRef.current) offRef.current();
    offRef.current = asrService.on((raw, isFinal) => {
      const now = Date.now();

      // 🔧 TalkBack 안내 음성 무시: 시작 직후 ignoreUntil 시점 전 이벤트는 버림
      if (now < ignoreUntilRef.current) return;

      const text = (raw || "").trim();
      if (!text) return;

      lastHeardAtRef.current = now;

      if (isFinal) {
        // 최종결과 중복 방지: 직전 확정과 동일/거의 동일하면 무시
        if (text === lastCommittedRef.current) return;
        pushUserMessage(text);
        setInterim("");
      } else {
        // 중간문장 업데이트
        setInterim(text);
      }
      armSilenceTimer();
    });
  };

  // 마이크 시작/정지
  const startListening = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    subscribeASR();

    // TalkBack 켜져 있으면, 시작 직후 N ms 동안 캡처 무시
    // 버튼 라벨/힌트 낭독이 흘러들어오는 것을 방지
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
    AccessibilityInfo.announceForAccessibility("음성 인식을 시작합니다. 질문을 말씀하세요.");
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
    if (announce) AccessibilityInfo.announceForAccessibility("음성 인식을 종료했습니다.");
  };

  // 입력 전송(임시 - 백엔드 없음)
  const handleSend = () => {
    const t = inputText.trim();
    if (!t) {
      AccessibilityInfo.announceForAccessibility("메시지를 입력해주세요.");
      return;
    }
    pushUserMessage(t);
    setInputText("");
    setTimeout(() => addBotMessage("백엔드는 현재 준비 중입니다. 인식된 질문을 저장합니다."), 400);
  };

  // 뒤로가기
  const handleBack = async () => {
    if (listening) await stopListening(false);
    navigation.goBack();
  };

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
        <View style={[styles.bubble, styles.userBubble, styles.draftBubble]} accessibilityRole="text">
          <Text style={[styles.msgText, styles.userText]}>{interim}</Text>
          <Text style={[styles.timeText, styles.userTime]} accessible={false} importantForAccessibility="no">
            실시간 인식 중…
          </Text>
        </View>
      </View>
    );

  const WaveDot = ({ v, i }: { v: Animated.Value; i: number }) => {
    const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
    return <Animated.View key={i} style={[styles.waveDot, { transform: [{ scale }], opacity }]} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            accessibilityHint="이전 화면으로 돌아갑니다"
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title} accessibilityRole="header">
            두드림 AI
          </Text>

          <TouchableOpacity
            onPress={() => {
              setMessages([]);
              setInterim("");
              lastCommittedRef.current = "";
              AccessibilityInfo.announceForAccessibility("대화 내용을 모두 지웠습니다.");
            }}
            accessibilityRole="button"
            accessibilityLabel="대화 지우기"
            accessibilityHint="현재 대화 내용을 모두 삭제합니다"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearTxt}>지우기</Text>
          </TouchableOpacity>
        </View>

        {/* 대화 영역 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          accessible={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.welcomeBubble} accessibilityRole="text">
                <Text style={styles.welcomeTxt}>
                  두드림 AI에게 물어보세요. 아래 버튼으로 음성 인식을 시작하거나, 입력창에 질문을 적고 확인을 눌러 주세요.
                </Text>
                <Text style={styles.botTime} accessible={false} importantForAccessibility="no">
                  {formatTime(new Date())}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.msgsWrap}>
              {messages.map((m) => {
                const isUser = m.type === "user";
                return (
                  <View key={m.id} style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
                    <View
                      style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}
                      accessible
                      accessibilityRole="text"
                      accessibilityLabel={m.text}
                    >
                      <Text style={[styles.msgText, isUser ? styles.userText : styles.botText]}>{m.text}</Text>
                      <Text
                        style={[styles.timeText, isUser ? styles.userTime : styles.botTime]}
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
            </View>
          )}
        </ScrollView>

        {/* 인식 중 웨이브 */}
        {listening && (
          <View style={styles.waveBar}>
            <View style={styles.waveDots}>
              <WaveDot v={wave1} i={1} />
              <WaveDot v={wave2} i={2} />
              <WaveDot v={wave3} i={3} />
              <WaveDot v={wave4} i={4} />
              <WaveDot v={wave5} i={5} />
            </View>
          </View>
        )}

        {/* 입력 영역 + 음성인식 버튼 */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="질문 입력"
            placeholderTextColor="#999"
            aria-label="질문 입력"
            multiline
            maxLength={1200}
            accessibilityLabel="질문 입력창"
            accessibilityHint="질문을 입력하고 확인 버튼을 누르세요"
          />

          <TouchableOpacity
            style={[styles.micAccButton, listening ? styles.micAccOn : styles.micAccOff]}
            onPress={listening ? () => stopListening(true) : startListening}
            accessibilityRole="button"
            accessibilityLabel={listening ? "말하기 종료" : "음성 인식 시작"}
            accessibilityHint={listening ? "음성인식을 종료합니다" : "지금부터 말씀하시면 인식합니다"}
            ref={micBtnRef}
          >
            <Text style={styles.micAccText}>{listening ? "끝내기" : "말하기"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            accessibilityRole="button"
            accessibilityLabel="확인"
            accessibilityHint="입력한 질문을 전송합니다"
          >
            <Text style={styles.sendTxt}>확인</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BTN_HEIGHT = 56; // 🔧 버튼/입력 최소 높이 일치

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8EAF6" },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#BDBDBD",
  },
  backBtn: { padding: 8, minWidth: 48 },
  backTxt: { fontSize: 28, color: "#424242" },
  title: { fontSize: 22, fontWeight: "600", color: "#424242" },
  clearTxt: { fontSize: 16, color: "#F44336", fontWeight: "700" },

  // 대화
  chatArea: { flex: 1, backgroundColor: "#E8EAF6" },
  chatContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  emptyWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  msgsWrap: { flex: 1 },

  messageRow: { marginBottom: 12, flexDirection: "row" },
  userRow: { justifyContent: "flex-end" },
  botRow: { justifyContent: "flex-start" },

  bubble: { maxWidth: "85%", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  userBubble: { backgroundColor: "#3F51B5", alignSelf: "flex-end" },
  botBubble: { backgroundColor: "#FFF9C4", alignSelf: "flex-start" },

  draftBubble: { opacity: 0.85, borderWidth: 2, borderColor: "#C5CAE9" },

  msgText: { fontSize: 18, lineHeight: 28, marginBottom: 6 },
  userText: { color: "#ffffff" },
  botText: { color: "#424242" },

  timeText: { fontSize: 13, marginTop: 4 },
  userTime: { color: "#E8EAF6" },
  botTime: { color: "#757575" },

  // 웰컴 버블
  welcomeBubble: {
    backgroundColor: "#FFF9C4",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignSelf: "flex-start",
    maxWidth: "95%",
  },
  welcomeTxt: { fontSize: 18, lineHeight: 28, color: "#424242", marginBottom: 8 },

  // 웨이브
  waveBar: {
    backgroundColor: "#3F51B5",
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  waveDots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  waveDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFF9C4" },

  // 입력 + 버튼 (🔧 사이즈/접근성 개선)
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#BDBDBD",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: BTN_HEIGHT,
    maxHeight: 160, // 🔧 더 길게 입력 가능
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 18,
    color: "#424242",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  // 접근성 최적화된 음성 버튼
  micAccButton: {
    height: BTN_HEIGHT,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 132,
  },
  micAccOff: { backgroundColor: "#E3F2FD", borderColor: "#64B5F6" },
  micAccOn: { backgroundColor: "#FCE4EC", borderColor: "#F06292" },
  micAccText: { fontSize: 16, fontWeight: "700", color: "#333" },

  sendBtn: {
    height: BTN_HEIGHT,
    backgroundColor: "#3F51B5",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 88,
    justifyContent: "center",
    alignItems: "center",
  },
  sendDisabled: { backgroundColor: "#BDBDBD" },
  sendTxt: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});
