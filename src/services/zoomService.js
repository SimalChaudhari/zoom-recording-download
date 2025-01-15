require('dotenv').config();
const axios = require('axios');
const credentials = require('../config/env');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const moment = require('moment');
const createCSVWriter = require('csv-writer').createObjectCsvWriter;

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
  const baseUrl = `${credentials.zoomCloudApi}/users/${userId}/recordings`;
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
      nextPageToken = data.next_page_token;
    } while (nextPageToken);

    return allRecordings;
  } catch (error) {
    console.error(`Error fetching recordings for ${userId}:`, error.response?.data || error.message);
    throw error;
  }
}

// Download Recording Function
async function downloadRecording(downloadUrl, fileName, file, meeting) {
  try {
    // Validate input
    if (!downloadUrl || !fileName || !file?.recording_start || !meeting?.topic) {
      throw new Error('Invalid input: Missing required data for downloading recording.');
    }

    // Extract recording details
    const recordingDate = file.recording_start.split('T')[0];
    const year = recordingDate.split('-')[0];
    const formattedDate = moment(recordingDate).format('DD MMM YYYY');
    const formattedMonth = moment(recordingDate).format('MMM').toUpperCase();

    const courseCodeMatch = meeting.topic.match(/^[A-Za-z0-9]+/);
    const courseCode = courseCodeMatch ? courseCodeMatch[0] : 'UnknownCourse';

    // Create a dynamic folder structure
    const folderName = `${courseCode} ${formattedDate}`;
    const downloadsFolder = path.resolve(
      __dirname,
      `../downloads/Yr${year}/${formattedMonth}/${folderName}`
    );

    // Ensure the folder exists
    if (!fs.existsSync(downloadsFolder)) {
      fs.mkdirSync(downloadsFolder, { recursive: true });
    }

    const filePath = path.join(downloadsFolder, fileName);

    // Download the recording
    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
    });

    // Write the file to the folder
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    // Handle download completion
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Recording successfully downloaded to: ${filePath}`);
        resolve(true); // Successfully downloaded
      });
      writer.on('error', (error) => {
        console.error(`Error downloading recording to ${filePath}:`, error.message);
        reject(false); // Download failed
      });
    });
  } catch (error) {
    console.error(`Download error for file "${fileName}":`, error.message);
    throw new Error(`Failed to download recording: ${error.message}`);
  }
}

// Download Attendance Function
async function downloadAttendance(accessToken, meeting) {
  try {
    // Validate input
    if (!meeting?.uuid || !meeting?.start_time) {
      throw new Error('Invalid meeting object: Missing required properties.');
    }

    // Extract meeting details
    const encodedMeetingId = encodeURIComponent(meeting.uuid);
    const recordingDate = meeting.start_time.split('T')[0];
    const year = recordingDate.split('-')[0];
    const formattedDate = moment(recordingDate).format('DD MMM YYYY');
    const formattedMonth = moment(recordingDate).format('MMM').toUpperCase();

    const courseCodeMatch = meeting?.topic?.match(/^[A-Za-z0-9]+/);
    const courseCode = courseCodeMatch ? courseCodeMatch[0] : 'UnknownCourse';

    // Fetch participants from Zoom API
    const url = `${credentials.zoomCloudApi}/report/meetings/${encodedMeetingId}/participants`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const participants = response.data.participants;
    if (!participants || participants.length === 0) {
      console.log(`No participants found for meeting ${meeting.uuid}`);
      return;
    }

    // Create a dynamic folder structure
    const folderName = `${courseCode} ${formattedDate}`;
    const downloadsFolder = path.resolve(
      __dirname,
      `../downloads/Yr${year}/${formattedMonth}/${folderName}`
    );

    if (!fs.existsSync(downloadsFolder)) {
      fs.mkdirSync(downloadsFolder, { recursive: true });
    }

    // Filter for unique users based on email or user ID
    const uniqueParticipants = participants.filter(
      (participant, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.user_email === participant.user_email ||
            t.id === participant.id
        )
    );

    // Write the attendance report to a CSV file
    const csvWriter = createCSVWriter({
      path: path.join(
        downloadsFolder,
        `Attendance_${courseCode} (${formattedDate}).csv`
      ),
      header: [
        { id: 'user_id', title: 'Participant ID' },
        { id: 'name', title: 'Name' },
        { id: 'user_email', title: 'Email' },
        { id: 'join_time', title: 'Join Time' },
        { id: 'leave_time', title: 'Leave Time' },
        { id: 'duration', title: 'Duration (Minutes)' },
      ],
    });

    const records = uniqueParticipants.map((participant) => ({
      user_id: participant.id || 'N/A',
      name: participant.name || 'N/A',
      user_email: participant.user_email || 'N/A',
      join_time: participant.join_time || 'N/A',
      leave_time: participant.leave_time || 'N/A',
      duration: participant.duration || 0,
    }));

    await csvWriter.writeRecords(records);

    console.log(
      `Attendance report saved at: ${path.join(
        downloadsFolder,
        `Attendance_${courseCode} (${formattedDate}).csv`
      )}`
    );
  } catch (error) {
    console.error(
      `Error downloading attendance for meeting "${meeting?.topic || 'N/A'}":`,
      error.message
    );
    throw new Error('Failed to download and process attendance data.');
  }
}


async function fetchAllUserRecordings(accessToken, fromDate, toDate) {
  const url = `${credentials.zoomCloudApi}/users`;
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

async function deleteRecording(accessToken, meetingUuid, fileId) {
  try {
    const url = `${credentials.zoomCloudApi}/meetings/${meetingUuid}/recordings/${fileId}`;
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log(`Recording with file ID ${fileId} deleted successfully.`);
    return response.data || { success: true, message: 'Recording deleted successfully' };
  } catch (error) {
    console.error('Error deleting recording:', error.message);
    return { success: false, error: error.message };
  }
}


module.exports = { getAccessToken, fetchRecordings, downloadRecording, downloadAttendance, fetchAllUserRecordings, deleteRecording };
