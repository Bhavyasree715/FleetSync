import { describe, it, expect } from 'vitest';
import { calculateHaversineDistance, estimateTravelTimeMinutes } from '../utils/haversine';
import { rankVehiclesForDispatch } from '../services/dispatchEngine';

describe('Haversine Distance & Dispatch Engine Unit Tests', () => {
  it('should accurately calculate distance between known coordinates', () => {
    // Chennai Central (13.0827, 80.2707) to Guindy (13.0067, 80.2025) ~11-12 km
    const distance = calculateHaversineDistance(
      { lat: 13.0827, lng: 80.2707 },
      { lat: 13.0067, lng: 80.2025 }
    );

    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(14);
  });

  it('should return 0 distance for identical points', () => {
    const dist = calculateHaversineDistance(
      { lat: 13.0000, lng: 80.0000 },
      { lat: 13.0000, lng: 80.0000 }
    );
    expect(dist).toBe(0);
  });

  it('should estimate realistic travel duration in minutes', () => {
    // 20 km at 40 km/h = 30 minutes
    const duration = estimateTravelTimeMinutes(20, 40);
    expect(duration).toBe(30);
  });

  it('should rank available vehicles by distance and driver safety score', async () => {
    const pickup = { lat: 13.0500, lng: 80.2500 };

    const candidateVehicles = [
      {
        id: 'v-far',
        plateNumber: 'TN-01-FAR',
        model: 'Truck',
        type: 'truck',
        status: 'idle',
        currentLat: 12.9000, // far (~17 km)
        currentLng: 80.2200,
        batteryLevel: 90,
        driver: {
          user: { name: 'Driver Far', phone: '123' },
          safetyScore: 85,
          onDuty: true,
        },
      },
      {
        id: 'v-near',
        plateNumber: 'TN-02-NEAR',
        model: 'Van',
        type: 'van',
        status: 'idle',
        currentLat: 13.0520, // very close (~0.3 km)
        currentLng: 80.2510,
        batteryLevel: 95,
        driver: {
          user: { name: 'Driver Near', phone: '456' },
          safetyScore: 92,
          onDuty: true,
        },
      },
      {
        id: 'v-offline',
        plateNumber: 'TN-03-OFFLINE',
        model: 'Car',
        type: 'car',
        status: 'offline', // should be excluded
        currentLat: 13.0510,
        currentLng: 80.2505,
        driver: null,
      },
    ];

    const ranked = await rankVehiclesForDispatch({
      pickup,
      vehicles: candidateVehicles,
      fetchRoadDistance: false,
    });

    // Offline vehicle must be filtered out
    expect(ranked.some((r) => r.plateNumber === 'TN-03-OFFLINE')).toBe(false);

    // Nearest vehicle must be ranked #1
    expect(ranked.length).toBe(2);
    expect(ranked[0].plateNumber).toBe('TN-02-NEAR');
    expect(ranked[0].directDistanceKm).toBeLessThan(1.0);
    expect(ranked[1].plateNumber).toBe('TN-01-FAR');
  });
});
