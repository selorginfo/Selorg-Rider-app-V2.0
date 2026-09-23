import type {LatLng} from 'react-native-maps';

/** Customer drop on Out for delivery — Adyar, Chennai. */
export const ADYAR_DEST: LatLng = {
  latitude: 13.0064,
  longitude: 80.2572,
};

/** Start west of Adyar (Sardar Patel Rd) so the bike rides into Adyar. */
export const ADYAR_BIKE_START: LatLng = {
  latitude: 13.0162,
  longitude: 80.2378,
};

export const ADYAR_ADDRESS = '42, Lattice Bridge Road, Adyar, Chennai';

export function metersBetween(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function headingBetween(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Extra points along a segment so the bike glides instead of jumping. */
export function densifyRoute(points: LatLng[], stepMeters = 16): LatLng[] {
  if (points.length < 2) {
    return points.slice();
  }
  const out: LatLng[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dist = metersBetween(a, b);
    const steps = Math.max(1, Math.round(dist / stepMeters));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push({
        latitude: a.latitude + (b.latitude - a.latitude) * t,
        longitude: a.longitude + (b.longitude - a.longitude) * t,
      });
    }
  }
  return out;
}

/** Curved fallback when Directions is unavailable. */
export function curvedPath(origin: LatLng, dest: LatLng): LatLng[] {
  const mid: LatLng = {
    latitude: (origin.latitude + dest.latitude) / 2 + 0.0032,
    longitude: (origin.longitude + dest.longitude) / 2 - 0.0016,
  };
  const pts: LatLng[] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({
      latitude:
        u * u * origin.latitude + 2 * u * t * mid.latitude + t * t * dest.latitude,
      longitude:
        u * u * origin.longitude +
        2 * u * t * mid.longitude +
        t * t * dest.longitude,
    });
  }
  return pts;
}

export function positionOnRoute(
  points: LatLng[],
  index: number,
): {coord: LatLng; heading: number} {
  const i = Math.max(0, Math.min(index, points.length - 1));
  const coord = points[i];
  const next = points[Math.min(i + 1, points.length - 1)];
  return {
    coord,
    heading: headingBetween(coord, next),
  };
}
