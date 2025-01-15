const jwt = require("jsonwebtoken");
const credentials = require("../config/env");

function generateZoomToken() {
  const payload = {
    iss: credentials.clientId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token valid for 1 hour
  };

  return jwt.sign(payload, credentials.clientSecret);
}

module.exports = { generateZoomToken };
