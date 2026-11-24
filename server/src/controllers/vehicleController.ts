import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const vehicleSchema = z.object({
  plateNumber: z.string().min(3),
  model: z.string().min(2),
  type: z.enum(['truck', 'van', 'car', 'bike']),
  speedLimit: z.number().positive().default(60),
});

export const getVehicles = async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, search } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'all') {
      where.status = status;
    }
    if (type && typeof type === 'string' && type !== 'all') {
      where.type = type;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { plateNumber: { contains: search } },
        { model: { contains: search } },
        { driver: { user: { name: { contains: search } } } },
      ];
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        driver: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        trips: {
          where: { status: 'in_progress' },
          take: 1,
        },
      },
      orderBy: { plateNumber: 'asc' },
    });

    res.json({ vehicles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve fleet vehicles.' });
  }
};

export const getVehicleById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        driver: { include: { user: true } },
        trips: { take: 5, orderBy: { createdAt: 'desc' } },
        alerts: { take: 10, orderBy: { createdAt: 'desc' } },
        maintenanceLogs: { orderBy: { scheduledDate: 'desc' } },
        fuelLogs: { take: 5, orderBy: { filledAt: 'desc' } },
      },
    });

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    res.json({ vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicle details.' });
  }
};

export const createVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const validated = vehicleSchema.parse(req.body);

    const existing = await prisma.vehicle.findUnique({
      where: { plateNumber: validated.plateNumber },
    });
    if (existing) {
      return res.status(400).json({ error: 'Vehicle plate number already registered.' });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        ...validated,
        status: 'idle',
        currentLat: 13.0600,
        currentLng: 80.2200,
      },
    });

    res.status(201).json({ vehicle });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create vehicle.' });
  }
};

export const updateVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { model, type, speedLimit, status } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(model && { model }),
        ...(type && { type }),
        ...(speedLimit !== undefined && { speedLimit: Number(speedLimit) }),
        ...(status && { status }),
      },
    });

    res.json({ vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vehicle.' });
  }
};

export const deleteVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.vehicle.delete({ where: { id } });
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
};
