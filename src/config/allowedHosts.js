// Configuration for allowed hosts whose recordings should be downloaded
// Add or remove email addresses as needed

const allowedHosts = [
  'iscacpd5@isca.org.sg',
  // Add more allowed hosts here if needed
  // 'another.host@isca.org.sg',
  // 'third.host@isca.org.sg',
];

module.exports = {
  allowedHosts,
  
  // Function to check if a host is allowed
  isAllowedHost: function(hostEmail) {
    return allowedHosts.some(allowedHost => {
      // Handle both exact match and partial match (for cases where # might be replaced)
      return hostEmail === allowedHost || hostEmail?.includes(allowedHost.replace('#', ''));
    });
  },
  
  // Function to get all allowed hosts
  getAllowedHosts: function() {
    return [...allowedHosts];
  }
}; 