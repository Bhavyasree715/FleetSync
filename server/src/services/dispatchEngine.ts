import { Coordinates, calculateHaversineDistance, estimateTravelTimeMinutes } from '../utils/haversine';
import { getRoadRoute } from '../utils/osrm';

export interface DispatchCandidate {
  vehicleId: string;
  plateNumber: string;
  model: string;
  type: string;
  status: string;
  driverName?: string;
  driverPhone?: string;
  safetyScore?: number;
  currentLat: number;
  currentLng: number;
  batteryLevel?: number | null;
  directDistanceKm: number;
  roadDistanceKm?: number;
  estimatedArrivalMin: number;
  rankingScore: number; // lower is better (combined distance, score & status)
}

/**
 * Calculates rankings of available vehicles for a trip dispatch request.
 */
export async function rankVehiclesForDispatch(params: {
  pickup: Coordinates;
  vehicles: Array<{
    id: string;
    plateNumber: string;
    model: string;
    type: string;
    status: string;
    currentLat: number | null;
    currentLng: number | null;
    batteryLevel?: number | null;
    driver?: {
      user: {
        name: string;
        phone?: string | null;
      };
      safetyScore: number;
      onDuty: boolean;
    } | null;
  }>;
  requiredType?: string;
  fetchRoadDistance?: boolean;
}): Promise<DispatchCandidate[]> {
  const { pickup, vehicles, requiredType, fetchRoadDistance = false } = params;

  // Filter out vehicles that are offline or don't have valid coordinates
  const eligible = vehicles.filter((v) => {
    if (!v.currentLat || !v.currentLng) return false;
    if (v.status === 'offline') return false;
    if (requiredType && v.type !== requiredType) return false;
    return true;
  });

  const rankedCandidates: DispatchCandidate[] = [];

  for (const v of eligible) {
    const vCoords: Coordinates = {
      lat: v.currentLat!,
      lng: v.currentLng!,
    };

    const directDist = calculateHaversineDistance(vCoords, pickup);
    let roadDist = Math.round(directDist * 1.3 * 100) / 100;
    let etaMin = estimateTravelTimeMinutes(roadDist, 35);

    if (fetchRoadDistance && directDist < 50) {
      try {
        const route = await getRoadRoute(vCoords, pickup);
        roadDist = route.distanceKm;
        etaMin = route.durationMin;
      } catch {
        // fallback already set
      }
    }

    // Scoring formula: prioritize closer vehicles, penalize busy/moving vs idle, reward safety score
    // Lower score is ranked first
    const statusPenalty = v.status === 'idle' ? 0 : v.status === 'arrived' ? 2 : 10;
    const safetyBonus = ((v.driver?.safetyScore || 85) - 50) / 50; // 0 to 1
    const rankingScore = Math.round((roadDist * 2 + statusPenalty - safetyBonus * 2) * 10) / 10;

    rankedCandidates.push({
      vehicleId: v.id,
      plateNumber: v.plateNumber,
      model: v.model,
      type: v.type,
      status: v.status,
      driverName: v.driver?.user?.name,
      driverPhone: v.driver?.user?.phone || undefined,
      safetyScore: v.driver?.safetyScore || 85,
      currentLat: v.currentLat!,
      currentLng: v.currentLng!,
      batteryLevel: v.batteryLevel,
      directDistanceKm: directDist,
      roadDistanceKm: roadDist,
      estimatedArrivalMin: etaMin,
      rankingScore,
    });
  }

  // Sort ascending by ranking score (best candidate first)
  rankedCandidates.sort((a, b) => a.rankingScore - b.rankingScore);

  return rankedCandidates;
}
