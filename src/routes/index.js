const express = require('express');
const {
  handleWebhook,
  handleManualDownload,
  handleManualDownloadByUser,
} = require('../controllers/zoomController');
const validateRequest = require('../middlewares/validateRequest'); // Custom validation middleware

const router = express.Router();

// Route for handling Zoom webhook events
router.post('/webhook', validateRequest(['event', 'payload']), handleWebhook);

// Route for downloading all recordings within a date range
router.get(
  '/download-all',
  validateRequest(['fromDate', 'toDate'], 'query', true), // Optional query validation
  handleManualDownload
);

// Route for downloading recordings for a specific user within a date range
router.get(
  '/download-by-user',
  validateRequest(['userId', 'fromDate', 'toDate'], 'query'), // Require query parameters
  handleManualDownloadByUser
);

module.exports = router;
