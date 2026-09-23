import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {LiveMap} from '../../components/feedback/LiveMap';
import {MapChromeBack} from '../../components/headers/MapChrome';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {activeOrder} from '../../store/selectors';
import {orderApi} from '../../services/api/orderApi';
import {
  applyDetailCoords,
  pickupDestination,
} from '../../utils/mapCoords';
import {colors} from '../../theme';
import {mediaBandHeight, useLayout} from '../../theme/layout';

export function TravelScreen() {
  const nav = useAppNavigation();
  const layout = useLayout();
  const {state, actions} = useRider();
  const a = activeOrder(state);
  const mapHeight = mediaBandHeight(
    layout.height,
    layout.isLandscape ? 0.42 : 0.38,
    180,
    layout.isLandscape ? 280 : 360,
  );

  useHardwareBack(
    useCallback(() => {
      resetTo('Main', {screen: 'Orders'});
      return true;
    }, []),
  );
  const [destination, setDestination] = useState(
    () => pickupDestination(a, state.epHubId || state.obHub),
  );
  const [routeLabel, setRouteLabel] = useState<string | null>(null);

  useEffect(() => {
    setDestination(pickupDestination(a, state.epHubId || state.obHub));
    if (!a?.id) {
      return;
    }
    let cancelled = false;
    (async () => {
      const detail = await orderApi.getOrderDetail(a.id);
      if (cancelled || !detail.ok || !detail.data) {
        return;
      }
      const enriched = applyDetailCoords(a, detail.data);
      const next = pickupDestination(enriched, state.epHubId || state.obHub);
      if (next) {
        setDestination(next);
        actions.patch({
          orders: state.orders.map(o =>
            o.id === a.id ? {...o, ...enriched} : o,
          ),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally depend on order id + hub only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.id, state.epHubId, state.obHub]);

  if (!a) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.flex, styles.empty]}>
          <AppText style={styles.emptyText}>No active order</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.flex}>
        <View>
          <LiveMap
            height={mapHeight}
            direction="toStore"
            accent={colors.primary}
            destination={destination}
            onRouteInfo={info => {
              if (!info) {
                setRouteLabel('ETA unavailable');
                return;
              }
              if (info.etaUnavailable) {
                setRouteLabel(
                  info.distanceText
                    ? `${info.distanceText} · ETA unavailable`
                    : 'ETA unavailable',
                );
                return;
              }
              if (info.distanceText && info.durationText) {
                setRouteLabel(`${info.distanceText} · ${info.durationText}`);
              }
            }}
          />
          <View style={styles.mapChrome} pointerEvents="box-none">
            <MapChromeBack
              onPress={() => resetTo('Main', {screen: 'Orders'})}
            />
            <View style={styles.floatCard}>
              <View style={styles.floatIcon}>
                <AppText style={styles.floatEmoji}>🏬</AppText>
              </View>
              <View style={styles.floatText}>
                <AppText style={styles.floatTitle} numberOfLines={2}>
                  {a.pickup}
                </AppText>
                <AppText style={styles.floatSub} numberOfLines={1}>
                  {routeLabel || 'Getting route…'}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        <ContentColumn style={styles.body}>
          <AppText style={styles.heading}>Heading to darkstore</AppText>
          <AppText style={styles.copy}>
            Navigate to <AppText style={styles.bay}>{a.bay}</AppText> and tap
            the button below once you reach the store.
          </AppText>
        </ContentColumn>

        <ContentColumn style={styles.footer}>
          <PrimaryButton
            label="I've Arrived at Store"
            onPress={() => {
              actions.setFlow('bag');
              nav.replace('Bag');
            }}
          />
        </ContentColumn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  flex: {flex: 1},
  empty: {alignItems: 'center', justifyContent: 'center'},
  emptyText: {fontWeight: '600', fontSize: 14, color: colors.textMuted},
  mapChrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    elevation: 12,
  },
  floatCard: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 8},
    elevation: 12,
    zIndex: 5,
  },
  floatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatEmoji: {fontSize: 20},
  floatText: {flex: 1, minWidth: 0},
  floatTitle: {fontWeight: '700', fontSize: 14, color: colors.ink},
  floatSub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  body: {flex: 1, padding: 16, width: '100%'},
  heading: {fontWeight: '800', fontSize: 18, color: colors.ink},
  copy: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  bay: {fontWeight: '700', color: colors.ink},
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    width: '100%',
  },
});
