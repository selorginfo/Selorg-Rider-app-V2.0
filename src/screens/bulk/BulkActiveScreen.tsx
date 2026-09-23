import React, {useCallback, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {GradientView} from '../../components/common/GradientView';
import {LiveMap} from '../../components/feedback/LiveMap';
import {StopRail} from '../../components/feedback/StopRail';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {OutlineButton} from '../../components/buttons/OutlineButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {selectBulk} from '../../store/selectors';
import {bulkApi} from '../../services/api/bulkApi';
import {hubLatLng} from '../../utils/mapCoords';
import {openDialer} from '../../utils/phone';
import {colors} from '../../theme';
import {mediaBandHeight, useLayout} from '../../theme/layout';

export function BulkActiveScreen() {
  const nav = useAppNavigation();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const {state, actions} = useRider();
  const b = selectBulk(state);
  const cur = b.current;
  const mapH = mediaBandHeight(layout.height, 0.28, 180, 280);
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [phaseError, setPhaseError] = useState('');

  useHardwareBack(
    useCallback(() => {
      resetTo('Main', {screen: 'Orders'});
      return true;
    }, []),
  );

  const phaseAction = async () => {
    if (phaseBusy) {
      return;
    }
    if (state.bulkStopPhase === 'arrived') {
      nav.replace('BulkVerify');
      return;
    }
    const stopId = cur?.id;
    if (!stopId) {
      return;
    }
    const phase =
      state.bulkStopPhase === 'toNav' ? 'navigating' : 'arrived';
    setPhaseBusy(true);
    setPhaseError('');
    try {
      const result = await bulkApi.arrive(stopId, phase);
      if (!result.ok) {
        setPhaseError(
          result.error || 'Could not update stop status. Try again.',
        );
        return;
      }
      actions.bulkPhaseAdvance();
    } finally {
      setPhaseBusy(false);
    }
  };

  const phaseLabel = phaseBusy
    ? state.bulkStopPhase === 'toNav'
      ? 'Starting navigation…'
      : 'Marking arrived…'
    : b.phaseBtnLabel;

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bulkDark} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <GradientView
          colors={[colors.bulkDark, colors.bulk]}
          angle={150}
          style={[styles.header, {paddingTop: insets.top + 16}]}>
          <View style={styles.headerTop}>
            <AppText style={styles.headerKicker} numberOfLines={1}>
              BULK DELIVERY · #{b.batchId}
            </AppText>
            <Pressable
              onPress={() => {
                actions.setBulkReturn('BulkActive');
                nav.navigate('BulkAllStops');
              }}>
              <AppText style={styles.allStops}>All Stops ›</AppText>
            </Pressable>
          </View>
          <View style={styles.stats}>
            <Stat value={`${b.completed}/${b.total}`} label="Delivered" />
            <Stat value={String(b.remaining)} label="Remaining" />
            <Stat value={String(b.failed)} label="Failed" />
          </View>
          <View style={styles.rail}>
            <StopRail stops={b.stops} currentIdx={b.currentIdx} />
          </View>
        </GradientView>

        <LiveMap
          height={mapH}
          direction="toStore"
          accent={colors.bulk}
          destination={hubLatLng(state.epHubId || state.obHub)}
        />

        {b.notDone && cur && (
          <View style={styles.body}>
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.stopPill}>
                  <AppText style={styles.stopPillText} numberOfLines={1}>
                    STOP {cur.idx + 1} OF {b.total}
                  </AppText>
                </View>
                <Pressable
                  onPress={() => {
                    actions.openStopDetail(b.currentIdx, 'BulkActive');
                    nav.navigate('BulkStopDetail');
                  }}>
                  <AppText style={styles.detailsLink}>Order Details ›</AppText>
                </Pressable>
              </View>
              <AppText style={styles.customer} numberOfLines={1}>
                {cur.customer}
              </AppText>
              <AppText style={styles.addr} numberOfLines={2}>
                {cur.num} · {cur.addr}
              </AppText>
              <View style={styles.pills}>
                <View style={styles.pill}>
                  <AppText style={styles.pillText} numberOfLines={1}>
                    📍 {cur.dist}
                  </AppText>
                </View>
                <View style={styles.pill}>
                  <AppText style={styles.pillText} numberOfLines={1}>
                    ⏱ {cur.eta}
                  </AppText>
                </View>
                <Pressable
                  onPress={() => {
                    void openDialer(cur.phone);
                  }}
                  style={styles.pill}>
                  <AppText
                    style={[styles.pillText, {color: colors.primary}]}
                    numberOfLines={1}>
                    📞 Call
                  </AppText>
                </Pressable>
              </View>
              {state.bulkStopPhase === 'navigating' && (
                <AppText style={styles.navNote}>
                  Navigating · tap Mark Arrived once you reach the drop point
                </AppText>
              )}
              {!!phaseError && (
                <Pressable onPress={() => void phaseAction()}>
                  <AppText style={styles.phaseError}>
                    {phaseError} · Retry
                  </AppText>
                </Pressable>
              )}
              <PrimaryButton
                label={phaseLabel}
                variant="purple"
                onPress={() => void phaseAction()}
                disabled={phaseBusy}
                loading={phaseBusy && state.bulkStopPhase !== 'arrived'}
                height={52}
                style={styles.phaseBtn}
              />
              <OutlineButton
                label="Report Delivery Issue"
                tone="danger"
                height={44}
                borderRadius={999}
                onPress={() => {
                  if (phaseBusy) {
                    return;
                  }
                  actions.openException(b.currentIdx);
                }}
                style={styles.reportBtn}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({value, label}: {value: string; label: string}) {
  return (
    <View>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  // paddingTop applied inline (safe-area inset + 16) so the gradient runs
  // behind the status bar rather than leaving a plain band above it.
  header: {paddingHorizontal: 16, paddingBottom: 16},
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  headerKicker: {
    flex: 1,
    minWidth: 0,
    fontWeight: '700',
    fontSize: 12,
    color: colors.bulkOnDark,
  },
  allStops: {fontWeight: '700', fontSize: 12, color: colors.white, flexShrink: 0},
  stats: {flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 9},
  statValue: {fontWeight: '800', fontSize: 17, color: colors.white},
  statLabel: {fontWeight: '400', fontSize: 10, color: colors.bulkOnDark},
  rail: {marginTop: 12},
  body: {padding: 16},
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  stopPill: {
    backgroundColor: colors.bulkTint,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    minWidth: 0,
    flexShrink: 1,
  },
  stopPillText: {fontWeight: '700', fontSize: 11, color: colors.bulk},
  detailsLink: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.primary,
    flexShrink: 0,
  },
  customer: {
    fontWeight: '800',
    fontSize: 17,
    color: colors.ink,
    marginTop: 12,
    minWidth: 0,
  },
  addr: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    minWidth: 0,
  },
  pills: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12},
  pill: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 88,
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  pillText: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 0,
  },
  navNote: {fontWeight: '600', fontSize: 12, color: colors.bulk, marginTop: 10},
  phaseError: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 10,
    textAlign: 'center',
  },
  phaseBtn: {marginTop: 14},
  reportBtn: {marginTop: 10},
});
