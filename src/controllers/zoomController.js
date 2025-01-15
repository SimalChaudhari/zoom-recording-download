
const { fetchAllUserRecordings, fetchRecordings, downloadRecording, downloadAttendance, deleteRecording } = require('../services/zoomService');
const { getAccessToken} = require('../utils/apiClient');
const moment = require('moment');

async function handleWebhook(req, res) {
  try {
    const { event, payload } = req.body;

    // Ensure the event type is correct
    if (event === 'recording.completed') {
      const meeting = payload.object;

      // Download attendance report
      if (meeting.uuid) {
        await downloadAttendanceReport(meeting);
        console.log(`Attendance downloaded for meeting: ${meeting.uuid}`);
      }

      // Download recordings
      for (const file of meeting.recording_files) {
        const downloadUrl = `${file.download_url}?access_token=${accessToken}`;
        const fileName = `${meeting.id}-${file.id}.${file.file_extension}`;
        // await downloadRecording(downloadUrl, fileName, file, meeting);
        const isDownloaded = await downloadRecording(downloadUrl, fileName, file, meeting);

        if (isDownloaded) {
          const deleteResponse = await deleteRecording(meeting.uuid, file.id);

          if (deleteResponse) {
            console.log(`Recording deleted from Zoom cloud: ${fileName}`);
          } else {
            console.error(`Failed to delete recording: ${fileName}`, deleteResponse.error);
          }
        } else {
          console.error(`Failed to download recording: ${fileName}`);
        }

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

    // Convert to start and end of the day for the given dates
    const startOfDay = moment(fromDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const endOfDay = moment(toDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');

    console.log(`Fetching recordings from ${startOfDay} to ${endOfDay}`);

    const accessToken = await getAccessToken();
    const allRecordings = await fetchAllUserRecordings(accessToken, startOfDay, endOfDay);
    console.log({allRecordings})
    for (const meeting of allRecordings) {
     
      if (meeting?.uuid) {
        await downloadAttendance(accessToken, meeting);
      }

      for (const file of meeting.recording_files) {
        const downloadUrl = `${file.download_url}?access_token=${accessToken}`;
        const fileName = `${meeting.id}-${file.id}.${file.file_extension}`;

        const isDownloaded = await downloadRecording(downloadUrl, fileName, file, meeting);

        if (isDownloaded) {
          console.log(`Recording downloaded and deleted from Zoom cloud: ${fileName}`);
          // const deleteResponse = await deleteRecording(accessToken, meeting.uuid, file.id);

          // if (deleteResponse.success) {
          // } else {
          //   console.error(`Failed to delete recording: ${fileName}`, deleteResponse.error);
          // }
        } else {
          console.error(`Failed to download recording: ${fileName}`);
        }
      }
    }

    if (res) {
      res.status(200).send('Recordings and attendance downloaded successfully.');
    } else {
      console.log('Recordings and attendance downloaded successfully (cron job)');
    }
  } catch (error) {
    console.error('Error downloading recordings:', error);
    if (res) {
      res.status(500).send('Internal Server Error');
    } else {
      console.error('Cron job failed: Error downloading recordings');
    }
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
        // await downloadRecording(downloadUrl, fileName, file, meeting);

        const isDownloaded = await downloadRecording(downloadUrl, fileName, file, meeting);

        if (isDownloaded) {
          const deleteResponse = await deleteRecording(accessToken, meeting.uuid, file.id);

          if (deleteResponse.success) {
            console.log(`Recording deleted from Zoom cloud: ${fileName}`);
          } else {
            console.error(`Failed to delete recording: ${fileName}`, deleteResponse.error);
          }
        } else {
          console.error(`Failed to download recording: ${fileName}`);
        }
      }
    }

    res.status(200).send('Recordings and attendance downloaded successfully.');
  } catch (error) {
    console.error('Error downloading recordings:', error.message);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Parses and validates date range from query parameters.
 * Defaults to today's date if parameters are missing.
 * @param {Object} query - Query parameters.
 * @returns {Object} Parsed date range.
 */
function parseDateRange(query) {
  const today = moment().format('YYYY-MM-DD');
  const fromDate = query.fromDate || today;
  const toDate = query.toDate || today;

  if (moment(fromDate).isAfter(toDate)) {
    throw new Error('Invalid date range: "fromDate" cannot be after "toDate".');
  }

  return { fromDate, toDate };
}

module.exports = { handleWebhook, handleManualDownload, handleManualDownloadByUser };
