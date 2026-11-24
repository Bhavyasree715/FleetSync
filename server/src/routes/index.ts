import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import * as authController from '../controllers/authController';
import * as vehicleController from '../controllers/vehicleController';
import * as tripController from '../controllers/tripController';
import * as alertController from '../controllers/alertController';
import * as trackingController from '../controllers/trackingController';
import * as analyticsController from '../controllers/analyticsController';
import * as geofenceController from '../controllers/geofenceController';
import * as simulationController from '../controllers/simulationController';
import * as miscController from '../controllers/miscController';

const router = Router();

// --- Auth Routes ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateJWT, authController.getMe);

// --- Public Trip Tracking Route (No login required) ---
router.get('/trips/public/:trackingCode', tripController.getPublicTripTracking);

// --- Tracking Routes ---
router.post('/tracking/update', authenticateJWT, trackingController.updateLocation);
router.post('/tracking/batch', authenticateJWT, trackingController.batchSyncLocations);
router.get('/tracking/history/:vehicleId', authenticateJWT, trackingController.getRouteHistory);

// --- Vehicle Routes ---
router.get('/vehicles', authenticateJWT, vehicleController.getVehicles);
router.get('/vehicles/:id', authenticateJWT, vehicleController.getVehicleById);
router.post('/vehicles', authenticateJWT, requireRole('manager'), vehicleController.createVehicle);
router.put('/vehicles/:id', authenticateJWT, requireRole('manager'), vehicleController.updateVehicle);
router.delete('/vehicles/:id', authenticateJWT, requireRole('manager'), vehicleController.deleteVehicle);

// --- Trip Routes ---
router.get('/trips', authenticateJWT, tripController.getTrips);
router.get('/trips/:id', authenticateJWT, tripController.getTripById);
router.post('/trips', authenticateJWT, requireRole('manager'), tripController.createTrip);
router.post('/trips/rank-vehicles', authenticateJWT, requireRole('manager'), tripController.rankVehicles);
router.put('/trips/:id/assign', authenticateJWT, requireRole('manager'), tripController.assignTrip);
router.put('/trips/:id/status', authenticateJWT, tripController.updateTripStatus);
router.put('/trips/:id/reroute', authenticateJWT, requireRole('manager'), tripController.rerouteTrip);
router.post('/trips/:id/pod', authenticateJWT, tripController.submitProofOfDelivery);

// --- Alert Routes ---
router.get('/alerts', authenticateJWT, alertController.getAlerts);
router.put('/alerts/:id/acknowledge', authenticateJWT, alertController.acknowledgeAlert);
router.put('/alerts/acknowledge-all', authenticateJWT, alertController.acknowledgeAllAlerts);
router.post('/alerts/sos', authenticateJWT, alertController.createSosAlert);

// --- Geofence Routes ---
router.get('/geofences', authenticateJWT, geofenceController.getGeofences);
router.post('/geofences', authenticateJWT, requireRole('manager'), geofenceController.createGeofence);
router.put('/geofences/:id', authenticateJWT, requireRole('manager'), geofenceController.updateGeofence);
router.delete('/geofences/:id', authenticateJWT, requireRole('manager'), geofenceController.deleteGeofence);

// --- Analytics Routes ---
router.get('/analytics/dashboard', authenticateJWT, analyticsController.getDashboardStats);
router.get('/analytics/hotspots', authenticateJWT, analyticsController.getHotspots);
router.get('/analytics/reports', authenticateJWT, analyticsController.getIncidentReports);

// --- Simulation Routes ---
router.post('/simulation/start', authenticateJWT, simulationController.startSimulation);
router.post('/simulation/stop', authenticateJWT, simulationController.stopSimulation);
router.get('/simulation/status', authenticateJWT, simulationController.getSimulationStatus);
router.post('/simulation/trigger-overspeed', authenticateJWT, simulationController.triggerOverspeed);
router.post('/simulation/trigger-sos', authenticateJWT, simulationController.triggerSos);

// --- Settings & Miscellaneous ---
router.get('/settings', authenticateJWT, miscController.getSettings);
router.put('/settings', authenticateJWT, requireRole('manager'), miscController.updateSettings);
router.post('/push/subscribe', authenticateJWT, miscController.subscribeWebPush);
router.get('/maintenance', authenticateJWT, miscController.getMaintenanceLogs);
router.post('/maintenance', authenticateJWT, miscController.createMaintenanceLog);
router.get('/fuel', authenticateJWT, miscController.getFuelLogs);
router.post('/fuel', authenticateJWT, miscController.createFuelLog);
router.get('/trips/:tripId/messages', authenticateJWT, miscController.getTripMessages);
router.post('/trips/:tripId/messages', authenticateJWT, miscController.sendTripMessage);

export default router;
