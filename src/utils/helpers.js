const fs = require("fs");
const path = require("path");

function createFolderIfNotExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

module.exports = { createFolderIfNotExists };
