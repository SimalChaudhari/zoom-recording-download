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
async function fetchRecordings(accessToken, userId, fromDate, toDate, API_URL) {
  const baseUrl = `https://api.zoom.us/v2/users/${userId}/${API_URL}`;
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
    console.log({error})
    // console.error(`Error fetching recordings for ${userId}:`, error.response?.data || error.message);
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
    // Validate meeting object properties
    if (!meeting?.id || !meeting?.start_time) {
      throw new Error('Invalid meeting object: Missing required properties.');
    }

    const recordingDate = meeting.start_time.split('T')[0];
    const year = recordingDate.split('-')[0];
    const formattedDate = moment(recordingDate).format('DD MMM YYYY');
    const formattedMonth = moment(recordingDate).format('MMM').toUpperCase();
    const formattedStartTime = moment(meeting.start_time).format('DD/MM/YY hh:mm:ss A');
    const formattedEndTime = meeting?.end_time ? moment(meeting.end_time).format('DD/MM/YY hh:mm:ss A') : '';

    // Extract course code from topic or use default
    const courseCodeMatch = meeting?.topic?.match(/^[A-Za-z0-9]+/);
    const courseCode = courseCodeMatch ? courseCodeMatch[0] : 'UnknownCourse';

    let nextPageToken = null;
    const participants = [];

    // Loop to handle pagination and fetch all participants
    do {
      const url = `https://api.zoom.us/v2/report/meetings/${meeting.id}/participants`;
      console.log(`Requesting URL: ${url}`);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          page_size: 100,  // Fetch up to 100 participants per page
          next_page_token: nextPageToken,
        },
      });

      // Append the participants from the current page
      participants.push(...response.data.participants);

      // Get nextPageToken for pagination
      nextPageToken = response.data.next_page_token || null;
    } while (nextPageToken); // Continue fetching until no nextPageToken exists

    if (!participants || participants.length === 0) {
      console.log(`No participants found for meeting ${meeting.id}`);
      return;
    }

    // Prepare folder for storing the report
    const folderName = `${courseCode} ${formattedDate}`;
    const downloadsFolder = path.resolve(__dirname, `../downloads/Yr${year}/${formattedMonth}/${folderName}`);

    // Ensure the folder exists
    if (!fs.existsSync(downloadsFolder)) {
      fs.mkdirSync(downloadsFolder, { recursive: true });
    }

    // Path to save the CSV file
    const csvFilePath = path.join(downloadsFolder, `Attendance_${courseCode} (${formattedDate}).csv`);

    // Group participants by email and sum the durations
    const uniqueParticipants = participants.reduce((acc, participant) => {
      const existingParticipant = acc.find(p => p.user_email === participant.user_email);
      if (existingParticipant) {
        existingParticipant.duration += participant.duration || 0;
      } else {
        acc.push({
          id: participant.id,
          name: participant.name || 'N/A',
          user_email: participant.user_email || 'N/A',
          duration: participant.duration || 0,
        });
      }
      return acc;
    }, []);

    // Prepare and write meeting details to CSV
    const csvWriter = createCSVWriter({
      path: csvFilePath,
      header: [
        { id: 'field1', title: 'Title' },
        { id: 'field2', title: 'Details' },
      ],
    });

    const meetingDetails = [
      { field1: 'Meeting ID', field2: meeting.id },
      { field1: 'Topic', field2: meeting.topic },
      { field1: 'User Email', field2: meeting.host_email },
      { field1: 'Duration (Minutes)', field2: meeting.duration },
      { field1: 'Start Time', field2: formattedStartTime },
      { field1: 'End Time', field2: formattedEndTime },
      { field1: 'Participants', field2: participants.length },
      { field1: '', field2: '' }, // Blank rows for formatting
      { field1: '', field2: '' },
    ];

    await csvWriter.writeRecords(meetingDetails);

    // Write participant details to the CSV
    const participantCsvWriter = createCSVWriter({
      path: csvFilePath,
      append: true, // Append to existing file after meeting details
      header: [
        { id: 'name', title: 'Name (Original Name)' },
        { id: 'user_email', title: 'User Email' },
        { id: 'duration', title: 'Total Duration (Minutes)' },
        { id: 'guest', title: 'Guest' },
      ],
    });

    // Map participant data to match CSV structure
    const participantRecords = uniqueParticipants.map((participant) => ({
      name: participant.name || 'N/A',
      user_email: participant.user_email || 'N/A',
      duration: Math.floor(participant.duration / 60) + 1 || 0,
      guest: meeting.host_id === participant.id ? 'No' : 'Yes',
    }));

    // Write participant records to CSV
    await participantCsvWriter.writeRecords(participantRecords);

    console.log(`Attendance report saved at: ${csvFilePath}`);
  } catch (error) {
    console.error(`Error downloading attendance for meeting "${meeting?.topic || 'N/A'}":`, error.message);
    throw new Error('Failed to download and process attendance data.');
  }
}

// Function to get user details by host_id
async function getUserByHostId(accessToken, hostId) {
  try {
    const url = `https://api.zoom.us/v2/users/${hostId}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching user details for host_id ${hostId}:`, error.response?.data || error.message);
    return null;
  }
}

async function fetchAllUserRecordings(accessToken, fromDate, toDate, API_URL) {
  const url = `https://api.zoom.us/v2/users`;
  let allUserRecordings = [];

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const users = response?.data?.users || [];
    
    for (const user of users) {
      const userRecordings = await fetchRecordings(accessToken, user.email, fromDate, toDate, API_URL);
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


module.exports = { getAccessToken, fetchRecordings, downloadRecording, downloadAttendance, fetchAllUserRecordings, deleteRecording, getUserByHostId };
