require('dotenv').config();
const axios = require('axios');
const credentials = require('../config/env');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// Generate Zoom access token using client credentials
async function getAccessToken() {
  const url = 'https://zoom.us/oauth/token';
  const authHeader = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`
  ).toString('base64');

  try {
    const response = await axios.post(url, null, {
      params: {
        grant_type: 'account_credentials',
        account_id: credentials.accountId,
      },
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error.message);
    throw error;
  }
}

// Fetch Zoom recordings
async function fetchRecordings(accessToken, userId, fromDate, toDate) {
  const baseUrl = `https://api.zoom.us/v2/users/${userId}/recordings`;
  let allRecordings = [];
  let nextPageToken = null;

  try {
    do {
      const response = await axios.get(baseUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          from: fromDate,
          to: toDate,
          page_size: 100,
          next_page_token: nextPageToken,
        },
      });

      const data = response.data;
      allRecordings = allRecordings.concat(data.meetings);
      nextPageToken = data.next_page_token; // Continue if there's a next page
    } while (nextPageToken);

    return allRecordings;
  } catch (error) {
    console.error(`Error fetching recordings for ${userId}:`, error.response?.data || error.message);
    throw error;
  }
}


// Download Recording Function
async function downloadRecording(downloadUrl, fileName, file) {
  try {
    // Extract the date from recording_start and create a folder
    const recordingDate = file?.recording_start.split('T')[0];
    const downloadsFolder = path.resolve(__dirname, `../downloads/${recordingDate}`);

    // Ensure the folder exists
    if (!fs.existsSync(downloadsFolder)) {
      fs.mkdirSync(downloadsFolder, { recursive: true });
    }

    // Full file path
    const filePath = path.join(downloadsFolder, fileName);

    // Download the recording
    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    // Wait for download completion
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Downloaded: ${filePath}`);
        resolve(filePath);
      });
      writer.on('error', (error) => {
        console.error(`Error downloading ${fileName}:`, error.message);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Download error:', error.message);
    throw error;
  }
}

// Download Attendance Function
async function downloadAttendance(accessToken, meetingId) {
  try {
    const encodedMeetingId = encodeURIComponent(meetingId);
    // Fetch participants from Zoom API
    const url = `https://api.zoom.us/v2/report/meetings/${encodedMeetingId}/participants`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const participants = response.data.participants;
    if (!participants || participants.length === 0) {
      console.log(`No participants found for meeting ${meetingId}`);
      return;
    }

    // Create a download folder based on meeting date
    const downloadsFolder = path.resolve(__dirname, `../downloads/attendance/${meetingId}`);
    if (!fs.existsSync(downloadsFolder)) {
      fs.mkdirSync(downloadsFolder, { recursive: true });
    }

    // Create an Excel Workbook and Worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    // Define Columns for Excel File
    worksheet.columns = [
      { header: 'Participant ID', key: 'user_id', width: 20 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'user_email', width: 30 },
      { header: 'Join Time', key: 'join_time', width: 25 },
      { header: 'Leave Time', key: 'leave_time', width: 25 },
      { header: 'Duration (Minutes)', key: 'duration', width: 20 },
    ];

    // Add Rows to Worksheet
    console.log({participants})
    participants.forEach((participant) => {
      worksheet.addRow(participant);
    });

    // Define File Path and Save File
    const filePath = path.join(downloadsFolder, `attendance-${meetingId}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    console.log(`Attendance report saved at: ${filePath}`);
  } catch (error) {
    // console.log({error})
    console.error(`Error downloading attendance for meeting ${meetingId}:`, error.message);
    throw error;
  }
}

async function fetchAllUserRecordings(accessToken, fromDate, toDate) {
  const url = 'https://api.zoom.us/v2/users';
  let allUserRecordings = [];

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const users = response.data.users || [];
    for (const user of users) {
      const userRecordings = await fetchRecordings(accessToken, user.email, fromDate, toDate);
      allUserRecordings = allUserRecordings.concat(userRecordings);
    }

    return allUserRecordings;
  } catch (error) {
    console.error('Error fetching user recordings:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { getAccessToken, fetchRecordings, downloadRecording, downloadAttendance, fetchAllUserRecordings };
