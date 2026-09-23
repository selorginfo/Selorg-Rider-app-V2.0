import React, {useEffect, useMemo, useRef} from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {GOOGLE_MAPS_API_KEY} from '@env';
import type {LatLng} from 'react-native-maps';
import {colors} from '../../theme';

type WebViewHandle = {injectJavaScript: (js: string) => void};
const MapWebView = WebView as unknown as React.ComponentType<{
  ref?: React.Ref<WebViewHandle>;
  originWhitelist?: string[];
  source?: {html: string; baseUrl?: string};
  style?: StyleProp<ViewStyle>;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  scrollEnabled?: boolean;
  setSupportMultipleWindows?: boolean;
}>;

export interface WebLiveMapProps {
  origin?: LatLng | null;
  destination?: LatLng | null;
  accent?: string;
  animateBike?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function mapHtml(
  key: string,
  origin: LatLng | null,
  dest: LatLng | null,
  accent: string,
  animateBike: boolean,
): string {
  const o = origin
    ? `{lat:${origin.latitude},lng:${origin.longitude}}`
    : 'null';
  const d = dest
    ? `{lat:${dest.latitude},lng:${dest.longitude}}`
    : 'null';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#e6ede6}
</style>
</head>
<body>
<div id="map"></div>
<script>
  let map, rider, destM, renderer, directions, lastRouteKey = '', bikeMarker, bikeTimer;
  const ACCENT = ${JSON.stringify(accent)};
  const ANIMATE_BIKE = ${animateBike ? 'true' : 'false'};
  function headingDeg(a, b) {
    const toRad = function(x) { return x * Math.PI / 180; };
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function densify(path) {
    const out = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        out.push({
          lat: a.lat + (b.lat - a.lat) * t,
          lng: a.lng + (b.lng - a.lng) * t
        });
      }
    }
    if (path.length) out.push(path[path.length - 1]);
    return out;
  }
  function bikeIcon(rot) {
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 6.5,
      rotation: rot || 0,
      fillColor: ACCENT,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    };
  }
  function startBike(path) {
    if (bikeTimer) clearInterval(bikeTimer);
    if (!path || path.length < 2) return;
    const pts = densify(path.map(function(p) {
      return { lat: p.lat(), lng: p.lng() };
    }));
    if (!bikeMarker) {
      bikeMarker = new google.maps.Marker({
        map: map,
        zIndex: 999,
        icon: bikeIcon(0),
      });
    }
    let i = 0;
    bikeMarker.setPosition(pts[0]);
    bikeTimer = setInterval(function() {
      i = (i + 1) % pts.length;
      const p = pts[i];
      const n = pts[(i + 1) % pts.length];
      bikeMarker.setPosition(p);
      bikeMarker.setIcon(bikeIcon(headingDeg(p, n)));
    }, 70);
  }
  function init() {
    const origin = ${o};
    const dest = ${d};
    const center = dest || origin || {lat:0,lng:0};
    map = new google.maps.Map(document.getElementById('map'), {
      center, zoom: 14, disableDefaultUI: true, gestureHandling: 'greedy',
      styles: [{featureType:'poi',stylers:[{visibility:'off'}]}]
    });
    directions = new google.maps.DirectionsService();
    renderer = new google.maps.DirectionsRenderer({
      map, suppressMarkers: true,
      polylineOptions: {strokeColor: ACCENT, strokeWeight: 5, strokeOpacity: 0.9}
    });
    updatePositions(origin && origin.lat, origin && origin.lng, dest && dest.lat, dest && dest.lng);
  }
  function setMarker(existing, pos, title, color) {
    if (!pos) return existing || null;
    if (existing) { existing.setPosition(pos); return existing; }
    return new google.maps.Marker({
      position: pos, map, title,
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
    });
  }
  function updatePositions(olat, olng, dlat, dlng) {
    if (!map) return;
    const origin = (olat != null && olng != null) ? {lat: olat, lng: olng} : null;
    const dest = (dlat != null && dlng != null) ? {lat: dlat, lng: dlng} : null;
    if (!ANIMATE_BIKE) {
      rider = setMarker(rider, origin, 'You', ACCENT);
    }
    destM = setMarker(destM, dest, 'Adyar', '#FB2C36');
    if (!origin || !dest || !directions) {
      if (dest) map.panTo(dest);
      else if (origin) map.panTo(origin);
      return;
    }
    const key = origin.lat.toFixed(4) + ',' + origin.lng.toFixed(4) + '|' + dest.lat.toFixed(4) + ',' + dest.lng.toFixed(4);
    if (key === lastRouteKey) return;
    lastRouteKey = key;
    directions.route({origin: origin, destination: dest, travelMode: 'DRIVING'}, function(res, status) {
      if (status === 'OK') {
        renderer.setDirections(res);
        if (ANIMATE_BIKE && res.routes[0] && res.routes[0].overview_path) {
          startBike(res.routes[0].overview_path);
        }
      } else if (ANIMATE_BIKE) {
        startBike([
          new google.maps.LatLng(origin.lat, origin.lng),
          new google.maps.LatLng(dest.lat, dest.lng)
        ]);
      }
    });
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(origin); bounds.extend(dest);
    map.fitBounds(bounds, 48);
  }
  window.updatePositions = updatePositions;
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${key}&callback=init" async></script>
</body>
</html>`;
}

/**
 * Google Maps JavaScript live map used when the native AIRMap view is not linked.
 */
export function WebLiveMap({
  origin,
  destination,
  accent = colors.primary,
  animateBike = false,
  children,
  style,
}: WebLiveMapProps) {
  const webRef = useRef<WebViewHandle | null>(null);
  const key = (GOOGLE_MAPS_API_KEY || '').trim();
  const html = useMemo(
    () => mapHtml(key, origin || null, destination || null, accent, animateBike),
    // Recreate when dest / origin / bike mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      key,
      destination?.latitude,
      destination?.longitude,
      origin?.latitude,
      origin?.longitude,
      accent,
      animateBike,
    ],
  );

  useEffect(() => {
    if (animateBike || !origin) {
      return;
    }
    const d = destination;
    const js = `window.updatePositions && window.updatePositions(${origin.latitude},${origin.longitude},${
      d ? d.latitude : 'null'
    },${d ? d.longitude : 'null'}); true;`;
    webRef.current?.injectJavaScript(js);
  }, [origin, destination, animateBike]);

  if (!key) {
    return <View style={[styles.wrap, style]}>{children}</View>;
  }

  return (
    <View style={[styles.wrap, style]}>
      <MapWebView
        ref={webRef}
        originWhitelist={['*']}
        source={{html, baseUrl: 'https://maps.googleapis.com'}}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e6ede6',
    overflow: 'hidden',
  },
});
