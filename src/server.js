require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // For security headers
const zoomRoutes = require('./routes/index');
const meetingRoutes = require('./routes/meetingRoutes');
const config = require('./config/env');

const app = express();

// Use Helmet to set security-related HTTP headers
app.use(helmet());

// Enable CORS policy
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'], // Use environment variable for allowed domains
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy!',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Root Endpoint
app.get('/', (req, res) => {
  res.status(200).send('Node.js App Deployed Successfully!');
});

// Zoom Routes
app.use('/zoom', zoomRoutes);
app.use('/zoom/meetings', meetingRoutes);

// Start cron jobs
try {
  require('./jobs/cronJob');
  console.log('Cron jobs started successfully.');
} catch (err) {
  console.error('Error starting cron jobs:', err.message);
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error: ', err.stack);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong.',
  });
});

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle Unhandled Rejections and Exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1); // Exit process in case of fatal errors
});
