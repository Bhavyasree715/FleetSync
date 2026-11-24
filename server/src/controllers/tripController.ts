import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { rankVehiclesForDispatch } from '../services/dispatchEngine';
import { getRoadRoute } from '../utils/osrm';

const prisma = new PrismaClient();

const tripSchema = z.object({
  title: z.string().min(2),
  pickupAddress: z.string().min(3),
  pickupLat: z.number(),
  pickupLng: z.number(),
  dropAddress: z.string().min(3),
  dropLat: z.number(),
  dropLng: z.number(),
  priority: z.enum(['low', 'normal', 'urgent']).default('normal'),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  notes: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
});

export const getTrips = async (req: AuthRequest, res: Response) => {
  try {
    const { status, vehicleId, driverId } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'all') {
      where.status = status;
    }
    if (vehicleId && typeof vehicleId === 'string') {
      where.vehicleId = vehicleId;
    }
    if (driverId && typeof driverId === 'string') {
      where.driverId = driverId;
    }

    // If logged in as driver, filter to their driver trips unless querying explicitly
    if (req.user?.role === 'driver' && req.user.driverId) {
      where.driverId = req.user.driverId;
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ trips });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trips.' });
  }
};

export const getTripById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
        locations: { orderBy: { timestamp: 'asc' }, take: 200 },
        alerts: true,
        messages: { include: { sender: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    res.json({ trip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve trip.' });
  }
};

export const createTrip = async (req: AuthRequest, res: Response) => {
  try {
    const validated = tripSchema.parse(req.body);

    // Calculate road route & distance
    const route = await getRoadRoute(
      { lat: validated.pickupLat, lng: validated.pickupLng },
      { lat: validated.dropLat, lng: validated.dropLng }
    );

    const trackingCode = `FS-TRIP-${Math.floor(1000 + Math.random() * 9000)}`;

    const trip = await prisma.trip.create({
      data: {
        trackingCode,
        title: validated.title,
        pickupAddress: validated.pickupAddress,
        pickupLat: validated.pickupLat,
        pickupLng: validated.pickupLng,
        dropAddress: validated.dropAddress,
        dropLat: validated.dropLat,
        dropLng: validated.dropLng,
        priority: validated.priority,
        distanceKm: route.distanceKm,
        estimatedDurationMin: route.durationMin,
        recipientName: validated.recipientName,
        recipientPhone: validated.recipientPhone,
        notes: validated.notes,
        vehicleId: validated.vehicleId || null,
        driverId: validated.driverId || null,
        status: validated.vehicleId ? 'assigned' : 'pending',
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    // Notify connected managers & driver via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('trip:created', trip);
      if (trip.driverId) {
        io.emit(`driver:${trip.driverId}:trip`, trip);
      }
    }

    res.status(201).json({ trip });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to create trip.' });
  }
};

export const rankVehicles = async (req: AuthRequest, res: Response) => {
  try {
    const { pickupLat, pickupLng, requiredType } = req.body;

    if (!pickupLat || !pickupLng) {
      return res.status(400).json({ error: 'Pickup coordinates are required.' });
    }

    const vehicles = await prisma.vehicle.findMany({
      include: {
        driver: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    const ranked = await rankVehiclesForDispatch({
      pickup: { lat: pickupLat, lng: pickupLng },
      vehicles,
      requiredType,
      fetchRoadDistance: true,
    });

    res.json({ candidates: ranked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate vehicle dispatch rankings.' });
  }
};

export const assignTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { vehicleId, driverId } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ error: 'vehicleId is required.' });
    }

    // Determine driver if not explicitly passed
    let assignedDriverId = driverId;
    if (!assignedDriverId) {
      const driver = await prisma.driver.findFirst({
        where: { vehicleId },
      });
      if (driver) assignedDriverId = driver.id;
    }

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        vehicleId,
        driverId: assignedDriverId || null,
        status: 'assigned',
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('trip:assigned', trip);
      if (trip.driverId) {
        io.emit(`driver:${trip.driverId}:trip`, trip);
      }
    }

    res.json({ trip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign trip.' });
  }
};

export const updateTripStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const data: any = { status };
    if (status === 'in_progress') {
      data.startAt = new Date();
    } else if (status === 'completed' || status === 'cancelled') {
      data.endAt = new Date();
      // Calculate actual duration
      const existing = await prisma.trip.findUnique({ where: { id } });
      if (existing?.startAt) {
        const diffMs = Date.now() - new Date(existing.startAt).getTime();
        data.actualDurationMin = Math.round(diffMs / 60000);
      }
    }

    const trip = await prisma.trip.update({
      where: { id },
      data,
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('trip:status_changed', trip);
    }

    res.json({ trip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trip status.' });
  }
};

export const rerouteTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newDropAddress, newDropLat, newDropLng, newVehicleId } = req.body;

    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Trip not found.' });

    const updatedData: any = {};
    if (newDropAddress && newDropLat && newDropLng) {
      updatedData.dropAddress = newDropAddress;
      updatedData.dropLat = newDropLat;
      updatedData.dropLng = newDropLng;

      // Recalculate road route
      const startCoord = existing.vehicleId
        ? await prisma.vehicle.findUnique({ where: { id: existing.vehicleId } })
        : null;

      const fromLat = startCoord?.currentLat || existing.pickupLat;
      const fromLng = startCoord?.currentLng || existing.pickupLng;

      const route = await getRoadRoute(
        { lat: fromLat, lng: fromLng },
        { lat: newDropLat, lng: newDropLng }
      );
      updatedData.distanceKm = route.distanceKm;
      updatedData.estimatedDurationMin = route.durationMin;
    }

    if (newVehicleId) {
      updatedData.vehicleId = newVehicleId;
      const driver = await prisma.driver.findFirst({ where: { vehicleId: newVehicleId } });
      if (driver) updatedData.driverId = driver.id;
    }

    const trip = await prisma.trip.update({
      where: { id },
      data: updatedData,
      include: { vehicle: true, driver: { include: { user: true } } },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('trip:rerouted', trip);
      if (trip.driverId) {
        io.emit(`driver:${trip.driverId}:rerouted`, trip);
      }
    }

    res.json({ trip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reroute trip.' });
  }
};

export const submitProofOfDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { signatureData, proofPhotoUrl, notes } = req.body;

    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Trip not found.' });

    let actualDurationMin = existing.actualDurationMin;
    if (existing.startAt) {
      const diffMs = Date.now() - new Date(existing.startAt).getTime();
      actualDurationMin = Math.round(diffMs / 60000);
    }

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        status: 'completed',
        endAt: new Date(),
        actualDurationMin,
        signatureData,
        proofPhotoUrl,
        notes: notes ? `${existing.notes || ''}\nDelivery Note: ${notes}` : existing.notes,
      },
      include: { vehicle: true, driver: { include: { user: true } } },
    });

    // Update vehicle status back to idle/arrived
    if (trip.vehicleId) {
      await prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'arrived' },
      });
    }

    // Increment driver stats
    if (trip.driverId) {
      await prisma.driver.update({
        where: { id: trip.driverId },
        data: {
          totalTrips: { increment: 1 },
          totalDistanceKm: { increment: trip.distanceKm },
        },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('trip:completed', trip);
    }

    res.json({ message: 'Proof of Delivery recorded successfully.', trip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit Proof of Delivery.' });
  }
};

// Public tracking page endpoint (no auth required)
export const getPublicTripTracking = async (req: AuthRequest, res: Response) => {
  try {
    const { trackingCode } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { trackingCode },
      include: {
        vehicle: {
          select: {
            plateNumber: true,
            model: true,
            type: true,
            currentLat: true,
            currentLng: true,
            currentSpeed: true,
            currentHeading: true,
            status: true,
          },
        },
        driver: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Invalid tracking number or trip not found.' });
    }

    res.json({ trip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public tracking info.' });
  }
};
