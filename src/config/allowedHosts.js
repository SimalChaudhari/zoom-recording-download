// Configuration for allowed hosts whose recordings should be downloaded
// Add or remove email addresses as needed
// Supports wildcard patterns like: iscacpd*@isca.org.sg

const { getActiveTenant } = require('./tenants');

// Get allowed hosts from active tenant configuration
function getAllowedHostsList() {
  const activeTenant = getActiveTenant();
  return activeTenant.config.allowedHosts || [];
}

const allowedHosts = getAllowedHostsList();

module.exports = {
  allowedHosts,
  
  // Function to check if a host is allowed
  isAllowedHost: function(hostEmail) {
    if (!hostEmail) return false;
    
    return allowedHosts.some(allowedHost => {
      // Convert wildcard pattern to regex
      const pattern = allowedHost
        .replace(/\./g, '\\.')  // Escape dots
        .replace(/\*/g, '.*')   // Convert * to regex wildcard
        .replace(/\?/g, '.')    // Convert ? to regex single character
        .replace(/#/g, '');     // Remove # characters
      
      const regex = new RegExp(`^${pattern}$`, 'i'); // Case insensitive match
      
      return regex.test(hostEmail);
    });
  },
  
  // Function to get all allowed hosts
  getAllowedHosts: function() {
    return [...allowedHosts];
  },
  
  // Function to test if an email matches any pattern (for debugging)
  testPattern: function(testEmail) {
    const matches = [];
    allowedHosts.forEach(pattern => {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/#/g, '');
      
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      if (regex.test(testEmail)) {
        matches.push(pattern);
      }
    });
    return matches;
  }
}; 