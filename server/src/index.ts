import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool, { initSchema } from './db';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// Auth Middleware
interface AuthRequest extends Request {
  userId?: number;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'Train Web App MVP API',
    version: '1.0.0'
  });
});

// Auth Routes
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ user, token });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query(
      'SELECT id, username, password FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      user: { id: user.id, username: user.username }, 
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Cars API Routes
app.get('/api/cars', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cars ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get cars error:', error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

app.get('/api/cars/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM cars WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({ error: 'Failed to fetch car' });
  }
});

app.post('/api/cars', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, capacity, status } = req.body;
    
    if (!name || !capacity) {
      return res.status(400).json({ error: 'Name and capacity required' });
    }

    const result = await pool.query(
      'INSERT INTO cars (name, capacity, status) VALUES ($1, $2, $3) RETURNING *',
      [name, capacity, status || 'available']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create car error:', error);
    res.status(500).json({ error: 'Failed to create car' });
  }
});

app.put('/api/cars/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, capacity, status } = req.body;

    const result = await pool.query(
      'UPDATE cars SET name = COALESCE($1, name), capacity = COALESCE($2, capacity), status = COALESCE($3, status), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, capacity, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update car error:', error);
    res.status(500).json({ error: 'Failed to update car' });
  }
});

app.delete('/api/cars/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM cars WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

// Seats API Routes
app.get('/api/seats', async (req: Request, res: Response) => {
  try {
    const { car_id } = req.query;
    let query = 'SELECT * FROM seats';
    const params: any[] = [];

    if (car_id) {
      query += ' WHERE car_id = $1';
      params.push(car_id);
    }

    query += ' ORDER BY car_id, seat_number ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get seats error:', error);
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

app.get('/api/seats/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM seats WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Seat not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get seat error:', error);
    res.status(500).json({ error: 'Failed to fetch seat' });
  }
});

app.post('/api/seats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { car_id, seat_number, is_occupied, user_id } = req.body;
    
    if (!car_id || seat_number === undefined) {
      return res.status(400).json({ error: 'Car ID and seat number required' });
    }

    const result = await pool.query(
      'INSERT INTO seats (car_id, seat_number, is_occupied, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [car_id, seat_number, is_occupied || false, user_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Seat already exists for this car' });
    }
    console.error('Create seat error:', error);
    res.status(500).json({ error: 'Failed to create seat' });
  }
});

app.put('/api/seats/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_occupied, user_id } = req.body;

    const result = await pool.query(
      'UPDATE seats SET is_occupied = COALESCE($1, is_occupied), user_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [is_occupied, user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Seat not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update seat error:', error);
    res.status(500).json({ error: 'Failed to update seat' });
  }
});

app.delete('/api/seats/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM seats WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Seat not found' });
    }

    res.json({ message: 'Seat deleted successfully' });
  } catch (error) {
    console.error('Delete seat error:', error);
    res.status(500).json({ error: 'Failed to delete seat' });
  }
});

// Calls API Routes
app.get('/api/calls', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM calls';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

app.get('/api/calls/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM calls WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

app.post('/api/calls', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { caller_id, receiver_id } = req.body;
    
    if (!caller_id || !receiver_id) {
      return res.status(400).json({ error: 'Caller ID and receiver ID required' });
    }

    const result = await pool.query(
      'INSERT INTO calls (caller_id, receiver_id, status) VALUES ($1, $2, $3) RETURNING *',
      [caller_id, receiver_id, 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create call error:', error);
    res.status(500).json({ error: 'Failed to create call' });
  }
});

app.put('/api/calls/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, ended_at } = req.body;

    const result = await pool.query(
      'UPDATE calls SET status = COALESCE($1, status), ended_at = $2 WHERE id = $3 RETURNING *',
      [status, ended_at, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update call error:', error);
    res.status(500).json({ error: 'Failed to update call' });
  }
});

app.delete('/api/calls/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM calls WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({ message: 'Call deleted successfully' });
  } catch (error) {
    console.error('Delete call error:', error);
    res.status(500).json({ error: 'Failed to delete call' });
  }
});

// WebSocket for WebRTC signaling
const activeSockets = new Map<string, number>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Store user ID with socket
  socket.on('register', (userId: number) => {
    activeSockets.set(socket.id, userId);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // WebRTC signaling events
  socket.on('offer', async ({ to, offer, callId }) => {
    console.log(`Offer from ${socket.id} to ${to}`);
    io.to(to).emit('offer', { 
      from: socket.id, 
      offer,
      callId 
    });
  });

  socket.on('answer', async ({ to, answer, callId }) => {
    console.log(`Answer from ${socket.id} to ${to}`);
    io.to(to).emit('answer', { 
      from: socket.id, 
      answer,
      callId 
    });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    console.log(`ICE candidate from ${socket.id} to ${to}`);
    io.to(to).emit('ice-candidate', { 
      from: socket.id, 
      candidate 
    });
  });

  socket.on('call-ended', ({ to, callId }) => {
    console.log(`Call ended from ${socket.id} to ${to}`);
    io.to(to).emit('call-ended', { 
      from: socket.id, 
      callId 
    });
  });

  // Handle messages
  socket.on('message', async (msg: string) => {
    console.log('Message received:', msg);
    const userId = activeSockets.get(socket.id);
    
    try {
      const result = await pool.query(
        'INSERT INTO messages (content, user_id) VALUES ($1, $2) RETURNING *',
        [msg, userId || null]
      );
      console.log('Message saved to database:', result.rows[0]);
      
      // Broadcast message to all clients
      io.emit('message', result.rows[0]);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    const userId = activeSockets.get(socket.id);
    activeSockets.delete(socket.id);
    console.log(`User ${userId} disconnected: ${socket.id}`);
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    await initSchema();
    console.log('Database initialized successfully');
    
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
