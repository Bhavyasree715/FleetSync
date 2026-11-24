import { Coordinates, calculateHaversineDistance, estimateTravelTimeMinutes } from './haversine';

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry?: [number, number][]; // [lat, lng] array
  source: 'osrm' | 'haversine';
}

/**
 * Gets real road driving route & ETA from public OSRM,
 * with seamless fallback to Haversine calculation if offline or rate-limited.
 */
export async function getRoadRoute(
  start: Coordinates,
  end: Coordinates
): Promise<RouteResult> {
  const fallbackDistance = calculateHaversineDistance(start, end);
  // Assume road distance factor ~1.3x Euclidean/Haversine
  const estimatedRoadKm = Math.round(fallbackDistance * 1.3 * 100) / 100;
  const estimatedDuration = estimateTravelTimeMinutes(estimatedRoadKm, 35);

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as any;
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = Math.round((route.distance / 1000) * 100) / 100;
        const durMin = Math.max(1, Math.round(route.duration / 60));
        // OSRM coordinates are [lng, lat], convert to [lat, lng] for Leaflet
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        return {
          distanceKm: distKm,
          durationMin: durMin,
          geometry: coords,
          source: 'osrm',
        };
      }
    }
  } catch (err) {
    // Graceful fallback without breaking anything
  }

  // Linear interpolation geometry for fallback
  const fallbackGeometry: [number, number][] = [
    [start.lat, start.lng],
    [(start.lat + end.lat) / 2, (start.lng + end.lng) / 2],
    [end.lat, end.lng],
  ];

  return {
    distanceKm: estimatedRoadKm,
    durationMin: estimatedDuration,
    geometry: fallbackGeometry,
    source: 'haversine',
  };
}
