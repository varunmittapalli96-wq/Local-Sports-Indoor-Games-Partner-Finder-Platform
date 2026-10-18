export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PlayNear API - Local Sports & Indoor Games Partner Finder',
    version: '1.0.0',
    description: 'REST API for discovering nearby sports partners, coordinating play sessions, managing communities, and admin monitoring.',
  },
  servers: [
    { url: 'http://localhost:5000/api/v1', description: 'Local Development Server' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'httpOnly JWT cookie issued on login/register',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Optional Authorization Bearer token header',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['user', 'organizer', 'admin'] },
          locality: { type: 'string' },
          ageGroup: { type: 'string' },
          gender: { type: 'string' },
          bio: { type: 'string' },
          playingLocations: { type: 'array', items: { type: 'string' } },
          womenOnlyPlay: { type: Boolean },
          publicPlacesOnly: { type: Boolean },
          emailVerified: { type: Boolean },
          status: { type: 'string', enum: ['active', 'suspended'] },
        },
      },
      Game: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string', enum: ['indoor', 'outdoor'] },
          minPlayers: { type: 'integer' },
          maxPlayers: { type: 'integer' },
          icon: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      PlayRequest: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          sender: { $ref: '#/components/schemas/User' },
          receiver: { $ref: '#/components/schemas/User' },
          game: { $ref: '#/components/schemas/Game' },
          proposedDateTime: { type: 'string', format: 'date-time' },
          locationType: { type: 'string', enum: ['home', 'clubhouse', 'ground'] },
          venue: { type: 'string' },
          message: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired', 'completed'] },
        },
      },
      Community: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          type: { type: 'string', enum: ['society', 'club', 'neighborhood', 'corporate'] },
          locality: { type: 'string' },
          description: { type: 'string' },
          rules: { type: 'string' },
          verificationStatus: { type: 'string', enum: ['pending', 'verified', 'rejected'] },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user account',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'locality', 'contactPreference', 'contactValue'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  locality: { type: 'string' },
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                  gender: { type: 'string' },
                  ageGroup: { type: 'string' },
                  contactPreference: { type: 'string', enum: ['whatsapp', 'phone', 'email'] },
                  contactValue: { type: 'string' },
                  womenOnlyPlay: { type: 'boolean' },
                  publicPlacesOnly: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Registration successful, cookie set' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate and receive JWT cookie',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Login successful' } },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Clear authentication cookie',
        tags: ['Auth'],
        responses: { 200: { description: 'Logged out successfully' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        tags: ['Auth'],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { 200: { description: 'User profile retrieved' } },
      },
    },
    '/games': {
      get: {
        summary: 'List all active games (indoor & outdoor)',
        tags: ['Games'],
        responses: { 200: { description: 'Games list' } },
      },
    },
    '/players/search': {
      get: {
        summary: 'Geospatial player search with weighted matching score',
        tags: ['Search'],
        parameters: [
          { name: 'game', in: 'query', schema: { type: 'string' }, description: 'Game ID' },
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lng', in: 'query', schema: { type: 'number' } },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 20 }, description: 'Radius in km' },
          { name: 'day', in: 'query', schema: { type: 'string' } },
          { name: 'time', in: 'query', schema: { type: 'string' } },
          { name: 'skill', in: 'query', schema: { type: 'string' } },
          { name: 'womenOnly', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Ranked list of nearby matching players' } },
      },
    },
    '/requests': {
      post: {
        summary: 'Send a play request to another player',
        tags: ['Requests'],
        security: [{ cookieAuth: [] }],
        responses: { 201: { description: 'Play request dispatched' } },
      },
      get: {
        summary: 'List sent or received play requests',
        tags: ['Requests'],
        parameters: [
          { name: 'box', in: 'query', schema: { type: 'string', enum: ['sent', 'received'] } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'Filtered requests list' } },
      },
    },
    '/requests/{id}/accept': {
      patch: {
        summary: 'Accept play request with double-booking guard',
        tags: ['Requests'],
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'Request accepted, contact info revealed' } },
      },
    },
    '/admin/kpis': {
      get: {
        summary: 'Fetch platform KPIs (registered users, active requests, match rate, MAU, repeat engagement)',
        tags: ['Admin'],
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'Aggregated analytics metrics' } },
      },
    },
  },
};
