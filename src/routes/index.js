const express = require('express');
const { handleWebhook, handleManualDownload } = require('../controllers/zoomController');

const router = express.Router();

router.post('/webhook', handleWebhook);
router.get('/download-by-user', handleManualDownload);

module.exports = router;
