const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { generateZoomToken } = require("../utils/jwtToken");
const { DOWNLOAD_FOLDER } = require("../config/env");

async function downloadFile(downloadUrl, fileName) {
  const token = generateZoomToken();
  const filePath = path.join(DOWNLOAD_FOLDER, fileName);

  try {
    const response = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "stream",
    });

    // Save file to the downloads folder
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(`Downloaded: ${fileName}`);
        resolve();
      });
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`Error downloading file ${fileName}:`, error.message);
  }
}

module.exports = { downloadFile };
