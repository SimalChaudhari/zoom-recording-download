require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  DOWNLOAD_FOLDER: process.env.DOWNLOAD_FOLDER || "downloads",
  clientId: process.env.ZOOM_CLIENT_ID || "rg3Xyvh0RzOjHIG0mLgDXw",
  clientSecret: process.env.ZOOM_CLIENT_SECRET || "tr5U7nYd2nhsuaX4aWwtz19fYmzpfsgx",
  accountId: process.env.ZOOM_ACCOUNT_ID || "GrjrYUJ0R72wxMZUoDmgpg",
  zoomCloudApi: process.env.ZOOM_CLOUD_API,
  pageSize: process.env.PAGE_SIZE || 100,
  userIds: process.env.USER_IDS ? process.env.USER_IDS.split(',') : [],
};
