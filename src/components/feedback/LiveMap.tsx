import React, {Component, useEffect, useMemo, useRef, useState} from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  UIManager,
  View,
  ViewStyle,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type Region,
} from 'react-native-maps';
import {
  getCurrentPosition,
  getLastGpsPoint,
  requestLocationPermission,
  watchGps,
  type GpsPoint,
} from '../../services/location/locationTracker';
import {
  fetchDrivingRoute,
  movedFarEnough,
  type RouteInfo,
} from '../../services/maps/directions';
import {colors} from '../../theme';
import {MapPlaceholder} from './MapPlaceholder';
import {WebLiveMap} from './WebLiveMap';
import {BikeMarkerView} from './BikeMarker';
import {
  curvedPath,
  densifyRoute,
  positionOnRoute,
} from '../../utils/bikeAnim';

export type LiveMapDirection = 'toStore' | 'toCustomer';

export interface LiveMapProps {
  height?: number;
  /** Stretch to fill remaining screen (Nav / out-for-delivery). */
  fill?: boolean;
  accent?: string;
  direction?: LiveMapDirection;
  /** Destination pin (store or customer). */
  destination?: LatLng | null;
  /** Optional fixed origin; otherwise live GPS is used. */
  origin?: LatLng | null;
  /** When true, a delivery bike rides the route toward the destination (loops). */
  animateBike?: boolean;
  onRouteInfo?: (info: RouteInfo | null) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** True when the native AIRMap / AIRGoogleMap view manager is linked in the APK. */
function isNativeMapsAvailable(): boolean {
  try {
    const getConfig =
      typeof UIManager.getViewManagerConfig === 'function'
        ? UIManager.getViewManagerConfig.bind(UIManager)
        : null;
    if (getConfig) {
      return getConfig('AIRMap') != null || getConfig('AIRGoogleMap') != null;
    }
    const managers = UIManager as unknown as Record<string, unknown>;
    return managers.AIRMap != null || managers.AIRGoogleMap != null;
  } catch {
    return false;
  }
}

type MapBoundaryProps = {
  fallback: React.ReactNode;
  children: React.ReactNode;
};

type MapBoundaryState = {hasError: boolean};

/** Prevents a MapView native crash from taking down the whole screen. */
class MapErrorBoundary extends Component<MapBoundaryProps, MapBoundaryState> {
  state: MapBoundaryState = {hasError: false};

  static getDerivedStateFromError(): MapBoundaryState {
    return {hasError: true};
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const EMPTY_REGION: Region = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

function isValidCoord(p?: LatLng | null): p is LatLng {
  return (
    !!p &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    !(p.latitude === 0 && p.longitude === 0) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}

function regionFor(points: LatLng[]): Region {
  if (points.length === 0) {
    return EMPTY_REGION;
  }
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }
  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max((maxLat - minLat) * 0.35, 0.01);
  const lngPad = Math.max((maxLng - minLng) * 0.35, 0.01);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + latPad * 2,
    longitudeDelta: maxLng - minLng + lngPad * 2,
  };
}

/**
 * Live Google/Apple map with rider GPS + destination pin + driving route.
 * Falls back to a WebView Google Map, then the design SVG, if native maps
 * are not linked or coordinates are missing.
 */
export function LiveMap({
  height,
  fill = false,
  accent = colors.primary,
  direction = 'toStore',
  destination,
  origin,
  animateBike = false,
  onRouteInfo,
  children,
  style,
}: LiveMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const didFit = useRef(false);
  const lastRouteOrigin = useRef<LatLng | null>(null);
  const [rider, setRider] = useState<GpsPoint | null>(
    () => getLastGpsPoint() || null,
  );
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [bike, setBike] = useState<{
    coord: LatLng;
    heading: number;
  } | null>(null);
  const dest = isValidCoord(destination) ? destination : null;
  const fixedOrigin = isValidCoord(origin) ? origin : null;
  const riderLat = fixedOrigin?.latitude ?? rider?.latitude;
  const riderLng = fixedOrigin?.longitude ?? rider?.longitude;
  const riderPoint = useMemo<LatLng | null>(() => {
    if (riderLat == null || riderLng == null) {
      return null;
    }
    if (!Number.isFinite(riderLat) || !Number.isFinite(riderLng)) {
      return null;
    }
    return {latitude: riderLat, longitude: riderLng};
  }, [riderLat, riderLng]);

  useEffect(() => {
    if (fixedOrigin) {
      return;
    }
    let cancelled = false;
    let stopWatch: (() => void) | null = null;

    (async () => {
      const allowed = await requestLocationPermission();
      if (!allowed || cancelled) {
        return;
      }
      try {
        const point = await getCurrentPosition();
        if (!cancelled) {
          setRider(point);
        }
      } catch {
        // Keep last known / destination-only view.
      }
      if (cancelled) {
        return;
      }
      stopWatch = watchGps(point => {
        if (!cancelled) {
          setRider(point);
        }
      });
    })();

    return () => {
      cancelled = true;
      if (stopWatch) {
        stopWatch();
      }
    };
  }, [fixedOrigin]);

  useEffect(() => {
    didFit.current = false;
    lastRouteOrigin.current = null;
    setRoute(null);
  }, [dest?.latitude, dest?.longitude]);

  useEffect(() => {
    if (!riderPoint || !dest) {
      setRoute(prev => (prev == null ? prev : null));
      return;
    }
    if (
      lastRouteOrigin.current &&
      !movedFarEnough(lastRouteOrigin.current, riderPoint, 70)
    ) {
      return;
    }
    let cancelled = false;
    lastRouteOrigin.current = riderPoint;
    (async () => {
      const next = await fetchDrivingRoute(riderPoint, dest);
      if (cancelled) {
        return;
      }
      setRoute(next);
      onRouteInfo?.(next);
    })();
    return () => {
      cancelled = true;
    };
    // onRouteInfo is optional UI glue; omit from deps to avoid refetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderPoint?.latitude, riderPoint?.longitude, dest?.latitude, dest?.longitude]);

  const routeSignature =
    route?.points && route.points.length >= 2
      ? `${route.points.length}:${route.points[0].latitude}:${route.points[0].longitude}:${route.points[route.points.length - 1].latitude}:${route.points[route.points.length - 1].longitude}`
      : '';
  const routePoints = useMemo(() => {
    if (route?.points && route.points.length >= 2) {
      return route.points;
    }
    if (riderPoint && dest && animateBike && Platform.OS !== 'android') {
      return curvedPath(riderPoint, dest);
    }
    const pts: LatLng[] = [];
    if (riderPoint) {
      pts.push(riderPoint);
    }
    if (dest) {
      pts.push(dest);
    }
    return pts;
    // routeSignature stands in for route.points identity so a new RouteInfo
    // object with the same polyline does not restart the bike effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    riderPoint?.latitude,
    riderPoint?.longitude,
    dest?.latitude,
    dest?.longitude,
    routeSignature,
    animateBike,
  ]);

  const initialRegion = useMemo(() => regionFor(routePoints), [routePoints]);

  useEffect(() => {
    // Android uses a static lite map. A 30ms marker loop never lets the UI
    // go idle, so the reached button and UIAutomator both stop receiving input.
    if (Platform.OS === 'android' || !animateBike || routePoints.length < 2) {
      setBike(prev => (prev == null ? prev : null));
      return;
    }
    const dense = densifyRoute(routePoints, 14);
    if (dense.length < 2) {
      return;
    }
    let i = 0;
    setBike(positionOnRoute(dense, 0));
    const tickMs = Math.max(
      28,
      Math.min(90, Math.round(20000 / dense.length)),
    );
    const id = setInterval(() => {
      i += 1;
      if (i >= dense.length) {
        i = 0;
      }
      setBike(positionOnRoute(dense, i));
    }, tickMs);
    return () => clearInterval(id);
  }, [animateBike, routePoints]);

  useEffect(() => {
    if (!mapRef.current || routePoints.length === 0 || didFit.current) {
      return;
    }
    didFit.current = true;
    if (routePoints.length === 1) {
      mapRef.current.animateToRegion(regionFor(routePoints), 400);
      return;
    }
    mapRef.current.fitToCoordinates(routePoints, {
      edgePadding: {top: 48, right: 40, bottom: 120, left: 40},
      animated: true,
    });
  }, [routePoints]);

  const wrapStyle: StyleProp<ViewStyle> = fill
    ? [styles.wrap, styles.fill, style]
    : [styles.wrap, {height: height ?? 340}, style];

  const placeholder = (
    <MapPlaceholder
      height={fill ? undefined : height ?? 340}
      accent={accent}
      direction={direction}
      style={fill ? styles.fill : style}>
      {children}
    </MapPlaceholder>
  );

  const webFallback = (
    <View style={wrapStyle} pointerEvents="box-none">
      <WebLiveMap
        origin={riderPoint}
        destination={dest}
        accent={accent}
        animateBike={animateBike}
        style={StyleSheet.absoluteFill}>
        {children}
      </WebLiveMap>
    </View>
  );

  if (!isNativeMapsAvailable()) {
    if (dest || riderPoint) {
      return webFallback;
    }
    return placeholder;
  }

  if (!dest && !riderPoint) {
    return placeholder;
  }

  const storeIsDest = direction === 'toStore';

  return (
    <MapErrorBoundary fallback={webFallback}>
      <View style={wrapStyle} pointerEvents="box-none">
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          // Android Google Map is a SurfaceView and swallows taps on the
          // footer and the call/chat card. A lite snapshot stays in the
          // normal view tree so those controls receive presses.
          liteMode={Platform.OS === 'android'}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          showsUserLocation={!fixedOrigin && !animateBike}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          followsUserLocation={!fixedOrigin && !dest && !animateBike}>
          {animateBike && bike ? (
            <Marker
              coordinate={bike.coord}
              title="Delivery bike"
              anchor={{x: 0.5, y: 0.5}}
              rotation={bike.heading}
              flat
              zIndex={10}
              tracksViewChanges={false}
              identifier="bike">
              <BikeMarkerView />
            </Marker>
          ) : riderPoint && !fixedOrigin ? null : riderPoint ? (
            <Marker
              coordinate={riderPoint}
              title="You"
              pinColor={accent}
              identifier="rider"
            />
          ) : null}
          {dest ? (
            <Marker
              coordinate={dest}
              title={storeIsDest ? 'Darkstore' : 'Adyar'}
              pinColor={colors.dangerBright}
              identifier="destination"
            />
          ) : null}
          {routePoints.length >= 2 ? (
            <Polyline
              coordinates={routePoints}
              strokeColor={accent}
              strokeWidth={4}
              lineDashPattern={route ? undefined : [8, 10]}
            />
          ) : null}
        </MapView>
        <View style={styles.overlay} pointerEvents="box-none">
          {children}
        </View>
      </View>
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    backgroundColor: '#e6ede6',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralTile,
    overflow: 'hidden',
  },
  fill: {flex: 1, zIndex: 0, elevation: 0},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 12,
  },
});
