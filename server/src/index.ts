import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { PrismaClient } from '@prisma/client';
import routes from './routes';
import { swaggerDocument } from './docs/swagger';
import { simulationEngine } from './services/simulationEngine';
import { ruleEngine } from './services/ruleEngine';

dotenv.config();

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  pingTimeout: 10000,
  pingInterval: 5000,
});

app.set('io', io);

// Simulation Engine init
simulationEngine.init(io, prisma);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter for general endpoints
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', generalLimiter);

// API Documentation via Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    simulationActive: simulationEngine.isSimulating(),
  });
});

// Socket.IO Real-time Connection Handler
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Driver GPS location streaming over WebSocket
  socket.on('driver:location', async (data) => {
    try {
      const { vehicleId, tripId, lat, lng, speed, heading, accuracy, battery } = data;
      if (!vehicleId || lat === undefined || lng === undefined) return;

      // Discard inaccurate jumps (> 50m)
      if (accuracy && accuracy > 50) return;

      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) return;

      const status = speed > 3 ? 'moving' : 'idle';

      // 1. Update vehicle state in database
      const updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          currentLat: lat,
          currentLng: lng,
          currentSpeed: Math.round(speed * 10) / 10,
          currentHeading: Math.round(heading || 0),
          batteryLevel: battery !== undefined ? battery : vehicle.batteryLevel,
          accuracy: accuracy || 5.0,
          status,
          lastActiveAt: new Date(),
        },
      });

      // 2. Persist in location history
      await prisma.locationPoint.create({
        data: {
          vehicleId,
          tripId: tripId || null,
          lat,
          lng,
          speed: speed || 0.0,
          heading: heading || 0.0,
          accuracy: accuracy || 5.0,
          battery,
        },
      });

      // 3. Rule Engine evaluation
      const geofences = await prisma.geofence.findMany({ where: { isActive: true } });
      const triggered = ruleEngine.evaluateRules({
        vehicleId,
        plateNumber: vehicle.plateNumber,
        speed: speed || 0.0,
        speedLimit: vehicle.speedLimit,
        location: { lat, lng },
        geofences,
      });

      for (const alertData of triggered) {
        const alert = await prisma.alert.create({
          data: {
            type: alertData.type,
            severity: alertData.severity,
            message: alertData.message,
            vehicleId,
            lat: alertData.lat,
            lng: alertData.lng,
            speed: alertData.speed,
          },
          include: { vehicle: true },
        });
        io.emit('alert:new', alert);
      }

      // 4. Broadcast live update to all fleet managers (< 1 second latency)
      io.emit('vehicle:update', {
        vehicleId,
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        type: vehicle.type,
        status,
        speed: Math.round(speed * 10) / 10,
        speedLimit: vehicle.speedLimit,
        heading: Math.round(heading || 0),
        lat,
        lng,
        batteryLevel: updated.batteryLevel,
        accuracy: updated.accuracy,
        lastActiveAt: updated.lastActiveAt?.toISOString(),
      });
    } catch (err) {
      console.error('Error handling driver:location socket event:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Periodic offline vehicle detector (checks every 15s)
setInterval(async () => {
  try {
    const offlineThreshold = new Date(Date.now() - 35 * 1000); // 35 seconds
    const staleVehicles = await prisma.vehicle.findMany({
      where: {
        status: { not: 'offline' },
        lastActiveAt: { lt: offlineThreshold },
      },
    });

    for (const v of staleVehicles) {
      await prisma.vehicle.update({
        where: { id: v.id },
        data: { status: 'offline' },
      });

      io.emit('vehicle:update', {
        vehicleId: v.id,
        plateNumber: v.plateNumber,
        model: v.model,
        type: v.type,
        status: 'offline',
        speed: 0,
        speedLimit: v.speedLimit,
        heading: v.currentHeading,
        lat: v.currentLat,
        lng: v.currentLng,
        batteryLevel: v.batteryLevel,
        accuracy: v.accuracy,
        lastActiveAt: v.lastActiveAt?.toISOString(),
      });
    }
  } catch (err) {
    // Silent catch for background checker
  }
}, 15000);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 FleetSync Server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`⚡ WebSocket Server active on ws://localhost:${PORT}`);
  console.log(`=======================================================`);
});

export { app, server, prisma, io };
