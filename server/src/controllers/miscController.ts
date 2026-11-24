import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

// Configure Web Push VAPID keys if set
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@fleetsync.local';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && !VAPID_PRIVATE_KEY.includes('EXAMPLE')) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.warn('VAPID setup warning:', e);
  }
}

// 1. Settings
export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.ruleSettings.findUnique({
      where: { id: 'global-settings' },
    });
    if (!settings) {
      settings = await prisma.ruleSettings.create({
        data: { id: 'global-settings' },
      });
    }
    res.json({ settings, vapidPublicKey: VAPID_PUBLIC_KEY });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings.' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const settings = await prisma.ruleSettings.upsert({
      where: { id: 'global-settings' },
      update: data,
      create: { id: 'global-settings', ...data },
    });

    const io = req.app.get('io');
    if (io) io.emit('settings:updated', settings);

    res.json({ message: 'Settings saved.', settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
};

// 2. Web Push Subscriptions
export const subscribeWebPush = async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid push subscription payload.' });
    }

    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: req.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId: req.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    res.json({ message: 'Web Push subscription registered.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save push subscription.' });
  }
};

// 3. Maintenance Logs
export const getMaintenanceLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId } = req.query;
    const where: any = {};
    if (vehicleId && typeof vehicleId === 'string') where.vehicleId = vehicleId;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { scheduledDate: 'desc' },
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get maintenance logs.' });
  }
};

export const createMaintenanceLog = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, serviceType, scheduledKm, actualKm, scheduledDate, cost, status, notes } = req.body;
    const log = await prisma.maintenanceLog.create({
      data: {
        vehicleId,
        serviceType,
        scheduledKm: scheduledKm ? Number(scheduledKm) : null,
        actualKm: actualKm ? Number(actualKm) : null,
        scheduledDate: new Date(scheduledDate),
        cost: Number(cost || 0),
        status: status || 'scheduled',
        notes,
      },
      include: { vehicle: true },
    });
    res.status(201).json({ log });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create maintenance log.' });
  }
};

// 4. Fuel Logs
export const getFuelLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId } = req.query;
    const where: any = {};
    if (vehicleId && typeof vehicleId === 'string') where.vehicleId = vehicleId;

    const logs = await prisma.fuelLog.findMany({
      where,
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
      orderBy: { filledAt: 'desc' },
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get fuel logs.' });
  }
};

export const createFuelLog = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, driverId, liters, totalCost, odometerKm, station, receiptUrl } = req.body;
    const log = await prisma.fuelLog.create({
      data: {
        vehicleId,
        driverId: driverId || req.user?.driverId!,
        liters: Number(liters),
        totalCost: Number(totalCost),
        odometerKm: Number(odometerKm),
        station,
        receiptUrl,
      },
      include: { vehicle: true },
    });
    res.status(201).json({ log });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log fuel refill.' });
  }
};

// 5. Trip Chat Messages
export const getTripMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const messages = await prisma.message.findMany({
      where: { tripId },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages.' });
  }
};

export const sendTripMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { tripId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const message = await prisma.message.create({
      data: {
        tripId,
        senderId: req.user!.id,
        content: content.trim(),
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit(`trip:${tripId}:message`, message);
    }

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message.' });
  }
};
