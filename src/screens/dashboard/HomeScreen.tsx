import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {
  BoxIcon,
  ClockMiniIcon,
  BoxSmallIcon,
  ClockSmallIcon,
  CalendarSmallIcon,
} from '../../components/common/Icons';
import {StatCard} from '../../components/cards/StatCard';
import {GradientView} from '../../components/common/GradientView';
import {ProgressBar} from '../../components/feedback/ProgressBar';
import {ToggleSwitch} from '../../components/inputs/ToggleSwitch';
import {EmptyState} from '../../components/feedback/EmptyState';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {activeOrder, activeShiftLabel, onlineDurationLabel, selectBulk} from '../../store/selectors';
import {profileApi} from '../../services/api/profileApi';
import {riderApi} from '../../services/api/riderApi';
import {orderApi} from '../../services/api/orderApi';
import {normalizeVehicleType} from '../../constants/vehicles';
import type {DashboardTodayDto, IncentiveTodayDto} from '../../types/api';
import {colors, radius, shadow} from '../../theme';
import {MIN_TOUCH} from '../../theme/layout';

function firstName(full: string): string {
  const n = full.trim().split(/\s+/)[0];
  return n || 'Rider';
}

function fmtCod(v?: number): string {
  if (v == null) {
    return '—';
  }
  return `₹${v.toLocaleString('en-IN')}`;
}

function fmtStat(v?: number, fallback = '—'): string {
  if (v == null) {
    return fallback;
  }
  return String(v);
}

export function HomeScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const bulk = selectBulk(state);
  const isBulk = bulk.deliveryMode === 'bulk';
  const current = activeOrder(state);
  const hasActiveDelivery =
    !!current &&
    (current.riderStage === 'accepted' ||
      current.riderStage === 'picked_up' ||
      current.assignedToMe);
  const [dashboard, setDashboard] = useState<DashboardTodayDto | null>(null);
  const [incentive, setIncentive] = useState<IncentiveTodayDto | null>(null);
  const [homeError, setHomeError] = useState('');
  const [homeLoading, setHomeLoading] = useState(true);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [onlineError, setOnlineError] = useState('');

  const onOnlineToggle = async () => {
    if (onlineBusy) {
      return;
    }
    if (!state.isOnline) {
      setOnlineError('');
      // Gate: rider must pick a shift before becoming available for work.
      actions.openShiftSheet();
      return;
    }
    setOnlineBusy(true);
    setOnlineError('');
    const result = await actions.goOffline();
    setOnlineBusy(false);
    if (!result.ok) {
      setOnlineError(result.error || 'Could not go offline. Try again.');
    }
  };

  const loadHome = useCallback(async () => {
    setHomeLoading(true);
    setHomeError('');
    try {
      const [dashRes, profileRes, shifts, incentiveRes, myShiftsRes] =
        await Promise.all([
          riderApi.getDashboardToday(),
          profileApi.getProfile(),
          riderApi.getShifts().catch(() => [] as Awaited<ReturnType<typeof riderApi.getShifts>>),
          riderApi.getIncentiveToday(),
          riderApi.getMyShifts().catch(() => ({ok: false as const, data: null})),
        ]);
      if (dashRes.ok && dashRes.data) {
        setDashboard(dashRes.data);
      } else if (!dashRes.ok) {
        setHomeError(dashRes.error || 'Could not load dashboard');
      }
      if (incentiveRes.ok && incentiveRes.data) {
        setIncentive(incentiveRes.data);
      }

      let mergedShifts = shifts;
      let startedShiftId: string | null = null;
      let startedShiftTime: string | null = null;
      if (myShiftsRes.ok && myShiftsRes.data) {
        const rows = Array.isArray(myShiftsRes.data)
          ? myShiftsRes.data
          : Array.isArray((myShiftsRes.data as {shifts?: unknown[]}).shifts)
            ? (myShiftsRes.data as {shifts: unknown[]}).shifts
            : [];
        const bookedIds = new Set<string>();
        for (const row of rows) {
          if (!row || typeof row !== 'object') {
            continue;
          }
          const r = row as {
            status?: string;
            shiftId?: unknown;
            id?: unknown;
            _id?: unknown;
          };
          let sid = '';
          if (typeof r.shiftId === 'string') {
            sid = r.shiftId;
          } else if (r.shiftId && typeof r.shiftId === 'object') {
            const p = r.shiftId as {
              id?: unknown;
              _id?: unknown;
              timeDisplay?: string;
              startTime?: string;
              endTime?: string;
              time?: string;
            };
            sid = String(p.id || p._id || '');
            if (String(r.status || '').toUpperCase() === 'STARTED' && sid) {
              startedShiftId = sid;
              startedShiftTime =
                p.timeDisplay ||
                (p.startTime && p.endTime
                  ? `${p.startTime} – ${p.endTime}`
                  : p.time || null);
            }
          } else {
            sid = String(r.id || r._id || '');
          }
          if (sid) {
            bookedIds.add(sid);
          }
          if (
            !startedShiftId &&
            String(r.status || '').toUpperCase() === 'STARTED' &&
            sid
          ) {
            startedShiftId = sid;
          }
        }
        if (bookedIds.size > 0) {
          mergedShifts = shifts.map(s =>
            bookedIds.has(s.id) ? {...s, booked: true} : s,
          );
        }
        if (startedShiftId && !startedShiftTime) {
          startedShiftTime =
            mergedShifts.find(s => s.id === startedShiftId)?.time || null;
        }
      }

      const patch: Partial<typeof state> = {shifts: mergedShifts};
      if (profileRes.ok && profileRes.data) {
        if (profileRes.data.name) {
          patch.epName = profileRes.data.name;
        }
        if (profileRes.data.vehicle?.registrationNumber || profileRes.data.vehicle?.label) {
          patch.epVehicle =
            profileRes.data.vehicle.registrationNumber ||
            profileRes.data.vehicle.label ||
            '';
        }
        const synced = normalizeVehicleType(profileRes.data.vehicle?.type);
        if (synced) {
          patch.vehicleType = synced;
        }
        if (profileRes.data.hub?.id) {
          patch.epHubId = profileRes.data.hub.id;
          patch.epHubName = profileRes.data.hub.name || profileRes.data.hub.id;
        }
        if (typeof profileRes.data.isOnline === 'boolean') {
          patch.isOnline = profileRes.data.isOnline;
        } else if (typeof dashRes.data?.isOnline === 'boolean') {
          patch.isOnline = dashRes.data.isOnline;
        }
        if (profileRes.data.onlineSince) {
          patch.onlineSince = profileRes.data.onlineSince;
        } else if (patch.isOnline === false) {
          patch.onlineSince = null;
        }
      }
      if (dashRes.data?.activeShift?.timeDisplay) {
        patch.activeShiftTime = dashRes.data.activeShift.timeDisplay;
      } else if (startedShiftTime) {
        patch.activeShiftTime = startedShiftTime;
      }
      if (startedShiftId) {
        patch.activeShiftId = startedShiftId;
      } else if (patch.isOnline === false) {
        patch.activeShiftId = null;
        patch.activeShiftTime = null;
      }
      if (!isBulk && patch.isOnline !== false) {
        const listed = await orderApi.listAvailable(
          'all',
          profileRes.ok ? profileRes.data?.hub?.id ?? null : null,
        );
        if (listed.ok) {
          const orders = listed.data ?? [];
          const restored =
            orders.find(
              o =>
                o.assignedToMe ||
                o.riderStage === 'accepted' ||
                o.riderStage === 'picked_up',
            ) ?? null;
          patch.orders = orders;
          if (restored) {
            patch.activeId = restored.id;
            patch.flowScreen = restored.riderStage === 'picked_up' ? 'nav' : 'accept';
          }
        }
      }
      actions.patch(patch);
    } catch {
      setHomeError('Could not load dashboard');
    } finally {
      setHomeLoading(false);
    }
  }, [actions, isBulk]);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome]),
  );

  const availableCount = dashboard?.availableOrdersCount ?? 0;

  const openBulk = () => {
    if (state.bulkBatchStatus === 'assigned') {
      nav.navigate('BulkOverview');
    } else if (state.bulkBatchStatus === 'loading') {
      nav.navigate('BulkLoading');
    } else {
      nav.navigate('BulkActive');
    }
  };

  return (
    <Screen contentContainerStyle={styles.body}>
      <ContentColumn style={styles.column}>
      {/* header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <AppText style={styles.welcome}>Welcome back,</AppText>
          <AppText style={styles.name} numberOfLines={1}>
            {firstName(state.epName)}
          </AppText>
          <View style={styles.shiftChip}>
            <ClockMiniIcon />
            <AppText style={styles.shiftChipText} numberOfLines={1}>
              {activeShiftLabel(state)}
            </AppText>
          </View>
          {state.isOnline && !!onlineDurationLabel(state.onlineSince) && (
            <AppText style={styles.onlineDuration}>
              {onlineDurationLabel(state.onlineSince)}
            </AppText>
          )}
          {!state.epHubId && (
            <Pressable onPress={() => nav.navigate('ObHub')}>
              <AppText style={styles.link}>Select hub ›</AppText>
            </Pressable>
          )}
          {isBulk && (
            <View style={styles.bulkChip}>
              <AppText style={styles.bulkChipIcon}>🚐</AppText>
              <AppText style={styles.bulkChipText} numberOfLines={1}>
                {bulk.vehicleLabel} · {bulk.vehicleNo} · BULK DELIVERY
              </AppText>
            </View>
          )}
        </View>
        <View style={styles.toggleCol}>
          <Pressable
            onPress={() => nav.navigate('Notifications')}
            hitSlop={8}
            style={styles.bellBtn}>
            <AppText style={styles.bellGlyph}>🔔</AppText>
          </Pressable>
          <ToggleSwitch
            size="lg"
            value={state.isOnline}
            onToggle={() => {
              void onOnlineToggle();
            }}
          />
          <AppText
            style={[
              styles.onlineLabel,
              {color: state.isOnline ? colors.primary : colors.textFaint},
            ]}>
            {onlineBusy
              ? 'Updating…'
              : state.isOnline
                ? 'Online'
                : 'Offline'}
          </AppText>
        </View>
      </View>
      {!!onlineError && (
        <Pressable
          onPress={() => {
            void onOnlineToggle();
          }}
          style={styles.onlineErrorWrap}>
          <AppText style={styles.onlineError}>
            {onlineError} · Retry
          </AppText>
        </Pressable>
      )}

      {/* performance */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <AppText style={styles.sectionTitle}>Today's Performance</AppText>
          <Pressable onPress={() => nav.navigate('Main', {screen: 'Earnings'})}>
            <AppText style={styles.link}>View Details ›</AppText>
          </Pressable>
        </View>
        {!!homeError && (
          <Pressable onPress={() => void loadHome()}>
            <AppText style={styles.link}>{homeError} · Retry</AppText>
          </Pressable>
        )}
        {homeLoading && !dashboard ? (
          <AppText style={styles.link}>Loading today's stats…</AppText>
        ) : null}
        <View style={styles.grid}>
          <StatCard
            style={styles.gridItem}
            iconBg={colors.primaryTint}
            icon={<AppText style={styles.rupeeIcon}>₹</AppText>}
            value={fmtCod(dashboard?.codCollected)}
            label="COD Collected"
          />
          <StatCard
            style={styles.gridItem}
            iconBg={colors.infoBg}
            icon={<BoxSmallIcon />}
            value={fmtStat(dashboard?.ordersDelivered, '0')}
            label="Orders Delivered"
          />
          <StatCard
            style={styles.gridItem}
            iconBg={colors.purpleChipBg}
            icon={<ClockSmallIcon />}
            value={fmtStat(dashboard?.onlineHours, '0')}
            label="Online Hours"
          />
          <StatCard
            style={styles.gridItem}
            iconBg={colors.warnBg}
            icon={<CalendarSmallIcon />}
            value={fmtStat(dashboard?.slotsCompleted, '0')}
            label="Slots Completed"
          />
        </View>
      </View>

      {/* incentive */}
      <GradientView
        colors={['#4F39F6', '#9810FA']}
        angle={100}
        style={styles.incentive}>
        <View style={styles.incentiveTop}>
          <View>
            <AppText style={styles.incentiveKicker}>DAILY INCENTIVE</AppText>
            <AppText style={styles.incentiveTitle}>
              {incentive?.title ?? '—'}
            </AppText>
          </View>
          <View style={styles.incentivePill}>
            <AppText style={styles.incentivePillText}>
              {incentive?.earnedAmount != null
                ? `₹${incentive.earnedAmount} earned`
                : '—'}
            </AppText>
          </View>
        </View>
        <View style={styles.incentiveBody}>
          <View style={styles.incentiveRow}>
            <AppText style={styles.incentiveRowText}>Progress</AppText>
            <AppText style={styles.incentiveRowText}>
              {incentive?.progressLabel ?? '—'}
            </AppText>
          </View>
          <ProgressBar percent={incentive?.progressPercent ?? 0} />
          <AppText style={styles.incentiveFoot}>
            {incentive?.footnote ?? ''}
          </AppText>
        </View>
      </GradientView>

      {/* online CTA */}
      {state.isOnline && isBulk && bulk.notDone && (
        <GradientView
          colors={['#3730D6', '#4F39F6']}
          angle={120}
          style={styles.bulkCard}>
          <Pressable onPress={openBulk}>
            <View style={styles.bulkCardTop}>
              <View>
                <AppText style={styles.bulkCardKicker}>
                  ACTIVE BULK DELIVERY
                </AppText>
                <AppText style={styles.bulkCardTitle}>
                  Batch #{bulk.batchId}
                </AppText>
              </View>
              <View style={styles.bulkOrdersPill}>
                <AppText style={styles.bulkOrdersPillText}>
                  {bulk.total} orders
                </AppText>
              </View>
            </View>
            <View style={styles.bulkStats}>
              <BulkStat value={bulk.completed} label="Delivered" />
              <BulkStat value={bulk.remaining} label="Remaining" />
              <BulkStat value={bulk.failed} label="Failed" />
            </View>
            <ProgressBar
              percent={parseInt(bulk.progressPct, 10)}
              style={styles.bulkProgress}
            />
            <View style={styles.bulkCta}>
              <AppText style={styles.bulkCtaText}>
                {bulk.homeCardLabel} →
              </AppText>
            </View>
          </Pressable>
        </GradientView>
      )}

      {hasActiveDelivery && current && (
        <Pressable
          onPress={() => {
            if (current.riderStage === 'picked_up') {
              nav.navigate('Nav');
            } else if (current.riderStage === 'accepted') {
              nav.navigate('Travel');
            } else {
              nav.navigate('Accept');
            }
          }}
          style={styles.activeOrderCard}>
          <AppText style={styles.activeOrderEyebrow}>Active delivery</AppText>
          <AppText style={styles.activeOrderTitle} numberOfLines={1}>
            {current.num || 'Order'} · ₹{current.payout}
          </AppText>
          <AppText style={styles.activeOrderSub} numberOfLines={2}>
            {[current.pickup, current.deliver].filter(Boolean).join(' → ') ||
              'Continue delivery'}
          </AppText>
          <AppText style={styles.activeOrderMeta}>
            {[current.distance, current.time].filter(Boolean).join(' · ') ||
              'Open order'}
          </AppText>
        </Pressable>
      )}

      {state.isOnline && !isBulk && availableCount > 0 && (
        <Pressable
          onPress={() => nav.navigate('Main', {screen: 'Orders'})}
          style={styles.newOrders}>
          <View style={styles.newOrdersIcon}>
            <BoxIcon size={22} color={colors.primary} />
            <View style={styles.badge}>
              <AppText style={styles.badgeText}>{availableCount}</AppText>
            </View>
          </View>
          <View style={styles.newOrdersText}>
            <AppText style={styles.newOrdersTitle}>
              {availableCount} new order{availableCount === 1 ? '' : 's'}{' '}
              available
            </AppText>
            <AppText style={styles.newOrdersSub}>
              Tap to view and accept
            </AppText>
          </View>
          <AppText style={styles.chev}>›</AppText>
        </Pressable>
      )}

      {!state.isOnline && (
        <EmptyState
          title="You're currently offline"
          subtitle={
            'Turn on the toggle above to start\nreceiving delivery orders'
          }
        />
      )}

      <Pressable
        onPress={() => {
          actions.setPrev('home');
          nav.navigate('Shifts');
        }}
        style={styles.bookSlots}>
        <View style={styles.bookSlotsIcon}>
          <CalendarSmallIcon color={colors.slate} />
        </View>
        <View style={styles.bookSlotsText}>
          <AppText style={styles.bookSlotsTitle}>Book More Slots</AppText>
          <AppText style={styles.bookSlotsSub}>
            Schedule your upcoming shifts
          </AppText>
        </View>
        <AppText style={styles.bookSlotsChev}>›</AppText>
      </Pressable>
      </ContentColumn>
    </Screen>
  );
}

function BulkStat({value, label}: {value: number; label: string}) {
  return (
    <View>
      <AppText style={styles.bulkStatValue}>{value}</AppText>
      <AppText style={styles.bulkStatLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {padding: 16, paddingBottom: 24},
  column: {gap: 20},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerLeft: {flex: 1, minWidth: 0, flexShrink: 1},
  welcome: {fontWeight: '400', fontSize: 12, color: colors.slate},
  name: {
    fontWeight: '800',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
    marginTop: 2,
    minWidth: 0,
  },
  onlineDuration: {
    fontWeight: '500',
    fontSize: 11,
    color: colors.primary,
    marginTop: 4,
  },
  activeOrderCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadow,
  },
  activeOrderEyebrow: {
    fontWeight: '600',
    fontSize: 11,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  activeOrderTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
    marginTop: 4,
  },
  activeOrderSub: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  activeOrderMeta: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.slate,
    marginTop: 8,
  },
  shiftChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    ...shadow('sm'),
  },
  shiftChipText: {
    fontWeight: '700',
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 0,
    flexShrink: 1,
  },
  bulkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: colors.bulkTint,
    borderWidth: 1,
    borderColor: colors.bulkBorder,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    marginTop: 7,
  },
  bulkChipIcon: {fontSize: 11},
  bulkChipText: {
    fontWeight: '700',
    fontSize: 11,
    color: colors.bulk,
    minWidth: 0,
    flexShrink: 1,
  },
  toggleCol: {alignItems: 'center', gap: 5, flexShrink: 0},
  bellBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bellGlyph: {fontSize: 14},
  onlineLabel: {fontWeight: '700', fontSize: 10},
  onlineErrorWrap: {marginHorizontal: 16, marginTop: 8},
  onlineError: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
  },

  section: {gap: 12},
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.ink,
    flex: 1,
    minWidth: 0,
  },
  link: {fontWeight: '600', fontSize: 12, color: colors.primary},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 11},
  gridItem: {flexGrow: 1, flexBasis: '48%', minWidth: 140},
  rupeeIcon: {fontWeight: '800', fontSize: 15, color: colors.primary},

  incentive: {borderRadius: radius.lg, padding: 20, ...shadow('lg')},
  incentiveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  incentiveKicker: {
    fontWeight: '600',
    fontSize: 11,
    color: colors.incentiveOnDark,
    letterSpacing: 0.6,
  },
  incentiveTitle: {
    fontWeight: '800',
    fontSize: 17,
    color: colors.white,
    marginTop: 3,
  },
  incentivePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  incentivePillText: {fontWeight: '700', fontSize: 12, color: colors.white},
  incentiveBody: {marginTop: 16},
  incentiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  incentiveRowText: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.incentiveOnDark,
  },
  incentiveFoot: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.incentiveOnDark2,
    marginTop: 7,
  },

  bulkCard: {borderRadius: radius.xl, padding: 18, ...shadow('lg')},
  bulkCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bulkCardKicker: {
    fontWeight: '700',
    fontSize: 11,
    color: colors.bulkOnDark,
    letterSpacing: 0.6,
  },
  bulkCardTitle: {
    fontWeight: '800',
    fontSize: 17,
    color: colors.white,
    marginTop: 3,
  },
  bulkOrdersPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  bulkOrdersPillText: {fontWeight: '700', fontSize: 11, color: colors.white},
  bulkStats: {flexDirection: 'row', gap: 18, marginTop: 14},
  bulkStatValue: {fontWeight: '800', fontSize: 16, color: colors.white},
  bulkStatLabel: {fontWeight: '400', fontSize: 11, color: colors.bulkOnDark},
  bulkProgress: {marginTop: 14, height: 6},
  bulkCta: {
    marginTop: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkCtaText: {fontWeight: '700', fontSize: 14, color: colors.bulk},

  newOrders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    ...shadow('md'),
  },
  newOrdersIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.dangerBright,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {color: colors.white, fontWeight: '800', fontSize: 10},
  newOrdersText: {flex: 1},
  newOrdersTitle: {fontWeight: '700', fontSize: 14, color: colors.ink},
  newOrdersSub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  chev: {fontWeight: '700', fontSize: 20, color: colors.primary},

  bookSlots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    ...shadow('sm'),
  },
  bookSlotsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookSlotsText: {flex: 1, minWidth: 0},
  bookSlotsTitle: {fontWeight: '700', fontSize: 14, color: colors.ink},
  bookSlotsSub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  bookSlotsChev: {fontWeight: '700', fontSize: 20, color: colors.textFaint},
});
