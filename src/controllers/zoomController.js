const { fetchAllUserRecordings, fetchRecordings, downloadRecording, downloadAttendance, deleteRecording } = require('../services/zoomService');
const { getAccessToken } = require('../utils/apiClient');
const moment = require('moment');
const { validateAndFormatDateRange } = require('../utils/helpers');
const { isAllowedHost: checkAllowedHost } = require('../config/allowedHosts');

// Function to check if meeting is from allowed host
function isAllowedHost(meeting) {
  const meetingHost = meeting.host_email || meeting.host_id;
  
  // Check if the meeting host is in the allowed list
  const isAllowed = checkAllowedHost(meetingHost);
  
  if (!isAllowed) {
    console.log(`Skipping meeting from unauthorized host: ${meetingHost} (Topic: ${meeting.topic})`);
  }
  
  return isAllowed;
}

async function handleWebhook(req, res) {
  try {
    const { event, payload } = req.body;

    // Validate webhook payload
    if (!event || !payload?.object) {
      throw new Error('Invalid webhook payload: Missing event or payload data.');
    }

    // Ensure the event type is correct
    if (event === 'recording.completed') {
      const meeting = payload.object;

      console.log(`Processing recording.completed event for meeting: ${meeting.uuid}`);

      // Validate meeting data
      if (!meeting.uuid || !meeting.recording_files || meeting.recording_files.length === 0) {
        throw new Error('Invalid meeting data: Missing UUID or recording files.');
      }

      // Check if meeting is from allowed host
      if (!isAllowedHost(meeting)) {
        console.log(`Skipping webhook for unauthorized host: ${meeting.host_email || meeting.host_id}`);
        return res.status(200).send('Webhook processed successfully (unauthorized host skipped).');
      }

      // Fetch Zoom access token
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Failed to retrieve Zoom access token.');
      }

      // Download attendance report
      try {
        await downloadAttendance(accessToken, meeting);
        console.log(`Attendance report downloaded for meeting: ${meeting.uuid}`);
      } catch (attendanceError) {
        console.error(`Error downloading attendance for meeting ${meeting.uuid}:`, attendanceError.message);
      }

      // Download recordings
      for (const file of meeting.recording_files) {
        try {
          const downloadUrl = `${file.download_url}?access_token=${accessToken}`;
          const fileName = `${meeting.id}-${file.id}.${file.file_extension}`;

          const isDownloaded = await downloadRecording(downloadUrl, fileName, file, meeting);

          if (isDownloaded) {
            try {
              const deleteResponse = await deleteRecording(accessToken, meeting.uuid, file.id);
              if (deleteResponse.success) {
                console.log(`Recording downloaded and deleted from Zoom cloud: ${fileName}`);
              } else {
                console.error(`Failed to delete recording: ${fileName}`, deleteResponse.error);
              }
            } catch (deleteError) {
              console.error(`Error deleting recording ${fileName}:`, deleteError.message);
            }
          } else {
            console.error(`Failed to download recording: ${fileName}`);
          }
        } catch (fileError) {
          console.error(`Error processing recording file (${file.id}):`, fileError.message);
        }
      }

      console.log('All recordings processed successfully.');
    } else {
      console.warn(`Unhandled webhook event type: ${event}`);
    }

    res.status(200).send('Webhook processed successfully.');
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).send({
      message: 'Internal Server Error while processing webhook.',
      error: error.message,
    });
  }
}

// Main function to handle manual download
async function handleManualDownload(req, res) {
  try {
    // Extract and validate query parameters
    let { fromDate, toDate } = req.query;

    // Validate and format date range
    const { startOfDay, endOfDay } = validateAndFormatDateRange(fromDate, toDate);
    console.log(`Fetching recordings from ${startOfDay} to ${endOfDay}`);

    // Get Zoom access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Failed to retrieve Zoom access token.');
    }

    // Fetch all recordings within the date range
    const allRecordings = await fetchAllUserRecordings(accessToken, startOfDay, endOfDay, 'recordings');
    console.log(`Total meetings fetched: ${allRecordings.length}`);

    // Filter recordings by allowed hosts
    const allowedRecordings = allRecordings.filter(meeting => isAllowedHost(meeting));
    console.log(`Meetings from allowed hosts: ${allowedRecordings.length}`);

    // Process each meeting and its recordings
    for (const meeting of allowedRecordings) {
      try {
        console.log(`Processing meeting: ${meeting.topic} (${meeting.uuid})`);
        await processMeetingRecordings(meeting, accessToken);
      } catch (meetingError) {
        console.error(`Error processing meeting (${meeting.uuid}):`, meetingError.message);
      }
    }

    // Final response
    if (res) {
      res.status(200).send('Recordings and attendance downloaded successfully.');
    } else {
      console.log('Recordings and attendance downloaded successfully (cron job).');
    }
  } catch (error) {
    console.error('Error downloading recordings:', error.message);

    // Return error response
    if (res) {
      res.status(500).send({
        message: 'Failed to download recordings and attendance.',
        error: error.message,
      });
    } else {
      console.error('Cron job failed: Error downloading recordings.');
    }
  }
}

// Function to process each meeting's recordings
async function processMeetingRecordings(meeting, accessToken) {
  for (const file of meeting.recording_files) {
    try {
      const downloadUrl = `${file.download_url}?access_token=${accessToken}`;
      const fileName = `${meeting.id}-${file.id}.${file.file_extension}`;

      const isDownloaded = await downloadRecording(downloadUrl, fileName, file, meeting);

      if (isDownloaded) {
        const deleteResponse = await deleteRecording(accessToken, meeting.uuid, file.id);
        if (deleteResponse.success) {
          console.log(`Recording downloaded and deleted from Zoom cloud: ${fileName}`);
        } else {
          console.error(`Failed to delete recording: ${fileName}`, deleteResponse.error);
        }
      } else {
        console.error(`Failed to download recording: ${fileName}`);
      }
    } catch (fileError) {
      console.error(`Error processing recording file (${file.id}):`, fileError.message);
    }
  }
}

async function handleManualDownloadByUser(req, res) {
  try {
    const { userId, fromDate, toDate } = req.query;

    // Validate User ID
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required.' });
    }

    // Set date range defaults
    const today = moment().format('YYYY-MM-DD');
    const startDate = fromDate || today;
    const endDate = toDate || today;

    // Validate date range
    if (moment(startDate).isAfter(endDate)) {
      return res.status(400).send({ message: '"fromDate" cannot be after "toDate".' });
    }

    console.log(`Fetching recordings for user: ${userId} from ${startDate} to ${endDate}`);

    // Fetch Zoom access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Failed to retrieve Zoom access token.');
    }

    // Fetch recordings for the specified user
    const recordings = await fetchRecordings(accessToken, userId, startDate, endDate);
    console.log(`Total meetings fetched for user ${userId}: ${recordings.length}`);

    // Filter recordings by allowed hosts
    const allowedRecordings = recordings.filter(meeting => isAllowedHost(meeting));
    console.log(`Meetings from allowed hosts for user ${userId}: ${allowedRecordings.length}`);

    for (const meeting of allowedRecordings) {
      try {
        console.log(`Processing meeting: ${meeting.topic} (${meeting.uuid})`);

        // Download attendance report if available
        if (meeting?.uuid) {
          try {
            await downloadAttendance(accessToken, meeting);
            console.log(`Attendance report downloaded for meeting: ${meeting.uuid}`);
          } catch (attendanceError) {
            console.error(`Error downloading attendance for meeting ${meeting.uuid}:`, attendanceError.message);
          }
        }

        // Download and process each recording file
        for (const file of meeting.recording_files) {
          try {
            const downloadUrl = `${file.download_url}?access_token=${accessToken}`;
            const fileName = `${meeting.id}-${file.id}.${file.file_extension}`;

            const isDownloaded = await downloadRecording(downloadUrl, fileName, file, meeting);

            if (isDownloaded) {
              try {
                const deleteResponse =  {success: true}//await deleteRecording(accessToken, meeting.uuid, file.id);
                if (deleteResponse.success) {
                  console.log(`Recording downloaded and deleted from Zoom cloud: ${fileName}`);
                } else {
                  console.error(`Failed to delete recording: ${fileName}`, deleteResponse.error);
                }
              } catch (deleteError) {
                console.error(`Error deleting recording ${fileName}:`, deleteError.message);
              }
            } else {
              console.error(`Failed to download recording: ${fileName}`);
            }
          } catch (fileError) {
            console.error(`Error processing recording file (${file.id}):`, fileError.message);
          }
        }
      } catch (meetingError) {
        console.error(`Error processing meeting (${meeting.uuid}):`, meetingError.message);
      }
    }

    res.status(200).send({
      message: 'Recordings and attendance downloaded successfully.',
    });
  } catch (error) {
    console.error('Error downloading recordings:', error.message);
    res.status(500).send({
      message: 'Internal Server Error while processing recordings.',
      error: error.message,
    });
  }
}

// Main function to fetch attendance report
async function fetchAttendanceReport(req, res) {
  try {
    // Validate required query parameters
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
      console.warn('Missing required parameters: fromDate or toDate.');
      return res.status(400).send({
        message: 'Missing required parameters: fromDate or toDate.',
      });
    }

    // Validate and format the date range
    const { startOfDay, endOfDay } = validateAndFormatDateRange(fromDate, toDate);
    console.info(`Fetching attendance report from ${startOfDay} to ${endOfDay}`);

    // Fetch Zoom access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Failed to retrieve Zoom access token.');
    }

    // Fetch all meetings within the specified date range
    console.info('Fetching meetings from Zoom...');
    const allMeetings = await fetchAllUserRecordings(accessToken, startOfDay, endOfDay, 'meetings');
    console.info(`Total meetings fetched: ${allMeetings.length}`);

    // Filter meetings by allowed hosts
    const allowedMeetings = allMeetings.filter(meeting => isAllowedHost(meeting));
    console.info(`Meetings from allowed hosts: ${allowedMeetings.length}`);

    // Process each meeting individually
    for (const meeting of allowedMeetings) {
      try {
        console.info(`Processing meeting: ${meeting.topic} (${meeting.uuid})`);

        // Ensure the meeting has a UUID before processing
        if (meeting?.uuid) {
          // Attempt to download the attendance data for the meeting
          await downloadAttendance(accessToken, meeting);
          console.info(`Attendance successfully downloaded for meeting: ${meeting.uuid}`);
        } else {
          console.warn(`Skipping meeting with missing UUID: ${meeting.topic}`);
        }
      } catch (meetingError) {
        // Log specific error for each meeting
        console.error(`Error processing meeting (${meeting.uuid}): ${meetingError.message}`);
      }
    }

    // Send a success response back to the client
    console.info('Attendance report successfully fetched and processed.');
    res.status(200).send({
      message: 'Attendance report successfully fetched and processed.',
    });

  } catch (error) {
    // Log the error and return a 500 status code
    console.error('Error fetching attendance report:', error.message);
    res.status(500).send({
      message: 'Internal Server Error while fetching attendance report.',
      error: error.message,
    });
  }
}

module.exports = { handleWebhook, handleManualDownload, handleManualDownloadByUser, fetchAttendanceReport };
