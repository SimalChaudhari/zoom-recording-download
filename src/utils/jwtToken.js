const jwt = require("jsonwebtoken");
const { clientId, clientSecret } = require("../config/env");

const generateZoomToken = () => {
    const payload = {
        iss: clientId, // Client ID
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expiration time
    };

    const secret = clientSecret; // Secret from .env

    if (!secret) {
        throw new Error('ZOOM_CLIENT_SECRET is missing in the environment variables.');
    }

    return jwt.sign(payload, secret);
};

module.exports = { generateZoomToken };
