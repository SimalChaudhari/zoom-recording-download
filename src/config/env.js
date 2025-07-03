require("dotenv").config();
const { getActiveTenant } = require('./tenants');

// Get active tenant configuration
const activeTenant = getActiveTenant();

module.exports = {
  port: process.env.PORT || 3000,
  DOWNLOAD_FOLDER: process.env.DOWNLOAD_FOLDER || "downloads",
  
  // Zoom credentials from active tenant
  clientId: activeTenant.config.clientId,
  clientSecret: activeTenant.config.clientSecret,
  accountId: activeTenant.config.accountId,
  zoomCloudApi: activeTenant.config.zoomCloudApi,
  
  // Tenant information
  activeTenantKey: activeTenant.key,
  activeTenantName: activeTenant.config.name,
  
  pageSize: process.env.PAGE_SIZE || 100,
  userIds: process.env.USER_IDS ? process.env.USER_IDS.split(',') : [],
};
