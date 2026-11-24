import { describe, it, expect, beforeEach } from 'vitest';
import { FleetRuleEngine } from '../services/ruleEngine';

describe('FleetRuleEngine Unit Tests', () => {
  let engine: FleetRuleEngine;

  beforeEach(() => {
    engine = new FleetRuleEngine();
    engine.resetCache();
  });

  it('should trigger overspeed alert when speed exceeds configured limit', () => {
    const alerts = engine.evaluateRules({
      vehicleId: 'veh-test-1',
      plateNumber: 'TN-01-AB-1234',
      speed: 78.5,
      speedLimit: 60,
      location: { lat: 13.0600, lng: 80.2500 },
      geofences: [],
    });

    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe('overspeed');
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].speed).toBe(78.5);
    expect(alerts[0].message).toContain('79 km/h');
  });

  it('should NOT trigger overspeed alert when speed is within limit', () => {
    const alerts = engine.evaluateRules({
      vehicleId: 'veh-test-2',
      plateNumber: 'TN-02-CD-5678',
      speed: 55,
      speedLimit: 60,
      location: { lat: 13.0600, lng: 80.2500 },
      geofences: [],
    });

    expect(alerts.length).toBe(0);
  });

  it('should trigger critical severity when speed is more than 20 km/h above limit', () => {
    const alerts = engine.evaluateRules({
      vehicleId: 'veh-test-3',
      plateNumber: 'TN-03-EF-9012',
      speed: 95,
      speedLimit: 60,
      location: { lat: 13.0600, lng: 80.2500 },
      geofences: [],
    });

    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('critical');
  });

  it('should debounce overspeed alerts to prevent spamming within debounce window', () => {
    // First evaluation triggers alert
    const firstAlerts = engine.evaluateRules({
      vehicleId: 'veh-test-4',
      plateNumber: 'TN-04-GH-3456',
      speed: 75,
      speedLimit: 60,
      location: { lat: 13.0600, lng: 80.2500 },
      geofences: [],
    });
    expect(firstAlerts.length).toBe(1);

    // Immediate second update should be debounced
    const secondAlerts = engine.evaluateRules({
      vehicleId: 'veh-test-4',
      plateNumber: 'TN-04-GH-3456',
      speed: 77,
      speedLimit: 60,
      location: { lat: 13.0605, lng: 80.2505 },
      geofences: [],
    });
    expect(secondAlerts.length).toBe(0);
  });

  it('should detect geofence entry and exit transitions', () => {
    const circularFence = {
      id: 'fence-1',
      name: 'Central Logistics Yard',
      type: 'circle',
      centerLat: 13.0600,
      centerLng: 80.2500,
      radiusMeters: 500,
      alertOnEntry: true,
      alertOnExit: true,
    };

    // 1. Initial point OUTSIDE (distance > 500m)
    engine.evaluateRules({
      vehicleId: 'veh-test-5',
      plateNumber: 'TN-05-JK-7890',
      speed: 40,
      speedLimit: 60,
      location: { lat: 13.0800, lng: 80.2700 }, // ~3km away
      geofences: [circularFence],
    });

    // 2. Next point INSIDE (distance < 500m) -> triggers entry alert
    const entryAlerts = engine.evaluateRules({
      vehicleId: 'veh-test-5',
      plateNumber: 'TN-05-JK-7890',
      speed: 30,
      speedLimit: 60,
      location: { lat: 13.0601, lng: 80.2501 }, // ~20m from center
      geofences: [circularFence],
    });

    expect(entryAlerts.some((a) => a.type === 'geofence_entry')).toBe(true);

    // 3. Next point moves back OUTSIDE -> triggers exit alert
    const exitAlerts = engine.evaluateRules({
      vehicleId: 'veh-test-5',
      plateNumber: 'TN-05-JK-7890',
      speed: 35,
      speedLimit: 60,
      location: { lat: 13.0900, lng: 80.2900 }, // moved outside
      geofences: [circularFence],
    });

    expect(exitAlerts.some((a) => a.type === 'geofence_exit')).toBe(true);
  });
});
