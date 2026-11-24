import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { ruleEngine } from './ruleEngine';

export interface SimulatedVehicle {
  id: string;
  plateNumber: string;
  model: string;
  type: string;
  status: 'moving' | 'idle' | 'arrived' | 'offline';
  speedLimit: number;
  currentLat: number;
  currentLng: number;
  currentSpeed: number;
  currentHeading: number;
  batteryLevel: number;
  accuracy: number;
  driverName: string;
  routeWaypoints: [number, number][];
  currentWaypointIndex: number;
  speedMultiplier: number;
}

// Preset realistic road routes in Chennai / Urban tech corridor
const SAMPLE_ROUTES: { name: string; type: string; waypoints: [number, number][] }[] = [
  {
    name: 'OMR Express (Sholinganallur to Tidel Park)',
    type: 'truck',
    waypoints: [
      [12.9010, 80.2279],
      [12.9150, 80.2310],
      [12.9300, 80.2370],
      [12.9550, 80.2440],
      [12.9780, 80.2510],
      [12.9900, 80.2450],
      [12.9780, 80.2510],
      [12.9300, 80.2370],
    ],
  },
  {
    name: 'Airport Corridor (Guindy to Meenambakkam)',
    type: 'van',
    waypoints: [
      [13.0067, 80.2025],
      [12.9980, 80.1910],
      [12.9850, 80.1780],
      [12.9780, 80.1650],
      [12.9850, 80.1780],
      [13.0067, 80.2025],
    ],
  },
  {
    name: 'Anna Salai Central Line',
    type: 'car',
    waypoints: [
      [13.0400, 80.2500],
      [13.0520, 80.2580],
      [13.0650, 80.2640],
      [13.0827, 80.2707],
      [13.0650, 80.2640],
      [13.0400, 80.2500],
    ],
  },
  {
    name: 'Marina Beach Coastal Delivery',
    type: 'bike',
    waypoints: [
      [13.0500, 80.2824],
      [13.0600, 80.2840],
      [13.0750, 80.2860],
      [13.0850, 80.2890],
      [13.0750, 80.2860],
      [13.0500, 80.2824],
    ],
  },
  {
    name: 'Koyambedu Logistics Hub',
    type: 'truck',
    waypoints: [
      [13.0694, 80.1948],
      [13.0600, 80.1980],
      [13.0450, 80.2050],
      [13.0300, 80.2100],
      [13.0450, 80.2050],
      [13.0694, 80.1948],
    ],
  },
  {
    name: 'Porur to Vadapalani Ring',
    type: 'van',
    waypoints: [
      [13.0350, 80.1580],
      [13.0420, 80.1750],
      [13.0500, 80.1950],
      [13.0520, 80.2100],
      [13.0420, 80.1750],
      [13.0350, 80.1580],
    ],
  },
  {
    name: 'Velachery Tech Park Loop',
    type: 'car',
    waypoints: [
      [12.9750, 80.2200],
      [12.9820, 80.2150],
      [12.9900, 80.2180],
      [12.9850, 80.2250],
      [12.9750, 80.2200],
    ],
  },
  {
    name: 'Tambaram Highway Dispatch',
    type: 'truck',
    waypoints: [
      [12.9250, 80.1200],
      [12.9400, 80.1350],
      [12.9550, 80.1450],
      [12.9700, 80.1600],
      [12.9550, 80.1450],
      [12.9250, 80.1200],
    ],
  },
];

export class FleetSimulationEngine {
  private io: Server | null = null;
  private prisma: PrismaClient | null = null;
  private isRunning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private simulatedVehicles: Map<string, SimulatedVehicle> = new Map();

  public init(io: Server, prisma: PrismaClient) {
    this.io = io;
    this.prisma = prisma;
  }

  public async startSimulation(): Promise<boolean> {
    if (this.isRunning) return true;
    if (!this.prisma) return false;

    // Load active vehicles from database or map them
    const dbVehicles = await this.prisma.vehicle.findMany({
      include: { driver: { include: { user: true } } },
      take: 10,
    });

    this.simulatedVehicles.clear();

    dbVehicles.forEach((v, index) => {
      const route = SAMPLE_ROUTES[index % SAMPLE_ROUTES.length];
      const startPoint = route.waypoints[0];

      this.simulatedVehicles.set(v.id, {
        id: v.id,
        plateNumber: v.plateNumber,
        model: v.model,
        type: v.type,
        status: 'moving',
        speedLimit: v.speedLimit,
        currentLat: v.currentLat || startPoint[0],
        currentLng: v.currentLng || startPoint[1],
        currentSpeed: 35 + Math.random() * 15,
        currentHeading: 45,
        batteryLevel: Math.floor(75 + Math.random() * 25),
        accuracy: 3.5,
        driverName: v.driver?.user.name || `Driver ${index + 1}`,
        routeWaypoints: route.waypoints,
        currentWaypointIndex: 0,
        speedMultiplier: 1.0,
      });
    });

    this.isRunning = true;
    console.log(`🚀 Fleet Simulation started with ${this.simulatedVehicles.size} active vehicles.`);

    // Run tick every 3 seconds
    this.intervalTimer = setInterval(() => this.tick(), 3000);
    return true;
  }

  public stopSimulation(): boolean {
    if (!this.isRunning) return false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
    console.log('🛑 Fleet Simulation stopped.');
    return true;
  }

  public isSimulating(): boolean {
    return this.isRunning;
  }

  /**
   * Spikes speed to 90-105 km/h for demo purposes
   */
  public triggerOverspeed(vehicleId?: string): { success: boolean; plateNumber?: string; speed?: number } {
    let target: SimulatedVehicle | undefined;
    if (vehicleId && this.simulatedVehicles.has(vehicleId)) {
      target = this.simulatedVehicles.get(vehicleId);
    } else {
      // Pick first moving vehicle
      target = Array.from(this.simulatedVehicles.values())[0];
    }

    if (!target) return { success: false };

    target.currentSpeed = 92 + Math.floor(Math.random() * 12);
    target.speedMultiplier = 2.0;

    // Immediately trigger tick to evaluate rule engine
    this.tick();

    return {
      success: true,
      plateNumber: target.plateNumber,
      speed: Math.round(target.currentSpeed),
    };
  }

  /**
   * Triggers an emergency SOS alert for a vehicle
   */
  public async triggerSos(vehicleId?: string): Promise<{ success: boolean; plateNumber?: string }> {
    if (!this.prisma || !this.io) return { success: false };

    let target: SimulatedVehicle | undefined;
    if (vehicleId && this.simulatedVehicles.has(vehicleId)) {
      target = this.simulatedVehicles.get(vehicleId);
    } else {
      target = Array.from(this.simulatedVehicles.values())[0];
    }

    if (!target) return { success: false };

    const alert = await this.prisma.alert.create({
      data: {
        type: 'sos',
        severity: 'critical',
        message: `EMERGENCY SOS: Driver of ${target.plateNumber} triggered breakdown / panic button! Immediate assistance required!`,
        vehicleId: target.id,
        lat: target.currentLat,
        lng: target.currentLng,
        speed: target.currentSpeed,
      },
      include: { vehicle: true },
    });

    this.io.emit('alert:new', alert);
    this.io.emit('vehicle:sos', {
      vehicleId: target.id,
      plateNumber: target.plateNumber,
      lat: target.currentLat,
      lng: target.currentLng,
    });

    return { success: true, plateNumber: target.plateNumber };
  }

  private async tick() {
    if (!this.prisma || !this.io) return;

    // Fetch geofences once per tick or keep cached
    const geofences = await this.prisma.geofence.findMany({ where: { isActive: true } });

    for (const [id, vehicle] of this.simulatedVehicles) {
      // Move vehicle towards next waypoint
      const waypoints = vehicle.routeWaypoints;
      const targetWaypoint = waypoints[vehicle.currentWaypointIndex];

      const latDiff = targetWaypoint[0] - vehicle.currentLat;
      const lngDiff = targetWaypoint[1] - vehicle.currentLng;
      const distanceToTarget = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      if (distanceToTarget < 0.001) {
        // Waypoint reached, cycle to next
        vehicle.currentWaypointIndex = (vehicle.currentWaypointIndex + 1) % waypoints.length;
      } else {
        // Move small delta (approx ~40 km/h)
        const stepSize = 0.0006 * vehicle.speedMultiplier;
        vehicle.currentLat += (latDiff / distanceToTarget) * stepSize;
        vehicle.currentLng += (lngDiff / distanceToTarget) * stepSize;

        // Calculate heading in degrees
        const angle = (Math.atan2(lngDiff, latDiff) * 180) / Math.PI;
        vehicle.currentHeading = (angle + 360) % 360;

        // Modulate speed realistic fluctuation
        if (vehicle.speedMultiplier > 1.0) {
          vehicle.speedMultiplier = Math.max(1.0, vehicle.speedMultiplier - 0.1);
        } else {
          vehicle.currentSpeed = Math.min(
            vehicle.speedLimit + 5,
            Math.max(25, vehicle.currentSpeed + (Math.random() * 6 - 3))
          );
        }
      }

      // Battery slow drain
      if (Math.random() < 0.05 && vehicle.batteryLevel > 20) {
        vehicle.batteryLevel -= 1;
      }

      // 1. Evaluate Rule Engine on this position
      const triggeredAlerts = ruleEngine.evaluateRules({
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        speed: vehicle.currentSpeed,
        speedLimit: vehicle.speedLimit,
        location: { lat: vehicle.currentLat, lng: vehicle.currentLng },
        geofences,
      });

      // Save and broadcast any triggered alerts
      for (const alertData of triggeredAlerts) {
        const savedAlert = await this.prisma.alert.create({
          data: {
            type: alertData.type,
            severity: alertData.severity,
            message: alertData.message,
            vehicleId: vehicle.id,
            lat: alertData.lat,
            lng: alertData.lng,
            speed: alertData.speed,
          },
          include: { vehicle: true },
        });

        this.io.emit('alert:new', savedAlert);
      }

      // 2. Persist updated vehicle position in DB
      await this.prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          currentLat: vehicle.currentLat,
          currentLng: vehicle.currentLng,
          currentSpeed: Math.round(vehicle.currentSpeed * 10) / 10,
          currentHeading: Math.round(vehicle.currentHeading),
          batteryLevel: vehicle.batteryLevel,
          status: vehicle.currentSpeed > 3 ? 'moving' : 'idle',
          lastActiveAt: new Date(),
        },
      });

      // Store in LocationPoint history for replay
      await this.prisma.locationPoint.create({
        data: {
          vehicleId: vehicle.id,
          lat: vehicle.currentLat,
          lng: vehicle.currentLng,
          speed: vehicle.currentSpeed,
          heading: vehicle.currentHeading,
          accuracy: vehicle.accuracy,
          battery: vehicle.batteryLevel,
        },
      });

      // 3. Emit real-time update to all connected managers
      this.io.emit('vehicle:update', {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        type: vehicle.type,
        status: vehicle.currentSpeed > 3 ? 'moving' : 'idle',
        speed: Math.round(vehicle.currentSpeed * 10) / 10,
        speedLimit: vehicle.speedLimit,
        heading: Math.round(vehicle.currentHeading),
        lat: vehicle.currentLat,
        lng: vehicle.currentLng,
        batteryLevel: vehicle.batteryLevel,
        accuracy: vehicle.accuracy,
        lastActiveAt: new Date().toISOString(),
      });
    }
  }
}

export const simulationEngine = new FleetSimulationEngine();
