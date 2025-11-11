import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// PostgreSQL setup
const pool = new Pool({
    user: 'your_user', // replace with your database user
    host: 'localhost', // replace with your database host
    database: 'your_database', // replace with your database name
    password: 'your_password', // replace with your database password
    port: 5432, // replace with your database port if different
});

// Middleware
app.use(express.json());

// Sample route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
    });

    // Example of handling a custom event
    socket.on('message', async (msg) => {
        console.log('Message received: ' + msg);
        // Handle message and possibly store it in PostgreSQL
        try {
            const result = await pool.query('INSERT INTO messages (content) VALUES ($1)', [msg]);
            console.log('Message saved to database:', result.rows);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
