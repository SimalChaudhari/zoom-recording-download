const fs = require("fs");
const path = require("path");
const moment = require('moment');

function createFolderIfNotExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

// Helper function to handle date validation and formatting
function validateAndFormatDateRange(fromDate, toDate) {
  const today = moment().format('YYYY-MM-DD');
  
  // Default to today's date if no date range is provided
  fromDate = fromDate || today;
  toDate = toDate || today;

  // Validate that the fromDate is not after the toDate
  if (moment(fromDate).isAfter(toDate)) {
    throw new Error('Invalid date range: "fromDate" cannot be after "toDate".');
  }

  // Format dates to start and end of the day
  const startOfDay = moment(fromDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
  const endOfDay = moment(toDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');

  return { startOfDay, endOfDay };
}

module.exports = { createFolderIfNotExists,validateAndFormatDateRange };
