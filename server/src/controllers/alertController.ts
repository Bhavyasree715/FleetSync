import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const { type, severity, isAcknowledged, vehicleId } = req.query;

    const where: any = {};
    if (type && typeof type === 'string' && type !== 'all') {
      where.type = type;
    }
    if (severity && typeof severity === 'string' && severity !== 'all') {
      where.severity = severity;
    }
    if (isAcknowledged !== undefined && isAcknowledged !== 'all') {
      where.isAcknowledged = isAcknowledged === 'true';
    }
    if (vehicleId && typeof vehicleId === 'string') {
      where.vehicleId = vehicleId;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        vehicle: {
          select: { plateNumber: true, model: true, type: true, currentLat: true, currentLng: true },
        },
        trip: {
          select: { id: true, trackingCode: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const unreadCount = await prisma.alert.count({
      where: { isAcknowledged: false },
    });

    res.json({ alerts, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve alerts.' });
  }
};

export const acknowledgeAlert = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.update({
      where: { id },
      data: {
        isAcknowledged: true,
        acknowledgedBy: req.user?.name || 'Manager',
        acknowledgedAt: new Date(),
      },
      include: { vehicle: true },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('alert:acknowledged', alert);
    }

    res.json({ message: 'Alert acknowledged.', alert });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge alert.' });
  }
};

export const acknowledgeAllAlerts = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.alert.updateMany({
      where: { isAcknowledged: false },
      data: {
        isAcknowledged: true,
        acknowledgedBy: req.user?.name || 'Manager',
        acknowledgedAt: new Date(),
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('alert:all_acknowledged');
    }

    res.json({ message: 'All active alerts acknowledged.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge all alerts.' });
  }
};

export const createSosAlert = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, lat, lng, speed, note } = req.body;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId || req.user?.vehicleId },
    });

    const plate = vehicle?.plateNumber || 'Vehicle';
    const message = `CRITICAL SOS: Driver ${req.user?.name || ''} triggered Emergency Breakdown Alert! ${note ? `Note: ${note}` : ''}`;

    const alert = await prisma.alert.create({
      data: {
        type: 'sos',
        severity: 'critical',
        message,
        vehicleId: vehicle?.id || null,
        lat: lat || vehicle?.currentLat,
        lng: lng || vehicle?.currentLng,
        speed: speed || vehicle?.currentSpeed,
      },
      include: { vehicle: true },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('alert:new', alert);
      io.emit('vehicle:sos', {
        vehicleId: vehicle?.id,
        plateNumber: plate,
        lat: alert.lat,
        lng: alert.lng,
      });
    }

    res.status(201).json({ message: 'Emergency SOS alert broadcasted to dispatch!', alert });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger SOS alert.' });
  }
};
