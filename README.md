# Train Web App MVP

A production-ready WebRTC-enabled train car management system with real-time communication capabilities.

## Features

- **REST API** for managing cars, seats, and calls
- **JWT Authentication** for secure access
- **WebRTC Signaling** via Socket.IO for real-time video/audio calls
- **PostgreSQL Database** with automatic schema initialization
- **Rate Limiting** to prevent abuse
- **Railway.app Compatible** with automatic deployment

## Tech Stack

- **Backend**: Node.js with Express & TypeScript
- **Database**: PostgreSQL
- **Real-time**: Socket.IO for WebSocket communication
- **Authentication**: JWT tokens with bcrypt password hashing
- **Containerization**: Docker multi-stage build

## Quick Start

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local PostgreSQL credentials
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

### Production Build

1. **Build TypeScript**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

## Railway Deployment

This project is configured for one-click deployment on Railway.app:

1. **Push to GitHub**
2. **Connect Railway to your repository**
3. **Railway will automatically**:
   - Detect the Dockerfile
   - Build the application
   - Provision a PostgreSQL database
   - Set the `DATABASE_URL` environment variable
   - Deploy on port 8080

### Required Environment Variables

Railway automatically provides:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Application port (defaults to 8080)

You should set:
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Set to `production`
- `CORS_ORIGIN` - Allowed CORS origins (use `*` for development)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Cars
- `GET /api/cars` - List all cars
- `GET /api/cars/:id` - Get car by ID
- `POST /api/cars` - Create new car (requires auth)
- `PUT /api/cars/:id` - Update car (requires auth)
- `DELETE /api/cars/:id` - Delete car (requires auth)

### Seats
- `GET /api/seats` - List all seats (filter by `?car_id=X`)
- `GET /api/seats/:id` - Get seat by ID
- `POST /api/seats` - Create new seat (requires auth)
- `PUT /api/seats/:id` - Update seat (requires auth)
- `DELETE /api/seats/:id` - Delete seat (requires auth)

### Calls
- `GET /api/calls` - List all calls (filter by `?status=X`) (requires auth)
- `GET /api/calls/:id` - Get call by ID (requires auth)
- `POST /api/calls` - Create new call (requires auth)
- `PUT /api/calls/:id` - Update call (requires auth)
- `DELETE /api/calls/:id` - Delete call (requires auth)

## WebSocket Events

### Client → Server
- `register` - Register user ID with socket
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer
- `ice-candidate` - Send ICE candidate
- `call-ended` - Notify call ended
- `message` - Send chat message

### Server → Client
- `offer` - Receive WebRTC offer
- `answer` - Receive WebRTC answer
- `ice-candidate` - Receive ICE candidate
- `call-ended` - Call ended notification
- `message` - Receive chat message

## Database Schema

The database schema is automatically initialized on startup:

- **users** - User authentication
- **cars** - Train car management
- **seats** - Seat allocation
- **calls** - WebRTC call tracking
- **messages** - Chat messages

## Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Auth Rate Limiting** - 5 login/register attempts per 15 minutes
- **SQL Injection Protection** - Parameterized queries
- **CORS Configuration** - Configurable allowed origins

## Project Structure

```
.
├── Dockerfile              # Multi-stage Docker build
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── .env.example           # Environment variables template
├── src/
│   ├── index.ts           # Main application file
│   └── db.ts              # Database configuration
└── dist/                  # Compiled JavaScript (generated)
```

## License

MIT
