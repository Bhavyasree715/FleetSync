// FleetSync TypeScript Interfaces and Types

export type UserRole = 'manager' | 'driver';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  language: 'en' | 'ta' | 'hi';
  theme: 'light' | 'dark';
  driverId?: string;
  vehicleId?: string;
}

export type VehicleStatus = 'moving' | 'arrived' | 'idle' | 'offline';
export type VehicleType = 'truck' | 'van' | 'car' | 'bike';

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  type: VehicleType;
  status: VehicleStatus;
  speedLimit: number;
  currentLat: number | null;
  currentLng: number | null;
  currentSpeed: number;
  currentHeading: number;
  batteryLevel: number | null;
  accuracy: number | null;
  lastActiveAt: string | null;
  driver?: Driver | null;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  safetyScore: number;
  totalTrips: number;
  totalDistanceKm: number;
  onDuty: boolean;
  user?: User;
  vehicleId?: string | null;
}

export interface LocationUpdatePayload {
  vehicleId: string;
  tripId?: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  battery?: number;
  timestamp: string;
}

export type TripStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type TripPriority = 'low' | 'normal' | 'urgent';

export interface Trip {
  id: string;
  trackingCode: string;
  vehicleId?: string | null;
  vehicle?: Vehicle | null;
  driverId?: string | null;
  driver?: Driver | null;
  title: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropAddress: string;
  dropLat: number;
  dropLng: number;
  status: TripStatus;
  priority: TripPriority;
  distanceKm: number;
  estimatedDurationMin: number;
  actualDurationMin?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  maxSpeed: number;
  avgSpeed: number;
  recipientName?: string | null;
  recipientPhone?: string | null;
  signatureData?: string | null;
  proofPhotoUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AlertType = 'overspeed' | 'geofence_entry' | 'geofence_exit' | 'idle' | 'offline' | 'sos';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  vehicleId?: string | null;
  vehicle?: Vehicle | null;
  tripId?: string | null;
  lat?: number | null;
  lng?: number | null;
  speed?: number | null;
  isAcknowledged: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
}

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  polygonGeoJson?: string | null;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  color: string;
  isActive: boolean;
}

export interface RuleSettings {
  id: string;
  overspeedThreshold: number;
  truckSpeedLimit: number;
  vanSpeedLimit: number;
  carSpeedLimit: number;
  bikeSpeedLimit: number;
  idleMinutesThreshold: number;
  offlineSecondsThreshold: number;
  autoDispatchEnabled: boolean;
  mapProvider: 'osm' | 'google';
  notificationSound: boolean;
}

export interface Message {
  id: string;
  tripId?: string | null;
  senderId: string;
  receiverId?: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: User;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  serviceType: string;
  scheduledKm?: number | null;
  actualKm?: number | null;
  scheduledDate: string;
  completedDate?: string | null;
  cost: number;
  status: 'scheduled' | 'overdue' | 'completed';
  notes?: string | null;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  driverId: string;
  liters: number;
  totalCost: number;
  odometerKm: number;
  station?: string | null;
  receiptUrl?: string | null;
  filledAt: string;
}
