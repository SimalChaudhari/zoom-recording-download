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
    const recordingDate = file?.recording_start.split('T')[0];
    const year = recordingDate.split('-')[0];
    const formattedDate = moment(recordingDate).format('DD MMM YYYY');
    const formattedMonth = moment(recordingDate).format('MMM').toUpperCase();

    const courseCodeMatch = meeting?.topic.match(/^[A-Za-z0-9]+/);
    const courseCode = courseCodeMatch ? courseCodeMatch[0] : 'UnknownCourse';

    // Create a dynamic folder
    const folderName = `${courseCode} ${formattedDate}`;
    const downloadsFolder = path.resolve(__dirname, `../downloads/Yr${year}/${formattedMonth}/${folderName}`);

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

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Downloaded: ${filePath}`);
        resolve(true);  // Successfully downloaded
      });
      writer.on('error', (error) => {
        console.error(`Error downloading ${fileName}:`, error.message);
        reject(false);  // Download failed
      });
    });
  } catch (error) {
    console.error('Download error:', error.message);
    throw new Error(error.message);
  }
}

// Download Attendance Function
async function downloadAttendance(accessToken, meeting) {
  try {
    const encodedMeetingId = encodeURIComponent(meeting.uuid);
    const recordingDate = meeting?.start_time.split('T')[0];
    const year = recordingDate.split('-')[0];
    const formattedDate = moment(recordingDate).format('DD MMM YYYY');
    const formattedMonth = moment(recordingDate).format('MMM').toUpperCase();

    const courseCodeMatch = meeting?.topic.match(/^[A-Za-z0-9]+/);
    const courseCode = courseCodeMatch ? courseCodeMatch[0] : 'UnknownCourse';

    // Fetch participants
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

    // Create a dynamic folder
    const folderName = `${courseCode} ${formattedDate}`;
    const downloadsFolder = path.resolve(__dirname, `../downloads/Yr${year}/${formattedMonth}/${folderName}`);

    if (!fs.existsSync(downloadsFolder)) {
      fs.mkdirSync(downloadsFolder, { recursive: true });
    }

    const csvWriter = createCSVWriter({
        path: path.join(downloadsFolder, `Attendance_${courseCode} (${formattedDate}).csv`),
        header: [
            {id:'user_id', title:'Participant ID'},
            {id:'name', title:'Name'},
            {id:'user_email', title:'Email'},
            {id:'join_time', title:'Join Time'},
            {id:'leave_time', title:'Leave Time'},
            {id:'duration', title:'Duration (Minutes)'},
        ]
    });
    

    const records = participants.map(item=> ({
        user_id:item.item,
        name:item.name,
        user_email:item.user_email,
        join_time:item.join_time,
        leave_time:item.leave_time,
        duration:item.duration,
    }))

    await csvWriter.writeRecords(records)

    // // Create Excel workbook and worksheet
    // const workbook = new ExcelJS.Workbook();
    // const worksheet = workbook.addWorksheet('Attendance');

    // // Define worksheet columns
    // worksheet.columns = [
    //   { header: 'Participant ID', key: 'user_id', width: 20 },
    //   { header: 'Name', key: 'name', width: 25 },
    //   { header: 'Email', key: 'user_email', width: 30 },
    //   { header: 'Join Time', key: 'join_time', width: 25 },
    //   { header: 'Leave Time', key: 'leave_time', width: 25 },
    //   { header: 'Duration (Minutes)', key: 'duration', width: 20 },
    // ];

    
    // // Add rows
    // participants.forEach((participant) => {
    //   worksheet.addRow(participant);
    // });

    // // Save the Excel file
    // const filePath = path.join(downloadsFolder, `Attendance_${courseCode} (${formattedDate}).xlsx`);
    // await workbook.xlsx.writeFile(filePath);
    console.log(`Attendance report saved at: ${filePath}`);
  } catch (error) {
    console.error(`Error downloading attendance for meeting ${meeting?.topic}:`, error.message);
    throw new Error('Failed to process recording files.');
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
