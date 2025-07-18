const express = require('express');
const {
  handleWebhook,
  handleManualDownload,
  handleManualDownloadByUser,
  fetchAttendanceReport,
} = require('../controllers/zoomController');
const validateRequest = require('../middlewares/validateRequest'); // Custom validation middleware
const { getAllowedHosts, testPattern } = require('../config/allowedHosts');
const { getAllTenants, getActiveTenant, setActiveTenant } = require('../config/tenants');

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

// Route to test if an email matches any allowed pattern
router.get('/test-host', (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        message: 'Email parameter is required',
        example: '/test-host?email=iscacpd5@isca.org.sg'
      });
    }
    
    const matches = testPattern(email);
    const isAllowed = matches.length > 0;
    
    res.status(200).json({
      message: 'Pattern test completed',
      email: email,
      isAllowed: isAllowed,
      matchingPatterns: matches,
      allPatterns: getAllowedHosts()
    });
  } catch (error) {
    console.error('Error testing host pattern:', error.message);
    res.status(500).json({
      message: 'Internal Server Error while testing pattern',
      error: error.message
    });
  }
});

// Route to get all tenants
router.get('/tenants', (req, res) => {
  try {
    const tenants = getAllTenants();
    const activeTenant = getActiveTenant();
    
    res.status(200).json({
      message: 'Tenants retrieved successfully',
      tenants: tenants,
      activeTenant: {
        key: activeTenant.key,
        name: activeTenant.config.name
      }
    });
  } catch (error) {
    console.error('Error retrieving tenants:', error.message);
    res.status(500).json({
      message: 'Internal Server Error while retrieving tenants',
      error: error.message
    });
  }
});

// Route to switch active tenant
router.post('/switch-tenant', (req, res) => {
  try {
    const { tenantKey } = req.body;
    
    if (!tenantKey) {
      return res.status(400).json({
        message: 'tenantKey is required in request body',
        example: { tenantKey: 'new' }
      });
    }
    
    setActiveTenant(tenantKey);
    
    res.status(200).json({
      message: 'Tenant switched successfully',
      activeTenant: tenantKey
    });
  } catch (error) {
    console.error('Error switching tenant:', error.message);
    res.status(500).json({
      message: 'Internal Server Error while switching tenant',
      error: error.message
    });
  }
});

module.exports = router;
