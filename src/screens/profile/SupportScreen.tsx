import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {SavedSummaryCard} from '../../components/common/SavedSummaryCard';
import {AppIcon, type AppIconName} from '../../components/common/AppIcon';
import {SendIcon} from '../../components/common/Icons';
import {Banner} from '../../components/feedback/Banner';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {useAppConfig} from '../../hooks/useAppConfig';
import {supportApi} from '../../services/api';
import type {Faq} from '../../types';
import type {SupportTicketDto} from '../../types/api';
import {colors, radius, shadow, FONT_FAMILY} from '../../theme';
import {useLayout} from '../../theme/layout';
import {
  CHAT_MESSAGE_MAX,
  TICKET_MESSAGE_MAX,
  TICKET_SUBJECT_MAX,
  TICKET_SUBJECT_MIN,
} from '../../utils/validation';

const TICKET_CATEGORIES: Array<{
  id: 'payment' | 'order' | 'account' | 'app' | 'other';
  label: string;
}> = [
  {id: 'order', label: 'Order'},
  {id: 'payment', label: 'Payment'},
  {id: 'account', label: 'Account'},
  {id: 'app', label: 'App'},
  {id: 'other', label: 'Other'},
];

export function SupportScreen() {
  const nav = useAppNavigation();
  const layout = useLayout();
  const {state, actions} = useRider();
  const cfg = useAppConfig();
  const scrollRef = useRef<ScrollView>(null);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqError, setFaqError] = useState('');
  const [chatLoaded, setChatLoaded] = useState(false);
  const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
  const [ticketError, setTicketError] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState<
    'payment' | 'order' | 'account' | 'app' | 'other'
  >('other');
  const [ticketBusy, setTicketBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [ticketPhase, setTicketPhase] = useState<'form' | 'success'>('form');
  const [savedTicket, setSavedTicket] = useState<{
    id: string;
    ticketNumber?: string;
    subject: string;
    category: string;
    message: string;
    status?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const result = await supportApi.getFaqs();
      if (result.ok && result.data) {
        const list = Array.isArray(result.data)
          ? result.data
          : result.data.faqs;
        setFaqs(
          Array.isArray(list) ? list.map(f => ({q: f.q, a: f.a})) : [],
        );
        setFaqError('');
        return;
      }
      setFaqs([]);
      setFaqError(result.error || 'Help articles are unavailable right now.');
    })();
  }, []);

  const loadTickets = useCallback(async () => {
    const result = await supportApi.listTickets();
    if (!result.ok) {
      setTickets([]);
      setTicketError(result.error || 'Could not load tickets');
      return;
    }
    setTickets(Array.isArray(result.data) ? result.data : []);
    setTicketError('');
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const loadChat = useCallback(async () => {
    const result = await supportApi.getChatMessages();
    if (result.ok && result.data?.messages) {
      actions.patch({
        chat: result.data.messages.map(m => ({
          me: m.me,
          text: m.text,
        })),
      });
    }
    setChatLoaded(true);
  }, [actions]);

  useEffect(() => {
    if (state.contactVia === 'chat' && !chatLoaded) {
      void loadChat();
    }
  }, [state.contactVia, chatLoaded, loadChat]);

  const openSupportCall = useCallback(async () => {
    actions.setContactVia('call');
    const digits = cfg.supportPhone.replace(/[^\d+]/g, '');
    try {
      await Linking.openURL(`tel:${digits}`);
    } catch {
      Alert.alert('Call support', `Unable to place a call. Dial ${cfg.supportPhone}`);
    }
  }, [actions, cfg.supportPhone]);

  const openSupportEmail = useCallback(async () => {
    actions.setContactVia('email');
    const subject = encodeURIComponent('Rider App Support');
    const body = encodeURIComponent(
      'Hi Selorg Support,\n\nI need help with:\n\n',
    );
    try {
      await Linking.openURL(
        `mailto:${cfg.supportEmail}?subject=${subject}&body=${body}`,
      );
    } catch {
      Alert.alert(
        'Email support',
        `Unable to open mail. Write to ${cfg.supportEmail}`,
      );
    }
  }, [actions, cfg.supportEmail]);

  const channels: Array<{
    id: 'call' | 'email' | 'chat';
    icon: AppIconName;
    bg: string;
    color: string;
    label: string;
    hint: string;
    hintColor: string;
    onPress: () => void;
  }> = [
    {
      id: 'call',
      icon: 'phone',
      bg: colors.primaryTint,
      color: colors.primary,
      label: 'Call',
      hint: cfg.supportHours || '24×7',
      hintColor: colors.textFaint,
      onPress: () => {
        void openSupportCall();
      },
    },
    {
      id: 'email',
      icon: 'mail',
      bg: colors.infoBg,
      color: colors.info,
      label: 'Email',
      hint: `~${cfg.supportEmailSlaHours} hrs`,
      hintColor: colors.textFaint,
      onPress: () => {
        void openSupportEmail();
      },
    },
    {
      id: 'chat',
      icon: 'chat',
      bg: colors.purpleChipBg,
      color: colors.purpleIcon,
      label: 'Live Chat',
      hint: '● Online',
      hintColor: colors.primary,
      onPress: () => {
        actions.setContactVia('chat');
        setChatLoaded(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 100);
      },
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <View style={styles.headerText}>
          <AppText style={styles.headerTitle} numberOfLines={1}>
            Help & Support
          </AppText>
          <AppText style={styles.online}>● Support online</AppText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <ContentColumn>
          <View
            style={[
              styles.channels,
              layout.isCompact && styles.channelsStack,
            ]}>
            {channels.map(c => (
              <Pressable
                key={c.id}
                onPress={c.onPress}
                style={[
                  styles.channel,
                  layout.isCompact && styles.channelFull,
                ]}>
                <AppIcon
                  name={c.icon}
                  size={20}
                  color={c.color}
                  tile={{size: 42, radius: 13, bg: c.bg}}
                />
                <AppText style={styles.channelLabel} numberOfLines={1}>
                  {c.label}
                </AppText>
                <AppText
                  style={[styles.channelHint, {color: c.hintColor}]}
                  numberOfLines={1}>
                  {c.hint}
                </AppText>
              </Pressable>
            ))}
          </View>

          {!!state.contactVia && (
            <Banner
              tone="success"
              icon={
                <AppIcon
                  name={
                    state.contactVia === 'call'
                      ? 'phone'
                      : state.contactVia === 'email'
                        ? 'mail'
                        : 'chat'
                  }
                  size={16}
                  color={colors.primary}
                />
              }
              text={
                state.contactVia === 'call'
                  ? `Rider helpline ${cfg.supportPhone}`
                  : state.contactVia === 'email'
                  ? `Email ${cfg.supportEmail}`
                  : 'Live chat is below — send a message any time.'
              }
              style={styles.note}
            />
          )}

          <AppText style={styles.quickHelp}>Support tickets</AppText>
          {ticketPhase === 'success' && savedTicket ? (
            <View style={styles.ticketForm}>
              <SavedSummaryCard
                title="Ticket submitted"
                fields={[
                  {
                    label: 'Ticket',
                    value:
                      savedTicket.ticketNumber || savedTicket.id || 'Created',
                  },
                  {label: 'Subject', value: savedTicket.subject},
                  {
                    label: 'Category',
                    value:
                      TICKET_CATEGORIES.find(c => c.id === savedTicket.category)
                        ?.label || savedTicket.category,
                  },
                  {label: 'Message', value: savedTicket.message},
                  {
                    label: 'Status',
                    value: (savedTicket.status || 'open').replace(/_/g, ' '),
                  },
                ]}
              />
              <PrimaryButton
                label="Create another ticket"
                height={44}
                style={styles.ticketSuccessBtn}
                onPress={() => {
                  setSavedTicket(null);
                  setTicketSubject('');
                  setTicketMessage('');
                  setTicketCategory('other');
                  setTicketError('');
                  setTicketPhase('form');
                }}
              />
            </View>
          ) : (
            <View style={styles.ticketForm}>
              <TextInput
                value={ticketSubject}
                onChangeText={v => {
                  setTicketSubject(v.slice(0, TICKET_SUBJECT_MAX));
                  setTicketError('');
                }}
                placeholder={`Subject (min ${TICKET_SUBJECT_MIN} characters)`}
                placeholderTextColor={colors.textFaint}
                maxLength={TICKET_SUBJECT_MAX}
                style={styles.ticketInput}
              />
              <View style={styles.catRow}>
                {TICKET_CATEGORIES.map(c => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setTicketCategory(c.id);
                      setTicketError('');
                    }}
                    style={[
                      styles.catChip,
                      ticketCategory === c.id && styles.catChipOn,
                    ]}>
                    <AppText
                      style={[
                        styles.catChipText,
                        ticketCategory === c.id && styles.catChipTextOn,
                      ]}
                      numberOfLines={1}>
                      {c.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={ticketMessage}
                onChangeText={v => {
                  setTicketMessage(v.slice(0, TICKET_MESSAGE_MAX));
                  setTicketError('');
                }}
                placeholder="Describe the issue"
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={TICKET_MESSAGE_MAX}
                style={[styles.ticketInput, styles.ticketArea]}
              />
              {!!ticketError && (
                <AppText style={styles.ticketErr}>{ticketError}</AppText>
              )}
              <PrimaryButton
                label={ticketBusy ? 'Submitting…' : 'Create ticket'}
                disabled={
                  ticketBusy ||
                  ticketSubject.trim().length < TICKET_SUBJECT_MIN ||
                  !ticketMessage.trim()
                }
                height={44}
                onPress={async () => {
                  const subject = ticketSubject.trim();
                  const message = ticketMessage.trim();
                  if (subject.length < TICKET_SUBJECT_MIN) {
                    setTicketError(
                      `Subject must be at least ${TICKET_SUBJECT_MIN} characters.`,
                    );
                    return;
                  }
                  if (!message) {
                    setTicketError('Enter a message describing the issue.');
                    return;
                  }
                  if (ticketBusy) {
                    return;
                  }
                  setTicketBusy(true);
                  setTicketError('');
                  const result = await supportApi.createTicket({
                    subject,
                    message,
                    category: ticketCategory,
                  });
                  setTicketBusy(false);
                  if (!result.ok || !result.data?.id) {
                    setTicketError(result.error || 'Could not create ticket');
                    return;
                  }
                  setSavedTicket({
                    id: result.data.id,
                    ticketNumber: result.data.ticketNumber,
                    subject: result.data.subject || subject,
                    category: ticketCategory,
                    message,
                    status: result.data.status || 'open',
                  });
                  setTicketPhase('success');
                  await loadTickets();
                }}
              />
            </View>
          )}
          {tickets.length === 0 && !ticketError ? (
            <AppText style={styles.faqA}>No support tickets yet</AppText>
          ) : (
            <View style={styles.ticketList}>
              {tickets.map(t => (
                <View key={t.id} style={styles.ticketRow}>
                  <View style={styles.ticketMeta}>
                    <AppText style={styles.faqQ} numberOfLines={2}>
                      {t.ticketNumber || t.id} · {t.subject}
                    </AppText>
                    <AppText style={styles.faqA} numberOfLines={1}>
                      {(t.status || 'open').replace(/_/g, ' ')}
                      {t.category ? ` · ${t.category}` : ''}
                    </AppText>
                  </View>
                  {!!t.unreadCount && (
                    <AppText style={styles.unread}>{t.unreadCount}</AppText>
                  )}
                </View>
              ))}
            </View>
          )}

          <AppText style={styles.quickHelp}>Quick help</AppText>
          <View style={styles.faqList}>
            {faqError ? (
              <AppText style={styles.faqA}>{faqError}</AppText>
            ) : faqs.length === 0 ? (
              <AppText style={styles.faqA}>No help articles yet</AppText>
            ) : (
              faqs.map(f => (
                <View key={f.q} style={styles.faq}>
                  <AppText style={styles.faqQ}>{f.q}</AppText>
                  <AppText style={styles.faqA}>{f.a}</AppText>
                </View>
              ))
            )}
          </View>

          {state.contactVia === 'chat' && (
            <View style={styles.chat}>
              {state.chat.map((m, i) => (
                <View
                  key={i}
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
            </View>
          )}
          </ContentColumn>
        </ScrollView>

        {state.contactVia === 'chat' && (
          <View style={styles.inputRowWrap}>
            {!!chatError && (
              <AppText style={styles.ticketErr}>{chatError}</AppText>
            )}
            <View style={styles.inputRow}>
              <TextInput
                value={state.chatInput}
                onChangeText={v => {
                  actions.setChatInput(v.slice(0, CHAT_MESSAGE_MAX));
                  setChatError('');
                }}
                placeholder="Type your message..."
                placeholderTextColor={colors.textFaint}
                maxLength={CHAT_MESSAGE_MAX}
                editable={!chatBusy}
                style={styles.input}
              />
              <Pressable
                onPress={async () => {
                  const text = state.chatInput.trim();
                  if (!text || chatBusy) {
                    return;
                  }
                  if (text.length > CHAT_MESSAGE_MAX) {
                    setChatError(
                      `Message must be at most ${CHAT_MESSAGE_MAX} characters.`,
                    );
                    return;
                  }
                  setChatBusy(true);
                  setChatError('');
                  const result = await actions.sendChat();
                  setChatBusy(false);
                  if (result && !result.ok) {
                    setChatError(result.error || 'Could not send message');
                    return;
                  }
                  setTimeout(
                    () => scrollRef.current?.scrollToEnd({animated: true}),
                    100,
                  );
                }}
                style={[
                  styles.sendBtn,
                  (!state.chatInput.trim() || chatBusy) && styles.sendBtnOff,
                ]}
                disabled={!state.chatInput.trim() || chatBusy}>
                <SendIcon size={18} />
              </Pressable>
            </View>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: {fontWeight: '700', fontSize: 22, color: colors.textSecondary},
  headerText: {flex: 1, minWidth: 0},
  headerTitle: {fontWeight: '800', fontSize: 17, color: colors.inkStrong},
  online: {fontWeight: '400', fontSize: 11, color: colors.primary},
  scroll: {padding: 20, paddingBottom: 16},
  channels: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  channelsStack: {flexDirection: 'column'},
  channel: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 16,
    paddingHorizontal: 8,
    ...shadow('sm'),
  },
  channelFull: {flexBasis: '100%', width: '100%'},
  channelLabel: {
    fontWeight: '700',
    fontSize: 12,
    color: colors.ink,
    marginTop: 8,
    minWidth: 0,
  },
  channelHint: {fontWeight: '400', fontSize: 10, marginTop: 1, minWidth: 0},
  note: {marginTop: 12},
  ticketForm: {gap: 10},
  ticketSuccessBtn: {marginTop: 4},
  ticketInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.fieldBg,
  },
  ticketArea: {minHeight: 88, textAlignVertical: 'top'},
  catRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  catChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  catChipOn: {borderColor: colors.primary, backgroundColor: colors.primaryTint},
  catChipText: {fontWeight: '600', fontSize: 12, color: colors.textMuted},
  catChipTextOn: {color: colors.primary},
  ticketErr: {fontWeight: '600', fontSize: 12, color: colors.danger},
  ticketList: {gap: 8, marginTop: 8},
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 12,
  },
  ticketMeta: {flex: 1, minWidth: 0},
  unread: {fontWeight: '800', fontSize: 12, color: colors.primary},
  quickHelp: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 18,
    marginBottom: 10,
  },
  faqList: {gap: 8},
  faq: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 12,
  },
  faqQ: {fontWeight: '600', fontSize: 13, color: colors.ink, minWidth: 0},
  faqA: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    minWidth: 0,
  },
  chat: {gap: 10, marginTop: 16},
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
  inputRowWrap: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: {opacity: 0.45},
});
