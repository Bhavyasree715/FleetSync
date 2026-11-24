import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const geofenceSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['circle', 'polygon']),
  centerLat: z.number(),
  centerLng: z.number(),
  radiusMeters: z.number().default(500),
  polygonGeoJson: z.string().optional(),
  alertOnEntry: z.boolean().default(true),
  alertOnExit: z.boolean().default(true),
  color: z.string().default('#3b82f6'),
  isActive: z.boolean().default(true),
});

export const getGeofences = async (req: AuthRequest, res: Response) => {
  try {
    const geofences = await prisma.geofence.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ geofences });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve geofences.' });
  }
};

export const createGeofence = async (req: AuthRequest, res: Response) => {
  try {
    const validated = geofenceSchema.parse(req.body);
    const geofence = await prisma.geofence.create({
      data: validated,
    });

    const io = req.app.get('io');
    if (io) io.emit('geofence:created', geofence);

    res.status(201).json({ geofence });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create geofence.' });
  }
};

export const updateGeofence = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validated = geofenceSchema.partial().parse(req.body);

    const geofence = await prisma.geofence.update({
      where: { id },
      data: validated,
    });

    const io = req.app.get('io');
    if (io) io.emit('geofence:updated', geofence);

    res.json({ geofence });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update geofence.' });
  }
};

export const deleteGeofence = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.geofence.delete({ where: { id } });

    const io = req.app.get('io');
    if (io) io.emit('geofence:deleted', { id });

    res.json({ message: 'Geofence deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete geofence.' });
  }
};
