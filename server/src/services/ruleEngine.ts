import { Coordinates, calculateHaversineDistance } from '../utils/haversine';

export interface PointInPolygonCheck {
  lat: number;
  lng: number;
  polygon: [number, number][]; // [[lat, lng], ...]
}

/**
 * Standard Ray-casting algorithm to test if a point is inside a polygon
 */
export function isPointInPolygon(point: Coordinates, polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1];
    const yi = polygon[i][0];
    const xj = polygon[j][1];
    const yj = polygon[j][0];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Test if a point is within a circular geofence
 */
export function isPointInCircle(
  point: Coordinates,
  center: Coordinates,
  radiusMeters: number
): boolean {
  const distKm = calculateHaversineDistance(point, center);
  const distMeters = distKm * 1000;
  return distMeters <= radiusMeters;
}

// In-memory state tracking to debounce alerts and detect geofence transitions
interface VehicleStateCache {
  lastAlertTime: Record<string, number>; // alertKey -> timestamp
  previousGeofenceStates: Record<string, boolean>; // `${vehicleId}:${geofenceId}` -> wasInside
  lastMoveTime: number;
  lastActiveTime: number;
}

export class FleetRuleEngine {
  private cache: Map<string, VehicleStateCache> = new Map();
  private debounceWindowMs = 60000; // 60s alert debounce per alert type per vehicle

  private getVehicleCache(vehicleId: string): VehicleStateCache {
    let state = this.cache.get(vehicleId);
    if (!state) {
      state = {
        lastAlertTime: {},
        previousGeofenceStates: {},
        lastMoveTime: Date.now(),
        lastActiveTime: Date.now(),
      };
      this.cache.set(vehicleId, state);
    }
    return state;
  }

  /**
   * Evaluates location update against fleet rules:
   * 1. Overspeed limit
   * 2. Geofence Entry/Exit
   * 3. Idle detection
   */
  public evaluateRules(params: {
    vehicleId: string;
    plateNumber: string;
    speed: number;
    speedLimit: number;
    location: Coordinates;
    tripId?: string;
    geofences: Array<{
      id: string;
      name: string;
      type: string;
      centerLat: number;
      centerLng: number;
      radiusMeters: number;
      polygonGeoJson?: string | null;
      alertOnEntry: boolean;
      alertOnExit: boolean;
    }>;
    idleThresholdMinutes?: number;
  }): Array<{
    type: 'overspeed' | 'geofence_entry' | 'geofence_exit' | 'idle';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    lat: number;
    lng: number;
    speed: number;
  }> {
    const alerts: Array<{
      type: 'overspeed' | 'geofence_entry' | 'geofence_exit' | 'idle';
      severity: 'info' | 'warning' | 'critical';
      message: string;
      lat: number;
      lng: number;
      speed: number;
    }> = [];

    const now = Date.now();
    const state = this.getVehicleCache(params.vehicleId);
    state.lastActiveTime = now;

    if (params.speed > 5) {
      state.lastMoveTime = now;
    }

    // 1. OVERSPEED RULE
    const effectiveLimit = params.speedLimit || 60;
    if (params.speed > effectiveLimit) {
      const alertKey = `overspeed:${params.vehicleId}`;
      const lastSent = state.lastAlertTime[alertKey] || 0;
      if (now - lastSent > this.debounceWindowMs) {
        state.lastAlertTime[alertKey] = now;
        const overBy = Math.round(params.speed - effectiveLimit);
        alerts.push({
          type: 'overspeed',
          severity: overBy > 20 ? 'critical' : 'warning',
          message: `Vehicle ${params.plateNumber} is overspeeding at ${Math.round(params.speed)} km/h (Limit: ${effectiveLimit} km/h, +${overBy} km/h)`,
          lat: params.location.lat,
          lng: params.location.lng,
          speed: params.speed,
        });
      }
    }

    // 2. GEOFENCE RULES (Entry & Exit detection with state transitions)
    for (const fence of params.geofences) {
      let isInside = false;

      if (fence.type === 'circle') {
        isInside = isPointInCircle(
          params.location,
          { lat: fence.centerLat, lng: fence.centerLng },
          fence.radiusMeters
        );
      } else if (fence.type === 'polygon' && fence.polygonGeoJson) {
        try {
          const polyCoords = JSON.parse(fence.polygonGeoJson);
          isInside = isPointInPolygon(params.location, polyCoords);
        } catch {
          isInside = false;
        }
      }

      const fenceKey = `${params.vehicleId}:${fence.id}`;
      const wasInside = state.previousGeofenceStates[fenceKey];

      // Detect transition from outside to inside (ENTRY)
      if (wasInside === false && isInside === true && fence.alertOnEntry) {
        alerts.push({
          type: 'geofence_entry',
          severity: 'info',
          message: `Vehicle ${params.plateNumber} entered geofence "${fence.name}"`,
          lat: params.location.lat,
          lng: params.location.lng,
          speed: params.speed,
        });
      }

      // Detect transition from inside to outside (EXIT)
      if (wasInside === true && isInside === false && fence.alertOnExit) {
        alerts.push({
          type: 'geofence_exit',
          severity: 'warning',
          message: `Vehicle ${params.plateNumber} exited geofence "${fence.name}"`,
          lat: params.location.lat,
          lng: params.location.lng,
          speed: params.speed,
        });
      }

      // Update state for next cycle
      state.previousGeofenceStates[fenceKey] = isInside;
    }

    // 3. IDLE DETECTION (Stationary > N minutes)
    const idleLimitMinutes = params.idleThresholdMinutes || 5;
    const idleDurationMs = now - state.lastMoveTime;
    if (params.speed < 2 && idleDurationMs > idleLimitMinutes * 60 * 1000) {
      const alertKey = `idle:${params.vehicleId}`;
      const lastSent = state.lastAlertTime[alertKey] || 0;
      if (now - lastSent > this.debounceWindowMs * 3) {
        // Debounce idle alerts every 3 mins
        state.lastAlertTime[alertKey] = now;
        const minutesIdle = Math.round(idleDurationMs / (60 * 1000));
        alerts.push({
          type: 'idle',
          severity: 'info',
          message: `Vehicle ${params.plateNumber} has been idling stationary for ${minutesIdle} minutes`,
          lat: params.location.lat,
          lng: params.location.lng,
          speed: params.speed,
        });
      }
    }

    return alerts;
  }

  /**
   * Reset cache (useful for testing)
   */
  public resetCache(): void {
    this.cache.clear();
  }
}

export const ruleEngine = new FleetRuleEngine();
