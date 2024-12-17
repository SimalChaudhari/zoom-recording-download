require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Import CORS
const zoomRoutes = require('./routes/index');
const config = require('./config/env');

const app = express();

// Enable CORS policy for all routes
app.use(cors('*'));

// Optional: Configure CORS for specific domains and methods
/*
app.use(cors({
  origin: ['http://example.com', 'http://localhost:3000'], // Allow specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
}));
*/

app.use(express.json());

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Node.js App Deployed Successfully!');
});

// Zoom Routes
app.use('/zoom', zoomRoutes);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
