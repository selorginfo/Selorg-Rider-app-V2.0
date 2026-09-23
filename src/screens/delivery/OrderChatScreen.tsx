import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppText} from '../../components/common/AppText';
import {PhoneIcon, SendIcon} from '../../components/common/Icons';
import {useRider} from '../../store/RiderContext';
import {activeOrder} from '../../store/selectors';
import {openDialer} from '../../utils/phone';
import {
  appendOrderChat,
  isOrderChatAvailable,
  loadOrderChat,
  sendOrderChat,
  type OrderChatMessage,
} from '../../services/orderChat';
import type {RootStackParamList} from '../../types/navigation';
import {colors, FONT_FAMILY} from '../../theme';
import {MIN_TOUCH} from '../../theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderChat'>;

export function OrderChatScreen({navigation, route}: Props) {
  const {state} = useRider();
  const a = activeOrder(state);
  const orderId = route.params.orderId || a?.id || '';
  const customerName =
    a?.customerName || route.params.customerName || 'Customer';
  const customerPhone = a?.customerPhone;
  const chatAvailable = !!orderId && isOrderChatAvailable(orderId);
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<OrderChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!orderId || !chatAvailable) {
        if (!cancelled) {
          setMessages([]);
        }
        return;
      }
      const list = await loadOrderChat(orderId, customerName);
      if (!cancelled) {
        setMessages(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, customerName, chatAvailable]);

  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd({animated: true}),
      80,
    );
    return () => clearTimeout(t);
  }, [messages.length]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !orderId || sending || !chatAvailable) {
      return;
    }
    setSending(true);
    setSendError('');
    setInput('');
    const result = await sendOrderChat(orderId, text, customerName);
    if (result.error) {
      setSendError(result.error);
      setInput(text);
      setSending(false);
      return;
    }
    setMessages(result.messages);
    if (result.autoReply) {
      setTimeout(async () => {
        const next = await appendOrderChat(orderId, result.autoReply!);
        setMessages(next);
      }, 900);
    }
    setSending(false);
  }, [input, orderId, customerName, sending, chatAvailable]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backBtn}>
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <View style={styles.headerText}>
          <AppText style={styles.headerTitle} numberOfLines={1}>
            {customerName}
          </AppText>
          <AppText style={styles.headerSub} numberOfLines={1}>
            {a?.num ? `${a.num} · Delivery chat` : 'Delivery chat'}
          </AppText>
        </View>
        <Pressable
          onPress={() => {
            void openDialer(customerPhone);
          }}
          style={styles.headerCall}
          hitSlop={8}>
          <PhoneIcon size={18} color={colors.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled">
          {!chatAvailable && (
            <View style={styles.unavailable}>
              <AppText style={styles.unavailableTitle}>
                Chat unavailable
              </AppText>
              <AppText style={styles.unavailableBody}>
                In-app messaging with the customer is not connected yet. Use
                the call button to reach them.
              </AppText>
            </View>
          )}
          {messages.map(m => (
            <View
              key={m.id}
              style={[
                styles.bubbleRow,
                {justifyContent: m.me ? 'flex-end' : 'flex-start'},
              ]}>
              <View
                style={[
                  styles.bubble,
                  m.me ? styles.bubbleMe : styles.bubbleThem,
                ]}>
                <AppText
                  style={[
                    styles.bubbleText,
                    {color: m.me ? colors.white : colors.ink},
                  ]}>
                  {m.text}
                </AppText>
              </View>
            </View>
          ))}
        </ScrollView>

        {!!sendError && (
          <AppText style={styles.sendError}>{sendError}</AppText>
        )}

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              chatAvailable
                ? 'Message the customer…'
                : 'Chat not available — call instead'
            }
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            editable={chatAvailable}
            returnKeyType="send"
            onSubmitEditing={() => {
              void onSend();
            }}
          />
          <Pressable
            onPress={() => {
              void onSend();
            }}
            style={[
              styles.sendBtn,
              (!chatAvailable || !input.trim() || sending) && styles.sendBtnOff,
            ]}
            disabled={!chatAvailable || !input.trim() || sending}>
            <SendIcon size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  flex: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {fontWeight: '700', fontSize: 22, color: colors.textSecondary},
  headerText: {flex: 1, minWidth: 0},
  headerTitle: {fontWeight: '800', fontSize: 16, color: colors.inkStrong},
  headerSub: {fontWeight: '400', fontSize: 11, color: colors.primary},
  headerCall: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thread: {padding: 16, gap: 10, paddingBottom: 20, flexGrow: 1},
  unavailable: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutralTile,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  unavailableTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.ink,
    marginBottom: 6,
  },
  unavailableBody: {
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  bubbleRow: {flexDirection: 'row'},
  bubble: {
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 14,
  },
  bubbleMe: {backgroundColor: colors.primary, borderBottomRightRadius: 4},
  bubbleThem: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutralTile,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {fontWeight: '400', fontSize: 13, lineHeight: 19},
  sendError: {
    fontWeight: '500',
    fontSize: 12,
    color: colors.danger,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.fieldBg,
  },
  sendBtn: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: {opacity: 0.45},
});
