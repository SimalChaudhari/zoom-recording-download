require('dotenv').config();
const express = require('express');
const zoomRoutes = require('./routes/index');
const config = require('./config/env');

const app = express();
app.use(express.json());

// Routes
app.use('/zoom', zoomRoutes);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
