require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // For security headers
const rateLimit = require('express-rate-limit'); // To prevent abuse
const zoomRoutes = require('./routes/index');
const meetingRoutes = require('./routes/meetingRoutes');
const config = require('./config/env');

const app = express();

// Use Helmet to set security-related HTTP headers
app.use(helmet());

// Enable CORS policy
app.use(cors({
  origin: ['http://localhost:3000'], // Add allowed domains
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Apply rate limiting to all API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});
app.use(limiter);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Endpoint
app.get('/', (req, res) => {
  res.status(200).send('Node.js App Deployed Successfully!');
});

// Zoom Routes
app.use('/zoom', zoomRoutes);
app.use('/zoom/meetings', meetingRoutes);

// Start cron jobs
require('./jobs/cronJob');

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong.',
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
