import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { QuestionScreenNavigationProp } from '../navigation/navigationTypes';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export default function QuestionScreen() {
  const navigation = useNavigation<QuestionScreenNavigationProp>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // 웨이브 애니메이션 (5개의 점)
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const wave4 = useRef(new Animated.Value(0)).current;
  const wave5 = useRef(new Animated.Value(0)).current;

  // 음성 인식 중 웨이브 애니메이션
  useEffect(() => {
    if (isListening) {
      const createWaveAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );
      };

      Animated.parallel([
        createWaveAnimation(wave1, 0),
        createWaveAnimation(wave2, 100),
        createWaveAnimation(wave3, 200),
        createWaveAnimation(wave4, 300),
        createWaveAnimation(wave5, 400),
      ]).start();
    } else {
      wave1.setValue(0);
      wave2.setValue(0);
      wave3.setValue(0);
      wave4.setValue(0);
      wave5.setValue(0);
    }
  }, [isListening]);

  // 화면 진입 시 안내
  useEffect(() => {
    const announcement = '두드림 AI에게 물어보세요 화면입니다. 화면 하단 우측에 있는 음성 인식 버튼을 탭해서 음성으로 말하시거나 또는 하단의 입력창에 궁금하신 점을 입력해주세요. 그리고 확인 버튼을 탭하세요.';
    AccessibilityInfo.announceForAccessibility(announcement);
  }, []);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleStartListening = () => {
    setIsListening(true);
    AccessibilityInfo.announceForAccessibility('음성 인식을 시작합니다. 질문해 주세요.');
    
    // TODO: 실제 음성 인식 구현 시 연동
    // 현재는 3초 후 자동으로 종료하는 시뮬레이션
    setTimeout(() => {
      handleStopListening();
      // 테스트용 더미 메시지 - 두드림 서비스 시나리오
      addMessage('user', '판게아가 뭐야?');
      setTimeout(() => {
        addMessage('bot', '판게아는 약 3억 년 전 고생대 말부터 중생대 초에 존재했던 초대륙입니다.\n\n핵심 포인트:\n1. 모든 대륙이 하나로 합쳐진 거대한 땅덩어리였습니다.\n2. 이후 분리되어 현재의 대륙들이 형성되었습니다.\n\n예시: 남아메리카와 아프리카의 해안선 모양이 비슷한 것이 판게아가 존재했다는 증거입니다.');
      }, 1000);
    }, 3000);
  };

  const handleStopListening = () => {
    setIsListening(false);
    AccessibilityInfo.announceForAccessibility('음성 인식을 종료합니다.');
  };

  const handleSendMessage = () => {
    if (inputText.trim().length === 0) {
      AccessibilityInfo.announceForAccessibility('메시지를 입력해주세요.');
      return;
    }

    addMessage('user', inputText.trim());
    setInputText('');
    
    // TODO: 실제 AI API 연동
    // 테스트용 더미 응답 - 두드림 서비스 시나리오
    setTimeout(() => {
      addMessage('bot', '두드림 AI가 답변을 작성 중입니다. 교재 내용을 기반으로 정확한 답변을 준비하겠습니다.');
    }, 500);
  };

  const addMessage = (type: 'user' | 'bot', text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      text,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // 새 메시지 추가 시 스크롤을 아래로
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // 접근성 안내
    if (type === 'bot') {
      AccessibilityInfo.announceForAccessibility(text);
    }
  };

  const formatTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}. ${month}. ${day}. ${hours}:${minutes}:${seconds}`;
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const timeString = formatTime(message.timestamp);
    
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.botMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.botBubble,
          ]}
          accessible={true}
          accessibilityLabel={message.text}
          accessibilityRole="text"
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.botMessageText,
            ]}
          >
            {message.text}
          </Text>
          <Text
            style={[
              styles.timestampText,
              isUser ? styles.userTimestampText : styles.botTimestampText,
            ]}
            accessible={false}
            importantForAccessibility="no"
          >
            {timeString}
          </Text>
        </View>
      </View>
    );
  };

  const renderWaveDot = (animValue: Animated.Value, index: number) => {
    const scale = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.5],
    });

    const opacity = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.waveDot,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            accessible={true}
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <Text 
            style={styles.titleText}
            accessible={true}
            accessibilityRole="header"
          >
            두드림 AI
          </Text>

          <View style={styles.headerSpacer} />
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
            <View style={styles.emptyStateContainer}>
              <View style={styles.welcomeBubble}>
                <Text 
                  style={styles.welcomeText}
                  accessible={true}
                  accessibilityRole="text"
                >
                  두드림 AI에게 물어보세요. 화면 하단 우측에 있는 음성 인식 버튼을 탭해서 음성으로 말하시거나 또는 하단의 입력창에 궁금하신 점을 입력해주세요. 그리고 확인 버튼을 탭하세요.
                </Text>
                <Text 
                  style={styles.botTimestampText}
                  accessible={false}
                  importantForAccessibility="no"
                >
                  {formatTime(new Date())}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.messagesContainer}>
              {messages.map(renderMessage)}
            </View>
          )}
        </ScrollView>

        {/* 음성 인식 중 웨이브 애니메이션 */}
        {isListening && (
          <View style={styles.waveContainer}>
            <View style={styles.waveDotsContainer}>
              {renderWaveDot(wave1, 1)}
              {renderWaveDot(wave2, 2)}
              {renderWaveDot(wave3, 3)}
              {renderWaveDot(wave4, 4)}
              {renderWaveDot(wave5, 5)}
            </View>
          </View>
        )}

        {/* 하단 입력 영역 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="내용을 입력해주세요"
            placeholderTextColor="#999999"
            multiline
            maxLength={500}
            accessible={true}
            accessibilityLabel="질문 입력창"
            accessibilityHint="질문을 입력하고 확인 버튼을 눌러주세요"
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
            accessible={true}
            accessibilityLabel="확인"
            accessibilityRole="button"
            accessibilityHint="입력한 질문을 전송합니다"
          >
            <Text style={styles.sendButtonText}>확인</Text>
          </TouchableOpacity>

          {/* 플로팅 음성 버튼 */}
          <TouchableOpacity
            style={[
              styles.floatingVoiceButton,
              isListening && styles.floatingVoiceButtonActive,
            ]}
            onPress={isListening ? handleStopListening : handleStartListening}
            accessible={true}
            accessibilityLabel={isListening ? '음성 인식 중지' : '음성 인식 시작'}
            accessibilityRole="button"
            accessibilityHint="음성으로 질문합니다"
          >
            <Text style={styles.voiceButtonIcon}>🎤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EAF6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#BDBDBD',
  },
  backButton: {
    padding: 8,
    minWidth: 48,
  },
  backButtonText: {
    fontSize: 28,
    color: '#424242',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#424242',
  },
  headerSpacer: {
    minWidth: 48,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#E8EAF6',
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  emptyStateContainer: {
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  welcomeBubble: {
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  welcomeText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#424242',
    marginBottom: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#3F51B5',
    alignSelf: 'flex-end',
  },
  botBubble: {
    backgroundColor: '#FFF9C4',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 6,
  },
  userMessageText: {
    color: '#ffffff',
  },
  botMessageText: {
    color: '#424242',
  },
  timestampText: {
    fontSize: 13,
    marginTop: 4,
  },
  userTimestampText: {
    color: '#E8EAF6',
  },
  botTimestampText: {
    color: '#757575',
  },
  waveContainer: {
    backgroundColor: '#3F51B5',
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  waveDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF9C4',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#BDBDBD',
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 18,
    color: '#424242',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    backgroundColor: '#3F51B5',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  floatingVoiceButton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3F51B5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  floatingVoiceButtonActive: {
    backgroundColor: '#F44336',
  },
  voiceButtonIcon: {
    fontSize: 32,
  },
});