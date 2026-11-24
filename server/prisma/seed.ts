import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting FleetSync database seeding...');

  // 1. Clean existing records in proper cascade order
  await prisma.auditLog.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.fuelLog.deleteMany({});
  await prisma.maintenanceLog.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.locationPoint.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.geofence.deleteMany({});
  await prisma.ruleSettings.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);
  const managerHash = await bcrypt.hash('manager123', 10);
  const driverHash = await bcrypt.hash('driver123', 10);

  // 2. Global Rule Settings
  await prisma.ruleSettings.create({
    data: {
      id: 'global-settings',
      overspeedThreshold: 65.0,
      truckSpeedLimit: 50.0,
      vanSpeedLimit: 65.0,
      carSpeedLimit: 80.0,
      bikeSpeedLimit: 50.0,
      idleMinutesThreshold: 5,
      offlineSecondsThreshold: 30,
      autoDispatchEnabled: false,
      mapProvider: 'osm',
      notificationSound: true,
    },
  });

  // 3. Manager User
  const manager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      passwordHash: managerHash,
      name: 'Priya Raman (Fleet Director)',
      role: 'manager',
      phone: '+91 98400 12345',
      language: 'en',
      theme: 'light',
    },
  });

  // 4. Vehicles Data (Chennai Metro Area coordinates)
  const vehicleDefs = [
    { plate: 'TN-01-AB-1234', model: 'Tata Ultra 1918 T', type: 'truck', limit: 50.0, lat: 12.9010, lng: 80.2279, speed: 42.0 },
    { plate: 'TN-02-CD-5678', model: 'Mahindra Bolero Maxi Truck', type: 'van', limit: 65.0, lat: 13.0067, lng: 80.2025, speed: 52.0 },
    { plate: 'TN-03-EF-9012', model: 'Maruti Suzuki Eeco Cargo', type: 'car', limit: 80.0, lat: 13.0400, lng: 80.2500, speed: 38.0 },
    { plate: 'TN-04-GH-3456', model: 'Hero Electric Nyx Commercial', type: 'bike', limit: 50.0, lat: 13.0500, lng: 80.2824, speed: 28.0 },
    { plate: 'TN-05-JK-7890', model: 'Ashok Leyland Ecomet 1215', type: 'truck', limit: 50.0, lat: 13.0694, lng: 80.1948, speed: 0.0 }, // idle
    { plate: 'TN-06-LM-2345', model: 'Force Traveller Delivery Van', type: 'van', limit: 65.0, lat: 13.0350, lng: 80.1580, speed: 48.0 },
    { plate: 'TN-07-NP-6789', model: 'Hyundai Venue Fleet FleetEdition', type: 'car', limit: 80.0, lat: 12.9750, lng: 80.2200, speed: 60.0 },
    { plate: 'TN-08-RS-0123', model: 'BharatBenz 2823R Heavy Hauler', type: 'truck', limit: 50.0, lat: 12.9250, lng: 80.1200, speed: 0.0 }, // offline
  ];

  const createdVehicles = [];
  for (const v of vehicleDefs) {
    const isOffline = v.plate === 'TN-08-RS-0123';
    const isIdle = v.speed === 0 && !isOffline;
    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: v.plate,
        model: v.model,
        type: v.type,
        status: isOffline ? 'offline' : isIdle ? 'idle' : 'moving',
        speedLimit: v.limit,
        currentLat: v.lat,
        currentLng: v.lng,
        currentSpeed: v.speed,
        currentHeading: Math.floor(Math.random() * 360),
        batteryLevel: Math.floor(70 + Math.random() * 30),
        accuracy: 4.0,
        lastActiveAt: isOffline ? new Date(Date.now() - 3600000) : new Date(),
      },
    });
    createdVehicles.push(vehicle);
  }

  // 5. Driver Users & Profiles
  const driverDefs = [
    { email: 'driver1@demo.com', name: 'Karthik Subramanian', phone: '+91 98401 22334', license: 'DL-TN-01-2018-00452', score: 94 },
    { email: 'driver2@demo.com', name: 'Arun Kumar', phone: '+91 98402 33445', license: 'DL-TN-02-2019-00981', score: 88 },
    { email: 'driver3@demo.com', name: 'Deepak Sharma', phone: '+91 98403 44556', license: 'DL-TN-03-2020-00312', score: 91 },
    { email: 'driver4@demo.com', name: 'Murugan Velu', phone: '+91 98404 55667', license: 'DL-TN-04-2017-00774', score: 96 },
    { email: 'driver5@demo.com', name: 'Sanjay Patel', phone: '+91 98405 66778', license: 'DL-TN-05-2021-00129', score: 78 }, // slightly lower score for contrast
    { email: 'driver6@demo.com', name: 'Ravi Teja', phone: '+91 98406 77889', license: 'DL-TN-06-2022-00561', score: 85 },
    { email: 'driver7@demo.com', name: 'Manoj Kumar', phone: '+91 98407 88990', license: 'DL-TN-07-2020-00843', score: 92 },
    { email: 'driver8@demo.com', name: 'Vignesh Rajan', phone: '+91 98408 99001', license: 'DL-TN-08-2019-00627', score: 89 },
  ];

  const createdDrivers = [];
  for (let i = 0; i < driverDefs.length; i++) {
    const d = driverDefs[i];
    const user = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash: driverHash,
        name: d.name,
        role: 'driver',
        phone: d.phone,
        language: i === 0 ? 'ta' : i === 2 ? 'hi' : 'en',
      },
    });

    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        vehicleId: createdVehicles[i].id,
        licenseNumber: d.license,
        safetyScore: d.score,
        totalTrips: 15 + i * 4,
        totalDistanceKm: 420.5 + i * 85.0,
        onDuty: i < 5,
      },
    });
    createdDrivers.push(driver);
  }

  // 6. Geofences
  await prisma.geofence.create({
    data: {
      name: 'Chennai Central Logistics Park',
      type: 'circle',
      centerLat: 13.0694,
      centerLng: 80.1948,
      radiusMeters: 800,
      alertOnEntry: true,
      alertOnExit: true,
      color: '#10b981',
      isActive: true,
    },
  });

  await prisma.geofence.create({
    data: {
      name: 'OMR Tech Corridor Zone',
      type: 'polygon',
      centerLat: 12.9400,
      centerLng: 80.2350,
      radiusMeters: 2500,
      polygonGeoJson: JSON.stringify([
        [12.9850, 80.2400],
        [12.9900, 80.2600],
        [12.8900, 80.2450],
        [12.8900, 80.2250],
      ]),
      alertOnEntry: true,
      alertOnExit: true,
      color: '#3b82f6',
      isActive: true,
    },
  });

  await prisma.geofence.create({
    data: {
      name: 'Airport Cargo Restricted Zone',
      type: 'circle',
      centerLat: 12.9850,
      centerLng: 80.1780,
      radiusMeters: 1200,
      alertOnEntry: true,
      alertOnExit: true,
      color: '#ef4444',
      isActive: true,
    },
  });

  // 7. Trips
  // Trip 1: In Progress with Driver 1
  const tripInProgress = await prisma.trip.create({
    data: {
      trackingCode: 'FS-TRIP-1001',
      vehicleId: createdVehicles[0].id,
      driverId: createdDrivers[0].id,
      title: 'Electronics Consignment Delivery',
      pickupAddress: 'Sholinganallur Warehouse Hub, OMR',
      pickupLat: 12.9010,
      pickupLng: 80.2279,
      dropAddress: 'Tidel Park Campus, Taramani',
      dropLat: 12.9900,
      dropLng: 80.2450,
      status: 'in_progress',
      priority: 'urgent',
      distanceKm: 14.2,
      estimatedDurationMin: 28,
      startAt: new Date(Date.now() - 15 * 60000),
      maxSpeed: 48.0,
      avgSpeed: 38.5,
      recipientName: 'Venkatesh Rao (Operations)',
      recipientPhone: '+91 94440 98765',
      notes: 'Handle fragile semiconductor servers with air suspension ride.',
    },
  });

  // Trip 2: Pending Dispatch (Ready for demonstration!)
  await prisma.trip.create({
    data: {
      trackingCode: 'FS-TRIP-1002',
      title: 'Urgent Medical Supplies Transit',
      pickupAddress: 'Apollo Pharmacy Hub, Greams Road',
      pickupLat: 13.0600,
      pickupLng: 80.2520,
      dropAddress: 'SIMS Hospital, Vadapalani',
      dropLat: 13.0520,
      dropLng: 80.2100,
      status: 'pending',
      priority: 'urgent',
      distanceKm: 6.8,
      estimatedDurationMin: 18,
      recipientName: 'Dr. Archana Sen',
      recipientPhone: '+91 98840 55443',
      notes: 'Temperature-controlled medicine boxes. Assign nearest available van or car.',
    },
  });

  // Trip 3: Completed Trip with Proof & Signature
  const tripCompleted = await prisma.trip.create({
    data: {
      trackingCode: 'FS-TRIP-1003',
      vehicleId: createdVehicles[1].id,
      driverId: createdDrivers[1].id,
      title: 'Automotive Spare Parts Dispatch',
      pickupAddress: 'Sriperumbudur Auto Ancillary Unit',
      pickupLat: 12.9780,
      pickupLng: 80.1650,
      dropAddress: 'Guindy Industrial Estate, Guindy',
      dropLat: 13.0067,
      dropLng: 80.2025,
      status: 'completed',
      priority: 'normal',
      distanceKm: 18.5,
      estimatedDurationMin: 35,
      actualDurationMin: 32,
      startAt: new Date(Date.now() - 3 * 3600000),
      endAt: new Date(Date.now() - 2 * 3600000),
      maxSpeed: 58.0,
      avgSpeed: 42.0,
      recipientName: 'K. Balaji (Store Manager)',
      recipientPhone: '+91 97910 11223',
      signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M10 50 Q 50 10, 90 50 T 170 50" stroke="black" stroke-width="3" fill="none"/></svg>',
      notes: 'Delivered in good condition with digital gate pass verification.',
    },
  });

  // 8. Location Points for completed trip (for History Replay demonstration!)
  const replayPoints = [
    { lat: 12.9780, lng: 80.1650, speed: 20.0, heading: 45, minOffset: 45 },
    { lat: 12.9810, lng: 80.1700, speed: 38.0, heading: 50, minOffset: 40 },
    { lat: 12.9860, lng: 80.1780, speed: 52.0, heading: 60, minOffset: 35 },
    { lat: 12.9920, lng: 80.1850, speed: 56.0, heading: 55, minOffset: 30 },
    { lat: 12.9980, lng: 80.1910, speed: 45.0, heading: 40, minOffset: 25 },
    { lat: 13.0020, lng: 80.1970, speed: 35.0, heading: 30, minOffset: 20 },
    { lat: 13.0067, lng: 80.2025, speed: 0.0, heading: 0, minOffset: 15 },
  ];

  for (const pt of replayPoints) {
    await prisma.locationPoint.create({
      data: {
        vehicleId: createdVehicles[1].id,
        tripId: tripCompleted.id,
        lat: pt.lat,
        lng: pt.lng,
        speed: pt.speed,
        heading: pt.heading,
        accuracy: 3.8,
        battery: 88,
        timestamp: new Date(Date.now() - pt.minOffset * 60000),
      },
    });
  }

  // Also add current trip points for vehicle 0
  await prisma.locationPoint.create({
    data: {
      vehicleId: createdVehicles[0].id,
      tripId: tripInProgress.id,
      lat: 12.9010,
      lng: 80.2279,
      speed: 35.0,
      heading: 30,
      timestamp: new Date(Date.now() - 10 * 60000),
    },
  });
  await prisma.locationPoint.create({
    data: {
      vehicleId: createdVehicles[0].id,
      tripId: tripInProgress.id,
      lat: 12.9300,
      lng: 80.2370,
      speed: 42.0,
      heading: 35,
      timestamp: new Date(Date.now() - 5 * 60000),
    },
  });

  // 9. Sample Incidents / Alerts
  await prisma.alert.create({
    data: {
      type: 'overspeed',
      severity: 'warning',
      message: 'Vehicle TN-05-JK-7890 exceeded limit: 68 km/h on GST Road (Limit: 50 km/h)',
      vehicleId: createdVehicles[4].id,
      lat: 13.0694,
      lng: 80.1948,
      speed: 68.0,
      isAcknowledged: false,
      createdAt: new Date(Date.now() - 40 * 60000),
    },
  });

  await prisma.alert.create({
    data: {
      type: 'geofence_entry',
      severity: 'info',
      message: 'Vehicle TN-01-AB-1234 entered geofence "OMR Tech Corridor Zone"',
      vehicleId: createdVehicles[0].id,
      lat: 12.9300,
      lng: 80.2370,
      speed: 42.0,
      isAcknowledged: true,
      acknowledgedBy: 'Priya Raman',
      acknowledgedAt: new Date(Date.now() - 5 * 60000),
      createdAt: new Date(Date.now() - 8 * 60000),
    },
  });

  await prisma.alert.create({
    data: {
      type: 'idle',
      severity: 'info',
      message: 'Vehicle TN-05-JK-7890 stationary idle for 12 minutes at Koyambedu Market Yard',
      vehicleId: createdVehicles[4].id,
      lat: 13.0694,
      lng: 80.1948,
      speed: 0.0,
      isAcknowledged: false,
      createdAt: new Date(Date.now() - 18 * 60000),
    },
  });

  // 10. Maintenance & Fuel Logs
  await prisma.maintenanceLog.create({
    data: {
      vehicleId: createdVehicles[0].id,
      serviceType: '10,000 km Scheduled Service & Brake Pad Replacement',
      scheduledKm: 10000,
      actualKm: 10250,
      scheduledDate: new Date(Date.now() + 5 * 86400000),
      cost: 4500.0,
      status: 'scheduled',
      notes: 'Authorized Tata Commercial Service Center appointment booked.',
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      vehicleId: createdVehicles[1].id,
      serviceType: 'Engine Oil & Air Filter Replacement',
      scheduledKm: 5000,
      actualKm: 4980,
      scheduledDate: new Date(Date.now() - 15 * 86400000),
      completedDate: new Date(Date.now() - 14 * 86400000),
      cost: 2800.0,
      status: 'completed',
      notes: 'Completed synthetic oil renewal and alignment calibration.',
    },
  });

  await prisma.fuelLog.create({
    data: {
      vehicleId: createdVehicles[0].id,
      driverId: createdDrivers[0].id,
      liters: 45.0,
      totalCost: 4230.0,
      odometerKm: 9850.0,
      station: 'Indian Oil Swagat, Sholinganallur',
      filledAt: new Date(Date.now() - 24 * 3600000),
    },
  });

  // 11. Chat Message between Driver and Manager
  await prisma.message.create({
    data: {
      tripId: tripInProgress.id,
      senderId: createdDrivers[0].userId,
      content: 'Hello Priya, reached Perungudi junction. Encountering slight traffic due to flyover construction, ETA 20 mins.',
      isRead: true,
      createdAt: new Date(Date.now() - 8 * 60000),
    },
  });

  await prisma.message.create({
    data: {
      tripId: tripInProgress.id,
      senderId: manager.id,
      content: 'Received Karthik. Take the Velachery bypass service road if heavy delay.',
      isRead: true,
      createdAt: new Date(Date.now() - 6 * 60000),
    },
  });

  console.log('✅ FleetSync database seeded successfully!');
  console.log('Credentials:');
  console.log(' Manager: manager@demo.com / manager123');
  console.log(' Driver 1 (Truck): driver1@demo.com / driver123');
  console.log(' Driver 2 (Van): driver2@demo.com / driver123');
  console.log(' Driver 3 (Car): driver3@demo.com / driver123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
