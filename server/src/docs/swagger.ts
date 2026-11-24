export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'FleetSync API Documentation',
    version: '1.0.0',
    description:
      'REST API and WebSocket documentation for FleetSync – Mobile Fleet Tracking and Intelligent Vehicle Coordination System (ITA0316 Mobile Computing)',
    contact: {
      name: 'FleetSync Dev Team',
      email: 'support@fleetsync.local',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Express Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authenticate User & Obtain JWT Token',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'manager@demo.com' },
                  password: { type: 'string', example: 'manager123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully with JWT token and user profile.' },
          401: { description: 'Invalid email or password.' },
        },
      },
    },
    '/vehicles': {
      get: {
        summary: 'List all vehicles with live coordinates and statuses',
        tags: ['Fleet Vehicles'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'moving', 'arrived', 'idle', 'offline'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['all', 'truck', 'van', 'car', 'bike'] } },
        ],
        responses: {
          200: { description: 'List of fleet vehicles.' },
        },
      },
    },
    '/trips': {
      get: {
        summary: 'List trips with driver and vehicle assignments',
        tags: ['Trip Dispatch'],
        responses: {
          200: { description: 'Trips list.' },
        },
      },
      post: {
        summary: 'Create and dispatch trip',
        tags: ['Trip Dispatch'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Express Package Delivery' },
                  pickupAddress: { type: 'string' },
                  pickupLat: { type: 'number' },
                  pickupLng: { type: 'number' },
                  dropAddress: { type: 'string' },
                  dropLat: { type: 'number' },
                  dropLng: { type: 'number' },
                  priority: { type: 'string', enum: ['low', 'normal', 'urgent'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Trip created and road distance calculated.' },
        },
      },
    },
    '/trips/rank-vehicles': {
      post: {
        summary: 'Rank available vehicles by proximity and ETA to pickup point',
        tags: ['Nearest Vehicle Coordination'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pickupLat: { type: 'number', example: 13.0600 },
                  pickupLng: { type: 'number', example: 80.2500 },
                  requiredType: { type: 'string', example: 'van' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Ranked list of available fleet vehicles with ETA.' },
        },
      },
    },
    '/alerts': {
      get: {
        summary: 'Get incident alerts (overspeed, geofence, idle, SOS)',
        tags: ['Alert Center'],
        responses: {
          200: { description: 'Alerts list.' },
        },
      },
    },
    '/tracking/update': {
      post: {
        summary: 'HTTP fallback for smartphone GPS location update',
        tags: ['GPS Tracking'],
        responses: {
          200: { description: 'Location recorded and rules evaluated.' },
        },
      },
    },
    '/simulation/start': {
      post: {
        summary: 'Start multi-vehicle simulation engine for demo',
        tags: ['Simulation Mode'],
        responses: {
          200: { description: 'Simulation started.' },
        },
      },
    },
  },
};
