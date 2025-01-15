const axios = require('axios');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

async function downloadRecording(downloadUrl, fileName, file, meeting) {
  try {
    const recordingDate = moment(file.recording_start).format('YYYY-MM-DD');
    const folderPath = path.resolve(__dirname, `../downloads/${recordingDate}`);
    fs.mkdirSync(folderPath, { recursive: true });
    const filePath = path.join(folderPath, fileName);

    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading recording: ${error.message}`);
    return false;
  }
}

async function downloadAttendance(accessToken, meeting) {
  try {
    const url = `https://api.zoom.us/v2/report/meetings/${meeting.uuid}/participants`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    console.log(`Attendance downloaded for meeting: ${meeting.uuid}`);
    return response.data;
  } catch (error) {
    console.error(`Error downloading attendance: ${error.message}`);
  }
}

module.exports = { downloadRecording, downloadAttendance };
