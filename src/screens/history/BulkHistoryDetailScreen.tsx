import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useFocusEffect, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {ScreenHeader} from '../../components/headers/ScreenHeader';
import {StatTile} from '../../components/cards/StatTile';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {bulkApi} from '../../services/api';
import type {RootStackParamList} from '../../types/navigation';
import {colors, radius} from '../../theme';

type Route = RouteProp<RootStackParamList, 'BulkHistoryDetail'>;

export function BulkHistoryDetailScreen() {
  const nav = useAppNavigation();
  const route = useRoute<Route>();
  const batchId = route.params?.batchId ?? '';
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [failed, setFailed] = useState(0);
  const [vehicle, setVehicle] = useState('—');
  const [distance, setDistance] = useState('—');
  const [duration, setDuration] = useState('—');
  const [earnings, setEarnings] = useState('—');
  const [subtitle, setSubtitle] = useState('');

  const load = useCallback(async () => {
    if (!batchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await bulkApi.getBatchDetail(batchId);
    if (result.ok && result.data) {
      const b = result.data;
      const t = b.totals;
      setOrders(t?.stops ?? b.orders?.length ?? 0);
      setDelivered(t?.delivered ?? 0);
      setFailed(t?.failed ?? 0);
      setVehicle(b.vehicle ?? '—');
      setSubtitle(b.hub?.name ?? '');
      setDistance('—');
      setDuration('—');
      setEarnings('—');
    }
    setLoading(false);
  }, [batchId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const rows = [
    ['Vehicle', vehicle],
    ['Distance', distance],
    ['Duration', duration],
    ['Earnings', earnings],
  ];

  return (
    <Screen background={colors.white} contentContainerStyle={styles.body}>
      <ScreenHeader
        title={`Batch #${batchId || '—'}`}
        subtitle={subtitle || undefined}
        onBack={() => nav.goBack()}
      />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={colors.primary}
        />
      ) : (
        <>
          <View style={styles.tiles}>
            <StatTile tone="flat" value={String(orders)} label="Orders" />
            <StatTile
              tone="flat"
              value={String(delivered)}
              label="Delivered"
              valueColor={colors.primary}
            />
            <StatTile
              tone="flat"
              value={String(failed)}
              label="Failed"
              valueColor={colors.danger}
            />
          </View>

          <View style={styles.card}>
            {rows.map(([label, value], i) => (
              <View
                key={label}
                style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
                <AppText style={styles.rowLabel}>{label}</AppText>
                <AppText
                  style={[
                    styles.rowValue,
                    label === 'Earnings' && {color: colors.primary},
                  ]}>
                  {value}
                </AppText>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30},
  loader: {marginTop: 40},
  tiles: {flexDirection: 'row', gap: 10, marginTop: 18},
  card: {
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  rowBorder: {borderBottomWidth: 1, borderBottomColor: colors.hairline},
  rowLabel: {fontWeight: '400', fontSize: 13, color: colors.textMuted},
  rowValue: {fontWeight: '700', fontSize: 13, color: colors.ink},
});
