require('dotenv').config();
const { getAccessToken, fetchRecordings, downloadRecording } = require('./utils/apiClient');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    // Ensure downloads folder exists
    const downloadsFolder = path.resolve(__dirname, './downloads');
    if (!fs.existsSync(downloadsFolder)) {
      fs.mkdirSync(downloadsFolder);
    }

    // Get access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Failed to retrieve access token.');
    }

    // Read user IDs from .env file
    const userIds = process.env.USER_IDS ? process.env.USER_IDS.split(',') : [];
    if (userIds.length === 0) {
      throw new Error('No user IDs provided in the .env file.');
    }

    for (const userId of userIds) {
      console.log(`Fetching recordings for user: ${userId}`);

      // Fetch recordings for the user
      const meetings = await fetchRecordings(accessToken, userId.trim());
      if (!meetings || meetings.length === 0) {
        console.log(`No recordings found for user: ${userId}`);
        continue;
      }

      for (const meeting of meetings) {
        for (const file of meeting.recording_files) {
          try {
            console.log(`Downloading: ${file.download_url}`);

            // Add access token to download URL
            const downloadUrl = `${file.download_url}?access_token=${accessToken}`;
            const fileName = path.join(
              downloadsFolder,
              `${meeting.id}-${file.id}.mp4`
            );

            await downloadRecording(downloadUrl, fileName);
            console.log(`Downloaded: ${fileName}`);
          } catch (fileError) {
            console.error(
              `Failed to download recording file: ${file.download_url}`,
              fileError.message
            );
          }
        }
      }
    }

    console.log('All recordings downloaded successfully.');
  } catch (error) {
    console.error('Error in downloading recordings:', error.message);
  }
})();
