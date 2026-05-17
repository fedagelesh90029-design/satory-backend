import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { apiFetch } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import { SatoryLogoIcon } from '../components/SatoryLogo';

interface Message {
  id: string;
  text: string;
  from: 'bot' | 'user';
  time: string;
}

const QUICK = [
  'Какой чай выбрать новичку?',
  'Расскажи о чайных церемониях',
  'Как заварить шу пуэр?',
  'Ближайшие мероприятия',
];

const now = () => new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const listRef = useRef<FlatList>(null);
  const sessionId = useRef(`session_${Date.now()}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: 'Здравствуйте! Я чайный советник «Satori» 🍵\n\nПомогу выбрать чай, расскажу о мероприятиях или отвечу на любые вопросы о чае и программе лояльности.',
      from: 'bot',
      time: now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), text, from: 'user', time: now() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const data = await apiFetch('/chat/message', {
        method: 'POST',
        body: JSON.stringify({ message: text, session_id: sessionId.current }),
      }, token);
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: data.reply, from: 'bot', time: now() };
      setMessages(m => [...m, botMsg]);
    } catch {
      setMessages(m => [...m, { id: Date.now().toString(), text: 'Ошибка соединения', from: 'bot', time: now() }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1, backgroundColor: Colors.bg }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.botAvatar}>
              <SatoryLogoIcon size={28} />
            </View>
            <View>
              <Text style={styles.botName}>Чайный советник ✨</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Всегда на связи</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={24} color={Colors.gray} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View style={[styles.msgRow, item.from === 'user' && styles.msgRowUser]}>
              {item.from === 'bot' && (
                <View style={styles.botAvatarSmall}>
                  <SatoryLogoIcon size={20} />
                </View>
              )}
              <View style={[styles.bubble, item.from === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={[styles.bubbleText, item.from === 'user' && styles.bubbleTextUser]}>{item.text}</Text>
                {item.from === 'bot' && <Text style={styles.timeText}>{item.time}</Text>}
              </View>
            </View>
          )}
        />

        {/* Quick replies */}
        {messages.length <= 1 && (
          <View style={styles.quickRow}>
            {QUICK.map((q, i) => (
              <TouchableOpacity key={i} style={styles.quickChip} onPress={() => send(q)}>
                <Text style={styles.quickText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder="Спросите о чае..."
            placeholderTextColor={Colors.gray}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={() => send(input)} disabled={!input.trim()}>
            <Ionicons name="send" size={18} color={input.trim() ? Colors.bg : Colors.gray} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
  },
  botName: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.green },
  onlineText: { color: Colors.green, fontSize: 12 },
  messageList: { padding: 16, gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  botAvatarSmall: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
  },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 14 },
  bubbleBot: { backgroundColor: Colors.card, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  bubbleText: { color: Colors.white, fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: Colors.bg },
  timeText: { color: Colors.gray, fontSize: 11, marginTop: 6, alignSelf: 'flex-end' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  quickChip: {
    borderWidth: 1, borderColor: Colors.gold,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  quickText: { color: Colors.gold, fontSize: 13 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10,
    color: Colors.white, fontSize: 15,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.card },
});
