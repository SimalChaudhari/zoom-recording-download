const express = require('express');
const { handleWebhook, handleManualDownload, handleManualDownloadByUser } = require('../controllers/zoomController');

const router = express.Router();

router.post('/webhook', handleWebhook);
router.get('/download-all', handleManualDownload);
router.get('/download-by-user', handleManualDownloadByUser);

module.exports = router;
