const cron = require('node-cron');
const moment = require('moment');

const { handleManualDownload } = require('./../controllers/zoomController');

// Schedule the job to run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Cron job started: Running handleManualDownload');

  try {
    const fromDate = moment().format('YYYY-MM-DD');
    const toDate = moment().format('YYYY-MM-DD');
    await handleManualDownload({ query: { fromDate, toDate } });
    console.log('Cron job completed successfully');
  } catch (error) {
    console.error('Error in cron job:', error.message);
  }
});

console.log('Cron job scheduled to run daily at midnight');
