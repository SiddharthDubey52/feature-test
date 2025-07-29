const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const database = require('./config/database');
const userInfoRoutes = require('./routes/userInfoRoutes');

const app = express();

// Initialize database connection
database.connect().catch(err => {
    console.error('Failed to connect to database:', err.message);
});

// Security middleware
app.use(helmet());

// CORS configuration for frontend access
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // Configure this for production
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Demo-Mode']
}));

// Logging middleware
app.use(morgan('combined'));

// Parse JSON bodies
app.use(express.json());

// Serve static files from root directory (relative to project root)
app.use(express.static(require('path').join(__dirname, '..')));

// Trust proxy for accurate IP detection
app.set('trust proxy', true);

// Routes
app.use('/api', userInfoRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
