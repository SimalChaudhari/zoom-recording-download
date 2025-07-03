const express = require('express');
const {
  handleWebhook,
  handleManualDownload,
  handleManualDownloadByUser,
  fetchAttendanceReport,
} = require('../controllers/zoomController');
const validateRequest = require('../middlewares/validateRequest'); // Custom validation middleware
const { getAllowedHosts } = require('../config/allowedHosts');

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

router.get(
  '/fetch-attendance-report',
  validateRequest(['fromDate', 'toDate'], 'query'), // Require query parameters
  fetchAttendanceReport
);

// Route to get list of allowed hosts
router.get('/allowed-hosts', (req, res) => {
  try {
    const hosts = getAllowedHosts();
    res.status(200).json({
      message: 'Allowed hosts retrieved successfully',
      allowedHosts: hosts,
      count: hosts.length
    });
  } catch (error) {
    console.error('Error retrieving allowed hosts:', error.message);
    res.status(500).json({
      message: 'Internal Server Error while retrieving allowed hosts',
      error: error.message
    });
  }
});

module.exports = router;
