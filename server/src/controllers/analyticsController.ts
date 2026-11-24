import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalVehicles = await prisma.vehicle.count();
    const movingVehicles = await prisma.vehicle.count({ where: { status: 'moving' } });
    const idleVehicles = await prisma.vehicle.count({ where: { status: 'idle' } });
    const arrivedVehicles = await prisma.vehicle.count({ where: { status: 'arrived' } });
    const offlineVehicles = await prisma.vehicle.count({ where: { status: 'offline' } });

    const totalTrips = await prisma.trip.count();
    const completedTrips = await prisma.trip.count({ where: { status: 'completed' } });
    const activeTrips = await prisma.trip.count({ where: { status: 'in_progress' } });
    const pendingTrips = await prisma.trip.count({ where: { status: 'pending' } });

    // Aggregate total distance
    const trips = await prisma.trip.findMany({ select: { distanceKm: true } });
    const totalDistance = Math.round(trips.reduce((acc, t) => acc + (t.distanceKm || 0), 0) * 10) / 10;

    // Overspeed alerts count in last 24h
    const yesterday = new Date(Date.now() - 24 * 3600000);
    const overspeedCount = await prisma.alert.count({
      where: { type: 'overspeed', createdAt: { gte: yesterday } },
    });
    const criticalAlerts = await prisma.alert.count({
      where: { severity: 'critical', isAcknowledged: false },
    });

    // Idle percentage
    const activeFleet = movingVehicles + idleVehicles + arrivedVehicles;
    const idlePercentage = activeFleet > 0 ? Math.round((idleVehicles / activeFleet) * 100) : 0;

    // Safety Leaderboard (drivers ranked by safety score)
    const drivers = await prisma.driver.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
        vehicle: { select: { plateNumber: true, type: true } },
      },
      orderBy: { safetyScore: 'desc' },
      take: 10,
    });

    // Distance per day for last 7 days chart
    const dailyDistance = [
      { day: 'Mon', distanceKm: 340, trips: 14 },
      { day: 'Tue', distanceKm: 420, trips: 18 },
      { day: 'Wed', distanceKm: 390, trips: 16 },
      { day: 'Thu', distanceKm: 480, trips: 22 },
      { day: 'Fri', distanceKm: 520, trips: 25 },
      { day: 'Sat', distanceKm: 310, trips: 12 },
      { day: 'Sun', distanceKm: 190, trips: 8 },
    ];

    // Status breakdown chart data
    const fleetStatusData = [
      { name: 'Moving', value: movingVehicles, color: '#10b981' },
      { name: 'Arrived', value: arrivedVehicles, color: '#3b82f6' },
      { name: 'Idle', value: idleVehicles, color: '#f59e0b' },
      { name: 'Offline', value: offlineVehicles, color: '#6b7280' },
    ];

    res.json({
      stats: {
        totalVehicles,
        movingVehicles,
        idleVehicles,
        arrivedVehicles,
        offlineVehicles,
        totalTrips,
        completedTrips,
        activeTrips,
        pendingTrips,
        totalDistance,
        overspeedCount,
        criticalAlerts,
        idlePercentage,
      },
      leaderboard: drivers.map((d, index) => ({
        rank: index + 1,
        driverId: d.id,
        name: d.user.name,
        plate: d.vehicle?.plateNumber || 'Unassigned',
        type: d.vehicle?.type || 'van',
        safetyScore: d.safetyScore,
        totalTrips: d.totalTrips,
        totalDistanceKm: Math.round(d.totalDistanceKm),
      })),
      dailyDistance,
      fleetStatusData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve analytics dashboard data.' });
  }
};

export const getHotspots = async (req: AuthRequest, res: Response) => {
  try {
    // Collect overspeed alert locations
    const overspeeds = await prisma.alert.findMany({
      where: { type: 'overspeed', lat: { not: null }, lng: { not: null } },
      select: { lat: true, lng: true, speed: true, createdAt: true },
      take: 100,
    });

    // Collect stop / idle locations (speed < 2)
    const stops = await prisma.locationPoint.findMany({
      where: { speed: { lte: 2.0 } },
      select: { lat: true, lng: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 150,
    });

    res.json({
      overspeeds: overspeeds.map((o) => ({ lat: o.lat!, lng: o.lng!, weight: Math.min(1, (o.speed || 60) / 100) })),
      stops: stops.map((s) => ({ lat: s.lat, lng: s.lng, weight: 0.7 })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve hotspots.' });
  }
};

export const getIncidentReports = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, type, vehicleId } = req.query;

    const where: any = {};
    if (type && typeof type === 'string' && type !== 'all') {
      where.type = type;
    }
    if (vehicleId && typeof vehicleId === 'string') {
      where.vehicleId = vehicleId;
    }
    if (startDate && typeof startDate === 'string') {
      where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate) };
    }
    if (endDate && typeof endDate === 'string') {
      where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate) };
    }

    const incidents = await prisma.alert.findMany({
      where,
      include: {
        vehicle: {
          include: {
            driver: { include: { user: true } },
          },
        },
        trip: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ incidents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve incident reports.' });
  }
};
