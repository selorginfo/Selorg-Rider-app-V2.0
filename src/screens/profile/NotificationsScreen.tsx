import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {ScreenHeader} from '../../components/headers/ScreenHeader';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {notificationApi} from '../../services/api';
import type {NotificationDto} from '../../types/api';
import {colors, radius} from '../../theme';

export function NotificationsScreen() {
  const nav = useAppNavigation();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [marking, setMarking] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setActionError('');
    const result = await notificationApi.list();
    if (!result.ok) {
      setItems([]);
      setError(result.error || 'Could not load notifications');
      setLoading(false);
      return;
    }
    setItems(Array.isArray(result.data) ? result.data : []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRead = async (id: string, already: boolean) => {
    if (already || readingId || marking) {
      return;
    }
    setReadingId(id);
    setActionError('');
    const result = await notificationApi.markRead(id);
    setReadingId(null);
    if (!result.ok) {
      setActionError(result.error || 'Could not mark as read. Try again.');
      return;
    }
    setItems(prev =>
      prev.map(n => (n.id === id ? {...n, read: true} : n)),
    );
  };

  const onReadAll = async () => {
    if (marking || readingId || items.every(n => n.read)) {
      return;
    }
    setMarking(true);
    setActionError('');
    const result = await notificationApi.markAllRead();
    setMarking(false);
    if (!result.ok) {
      setActionError(
        result.error || 'Could not mark all as read. Try again.',
      );
      return;
    }
    setItems(prev => prev.map(n => ({...n, read: true})));
  };

  return (
    <Screen background={colors.white} contentContainerStyle={styles.body}>
      <ScreenHeader
        title="Notifications"
        onBack={() => nav.goBack()}
        right={
          items.some(n => !n.read) ? (
            <Pressable onPress={() => void onReadAll()} disabled={marking || !!readingId}>
              <AppText style={styles.markAll}>
                {marking ? 'Updating…' : 'Mark all read'}
              </AppText>
            </Pressable>
          ) : undefined
        }
      />
      {!!actionError && (
        <Pressable
          onPress={() => {
            setActionError('');
          }}>
          <AppText style={styles.actionError}>{actionError}</AppText>
        </Pressable>
      )}
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : error ? (
        <Pressable onPress={() => void load()}>
          <AppText style={styles.empty}>{error} · Retry</AppText>
        </Pressable>
      ) : items.length === 0 ? (
        <AppText style={styles.empty}>No notifications yet</AppText>
      ) : (
        <View style={styles.list}>
          {items.map(n => (
            <Pressable
              key={n.id}
              onPress={() => void onRead(n.id, n.read)}
              disabled={!!readingId || marking}
              style={[styles.row, !n.read && styles.unread]}>
              <View style={styles.dotWrap}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        n.read || readingId === n.id
                          ? colors.neutralTile
                          : colors.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.text}>
                <AppText style={styles.title}>{n.title}</AppText>
                {!!n.body && <AppText style={styles.bodyText}>{n.body}</AppText>}
                <AppText style={styles.time}>
                  {readingId === n.id
                    ? 'Marking read…'
                    : n.time || n.createdAt || ''}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24},
  markAll: {fontWeight: '700', fontSize: 12, color: colors.primary},
  loader: {marginTop: 40},
  actionError: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 10,
    textAlign: 'center',
  },
  empty: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 32,
    textAlign: 'center',
  },
  list: {gap: 10, marginTop: 18},
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  unread: {
    backgroundColor: colors.primaryTint06,
    borderColor: 'rgba(35,114,39,.25)',
  },
  dotWrap: {paddingTop: 6},
  dot: {width: 8, height: 8, borderRadius: 4},
  text: {flex: 1},
  title: {fontWeight: '700', fontSize: 14, color: colors.ink},
  bodyText: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {fontWeight: '400', fontSize: 11, color: colors.textFaint, marginTop: 6},
});
