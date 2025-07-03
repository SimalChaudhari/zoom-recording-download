// Multi-tenant Zoom configuration
// Supports multiple Zoom tenant accounts with different API credentials

const tenants = {
  // Old tenant (current)
  'old': {
    name: 'Old Tenant (Current)',
    clientId: process.env.ZOOM_CLIENT_ID_OLD || "rg3Xyvh0RzOjHIG0mLgDXw",
    clientSecret: process.env.ZOOM_CLIENT_SECRET_OLD || "tr5U7nYd2nhsuaX4aWwtz19fYmzpfsgx",
    accountId: process.env.ZOOM_ACCOUNT_ID_OLD || "GrjrYUJ0R72wxMZUoDmgpg",
    zoomCloudApi: process.env.ZOOM_CLOUD_API_OLD || "https://api.zoom.us/v2",
    isActive: process.env.USE_OLD_TENANT === 'true' || false,
    allowedHosts: [
        'iscacpd*@isca.org.sg'  // Wildcard pattern for all iscacpd accounts
    ]
  },
  
  // New tenant (merged)
  'new': {
    name: 'New Tenant (Merged)',
    clientId: process.env.ZOOM_CLIENT_ID_NEW || "",
    clientSecret: process.env.ZOOM_CLIENT_SECRET_NEW || "",
    accountId: process.env.ZOOM_ACCOUNT_ID_NEW || "",
    zoomCloudApi: process.env.ZOOM_CLOUD_API_NEW || "https://api.zoom.us/v2",
    isActive: process.env.USE_NEW_TENANT === 'true' || true, // Default to new tenant
    allowedHosts: [
      'iscacpd*@isca.org.sg'  // Wildcard pattern for all iscacpd accounts
    ]
  }
};

// Get active tenant configuration
function getActiveTenant() {
  const activeTenant = Object.entries(tenants).find(([key, config]) => config.isActive);
  if (!activeTenant) {
    throw new Error('No active tenant found. Please configure at least one tenant as active.');
  }
  return {
    key: activeTenant[0],
    config: activeTenant[1]
  };
}

// Get specific tenant configuration
function getTenant(tenantKey) {
  const tenant = tenants[tenantKey];
  if (!tenant) {
    throw new Error(`Tenant '${tenantKey}' not found. Available tenants: ${Object.keys(tenants).join(', ')}`);
  }
  return tenant;
}

// List all tenants
function getAllTenants() {
  return Object.entries(tenants).map(([key, config]) => ({
    key,
    name: config.name,
    isActive: config.isActive,
    accountId: config.accountId
  }));
}

// Switch active tenant
function setActiveTenant(tenantKey) {
  if (!tenants[tenantKey]) {
    throw new Error(`Tenant '${tenantKey}' not found`);
  }
  
  // Deactivate all tenants
  Object.keys(tenants).forEach(key => {
    tenants[key].isActive = false;
  });
  
  // Activate specified tenant
  tenants[tenantKey].isActive = true;
  
  console.log(`Switched to tenant: ${tenants[tenantKey].name}`);
}

module.exports = {
  tenants,
  getActiveTenant,
  getTenant,
  getAllTenants,
  setActiveTenant
}; 