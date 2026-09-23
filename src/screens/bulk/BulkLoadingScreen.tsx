import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {Checkbox} from '../../components/inputs/Checkbox';
import {Banner} from '../../components/feedback/Banner';
import {EmptyState} from '../../components/feedback/EmptyState';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {useRider} from '../../store/RiderContext';
import {selectBulk} from '../../store/selectors';
import {colors} from '../../theme';

export function BulkLoadingScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const b = selectBulk(state);
  const orders = state.bulkOrders ?? [];
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [bagBusy, setBagBusy] = useState<string | null>(null);

  useHardwareBack(
    useCallback(() => {
      nav.replace('BulkOverview');
      return true;
    }, [nav]),
  );

  const onToggleBag = async (bag: string) => {
    if (!bag || bagBusy || starting) {
      return;
    }
    setBagBusy(bag);
    setError('');
    const ok = await actions.toggleBulkBag(bag);
    if (!ok) {
      setError('Could not update bag load status. Try again.');
    }
    setBagBusy(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.replace('BulkOverview')} hitSlop={10}>
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <View style={styles.headerText}>
          <AppText style={styles.title}>Load Bulk Orders</AppText>
          <AppText style={styles.sub}>Selorg Darkstore — Koramangala</AppText>
        </View>
        <AppText style={styles.counter}>
          {b.loadedCount}/{b.total}
        </AppText>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}>
        {b.total === 0 ? (
          <EmptyState
            title="No active batch"
            subtitle="Return to overview when a batch is assigned."
          />
        ) : (
          <>
            {b.missingCount > 0 && (
              <Banner
                tone="warning"
                icon="⚠️"
                text={`${b.missingCount} bags not loaded yet — scan each to continue`}
                style={styles.banner}
              />
            )}
            {!!error && <AppText style={styles.error}>{error}</AppText>}
            <View style={styles.list}>
              {orders.map(o => {
                const loaded = !!state.bulkLoaded[o.bag];
                return (
                  <Pressable
                    key={o.id || o.bag}
                    onPress={() => void onToggleBag(o.bag)}
                    disabled={!!bagBusy || starting}
                    style={[
                      styles.row,
                      {
                        borderColor: loaded
                          ? 'rgba(35,114,39,.3)'
                          : colors.border,
                        backgroundColor: loaded
                          ? colors.primaryTint06
                          : colors.white,
                        opacity: bagBusy && bagBusy !== o.bag ? 0.6 : 1,
                      },
                    ]}>
                    <Checkbox
                      checked={loaded}
                      onToggle={() => void onToggleBag(o.bag)}
                      boxOnly
                    />
                    <View style={styles.rowText}>
                      <AppText style={styles.name}>{o.customer}</AppText>
                      <AppText style={styles.meta}>
                        Bag {o.bag} · {o.num}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {b.total > 0 && (
        <View style={styles.footer}>
          {starting ? (
            <ActivityIndicator color={colors.bulk} />
          ) : (
            <PrimaryButton
              label={
                b.allLoaded
                  ? 'Start Bulk Delivery'
                  : `Load all bags to continue (${b.loadedCount}/${b.total})`
              }
              onPress={async () => {
                if (!b.allLoaded || starting) {
                  return;
                }
                setStarting(true);
                setError('');
                const ok = await actions.startBulkDelivery();
                setStarting(false);
                if (ok) {
                  nav.replace('BulkActive');
                  return;
                }
                setError('Could not start bulk delivery. Try again.');
              }}
              disabled={!b.allLoaded || starting || !!bagBusy}
              variant="purple"
            />
          )}
        </View>
      )}
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
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: {fontWeight: '700', fontSize: 22, color: colors.textSecondary},
  headerText: {flex: 1},
  title: {fontWeight: '800', fontSize: 18, color: colors.ink},
  sub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  counter: {fontWeight: '800', fontSize: 15, color: colors.bulk},
  body: {padding: 16, flexGrow: 1},
  banner: {marginBottom: 12},
  error: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.danger,
    marginBottom: 10,
    textAlign: 'center',
  },
  list: {gap: 10},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  rowText: {flex: 1, minWidth: 0},
  name: {fontWeight: '700', fontSize: 14, color: colors.ink},
  meta: {fontWeight: '400', fontSize: 12, color: colors.textMuted, marginTop: 2},
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: 'center',
  },
});
