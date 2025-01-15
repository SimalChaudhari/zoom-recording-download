const cron = require('node-cron');
const moment = require('moment');

const { handleManualDownload } = require('./../controllers/zoomController');

// Schedule the job to run daily at 11:58 PM
cron.schedule('58 23 * * *', async () => {
  console.log('Cron job started: Running handleManualDownload');

  try {
    // Define today's start and end dates
    const fromDate = moment().startOf('day').format('YYYY-MM-DD');
    const toDate = moment().endOf('day').format('YYYY-MM-DD');

    console.log(`Processing recordings for date range: ${fromDate} to ${toDate}`);

    // Execute the function with the date range
    await handleManualDownload({ query: { fromDate, toDate } });
    console.log('Cron job completed successfully');
  } catch (error) {
    console.error('Error in cron job:', error.message);
  }
});

console.log('Cron job scheduled to run daily at 11:58 PM');
