import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { ruleEngine } from '../services/ruleEngine';

const prisma = new PrismaClient();

export const updateLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, tripId, lat, lng, speed, heading, accuracy, battery } = req.body;

    const targetVehicleId = vehicleId || req.user?.vehicleId;
    if (!targetVehicleId || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'vehicleId, lat, and lng are required.' });
    }

    // Filter out low accuracy GPS jumps (> 50m)
    if (accuracy && accuracy > 50) {
      return res.status(200).json({ message: 'Discarded low-accuracy jump.' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: targetVehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    const newStatus = speed > 3 ? 'moving' : 'idle';

    // 1. Update Vehicle record
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: targetVehicleId },
      data: {
        currentLat: lat,
        currentLng: lng,
        currentSpeed: speed || 0.0,
        currentHeading: heading || 0.0,
        batteryLevel: battery !== undefined ? battery : vehicle.batteryLevel,
        accuracy: accuracy || 5.0,
        status: newStatus,
        lastActiveAt: new Date(),
      },
    });

    // 2. Insert into location history
    await prisma.locationPoint.create({
      data: {
        vehicleId: targetVehicleId,
        tripId: tripId || null,
        lat,
        lng,
        speed: speed || 0.0,
        heading: heading || 0.0,
        accuracy: accuracy || 5.0,
        battery,
      },
    });

    // 3. Evaluate Rule Engine
    const geofences = await prisma.geofence.findMany({ where: { isActive: true } });
    const triggered = ruleEngine.evaluateRules({
      vehicleId: targetVehicleId,
      plateNumber: vehicle.plateNumber,
      speed: speed || 0.0,
      speedLimit: vehicle.speedLimit,
      location: { lat, lng },
      geofences,
    });

    const io = req.app.get('io');

    for (const item of triggered) {
      const alert = await prisma.alert.create({
        data: {
          type: item.type,
          severity: item.severity,
          message: item.message,
          vehicleId: targetVehicleId,
          lat: item.lat,
          lng: item.lng,
          speed: item.speed,
        },
        include: { vehicle: true },
      });
      if (io) io.emit('alert:new', alert);
    }

    // 4. Broadcast live vehicle update to managers
    if (io) {
      io.emit('vehicle:update', {
        vehicleId: targetVehicleId,
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        type: vehicle.type,
        status: newStatus,
        speed: speed || 0.0,
        speedLimit: vehicle.speedLimit,
        heading: heading || 0.0,
        lat,
        lng,
        batteryLevel: updatedVehicle.batteryLevel,
        accuracy: updatedVehicle.accuracy,
        lastActiveAt: updatedVehicle.lastActiveAt?.toISOString(),
      });
    }

    res.json({ success: true, vehicle: updatedVehicle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record location.' });
  }
};

// Batch endpoint for syncing offline queued GPS points from IndexedDB
export const batchSyncLocations = async (req: AuthRequest, res: Response) => {
  try {
    const { points } = req.body;
    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: 'No points provided.' });
    }

    console.log(`📦 Received batch sync of ${points.length} offline GPS points.`);

    for (const pt of points) {
      if (!pt.vehicleId || pt.lat === undefined || pt.lng === undefined) continue;

      await prisma.locationPoint.create({
        data: {
          vehicleId: pt.vehicleId,
          tripId: pt.tripId || null,
          lat: pt.lat,
          lng: pt.lng,
          speed: pt.speed || 0.0,
          heading: pt.heading || 0.0,
          accuracy: pt.accuracy || 5.0,
          battery: pt.battery,
          timestamp: pt.timestamp ? new Date(pt.timestamp) : new Date(),
        },
      });
    }

    // Update vehicle to last point
    const lastPoint = points[points.length - 1];
    if (lastPoint && lastPoint.vehicleId) {
      await prisma.vehicle.update({
        where: { id: lastPoint.vehicleId },
        data: {
          currentLat: lastPoint.lat,
          currentLng: lastPoint.lng,
          currentSpeed: lastPoint.speed || 0.0,
          currentHeading: lastPoint.heading || 0.0,
          status: lastPoint.speed > 3 ? 'moving' : 'idle',
          lastActiveAt: new Date(),
        },
      });
    }

    res.json({ success: true, processed: points.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync batch points.' });
  }
};

export const getRouteHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const { tripId, startDate, endDate } = req.query;

    const where: any = { vehicleId };
    if (tripId && typeof tripId === 'string') {
      where.tripId = tripId;
    }
    if (startDate && typeof startDate === 'string') {
      where.timestamp = { ...(where.timestamp || {}), gte: new Date(startDate) };
    }
    if (endDate && typeof endDate === 'string') {
      where.timestamp = { ...(where.timestamp || {}), lte: new Date(endDate) };
    }

    const points = await prisma.locationPoint.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: 1000,
    });

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { driver: { include: { user: true } } },
    });

    res.json({ vehicle, points });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve route history.' });
  }
};
