const { getAccessToken, fetchRecordings, downloadRecording, downloadAttendance, fetchAllUserRecordings } = require('../utils/apiClient');
const moment = require('moment');

async function handleWebhook(req, res) {
  try {
    const { event, payload } = req.body;

    // Ensure the event type is correct
    if (event === 'recording.completed') {
      const meeting = payload.object;
      const accessToken = await getAccessToken();

      // Download attendance report
      if (meeting.uuid) {
        await downloadAttendance(accessToken, meeting.uuid);
        console.log(`Attendance downloaded for meeting: ${meeting.uuid}`);
      }

      // Download recordings
      for (const file of meeting.recording_files) {
        const downloadUrl = `${file.download_url}?access_token=${accessToken}`;
        const fileName = `${meeting.id}-${file.id}.${file.file_extension}`;
        await downloadRecording(downloadUrl, fileName, file, accessToken);
      }
      console.log('Recordings downloaded successfully.');
    }

    res.status(200).send('Webhook processed successfully.');
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).send('Internal Server Error');
  }
}

async function handleManualDownload(req, res) {
  try {
    // Extract query parameters
    let { fromDate, toDate } = req.query;

    // Use today's date if dates are not provided
    const today = moment().format('YYYY-MM-DD');
    fromDate = fromDate || today;
    toDate = toDate || today;

    console.log(`Fetching recordings from ${fromDate} to ${toDate}`);

    const accessToken = await getAccessToken();
    const allRecordings = await fetchAllUserRecordings(accessToken, fromDate, toDate);

    for (const meeting of allRecordings) {

      if (meeting?.uuid) {
        await downloadAttendance(accessToken, meeting.uuid);
      }

      for (const file of meeting.recording_files) {
        const downloadUrl = `${file.download_url}?access_token=${accessToken}`;
        const fileName = `${meeting.id}-${file.id}.${file.file_extension}`;
        await downloadRecording(downloadUrl, fileName, file, accessToken);
      }
    }

    res.status(200).send('Recordings and attendance downloaded successfully.');
  } catch (error) {
    console.error('Error downloading recordings:', error.message);
    res.status(500).send('Internal Server Error');
  }
}

async function handleManualDownloadByUser(req, res) {
  try {
    const { userId, fromDate, toDate } = req.query;

    if (!userId) {
      return res.status(400).send('User ID is required.');
    }

    // Use current date if fromDate or toDate is missing
    const today = moment().format('YYYY-MM-DD');
    const startDate = fromDate || today;
    const endDate = toDate || today;

    console.log(`Fetching recordings for ${userId} from ${startDate} to ${endDate}`);

    const accessToken = await getAccessToken();

    // Fetch recordings for the specific user
    const recordings = await fetchRecordings(accessToken, userId, startDate, endDate);

    for (const meeting of recordings) {
      console.log(`Processing meeting: ${meeting.uuid}`);

      // Download attendance if available
      if (meeting?.uuid) {
        await downloadAttendance(accessToken, meeting.uuid);
        console.log(`Attendance downloaded for meeting: ${meeting.uuid}`);
      }

      // Download recordings
      for (const file of meeting.recording_files) {
        const downloadUrl = `${file.download_url}?access_token=${accessToken}`;
        const fileName = `${meeting.id}-${file.id}.${file.file_extension}`;
        await downloadRecording(downloadUrl, fileName, file, accessToken);
      }
    }

    res.status(200).send('Recordings and attendance downloaded successfully.');
  } catch (error) {
    console.error('Error downloading recordings:', error.message);
    res.status(500).send('Internal Server Error');
  }
}


module.exports = { handleWebhook, handleManualDownload, handleManualDownloadByUser };
