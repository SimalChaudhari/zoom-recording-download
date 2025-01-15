require('dotenv').config();
const axios = require('axios');
const credentials = require('../config/env');
const moment = require('moment');

/**
 * Axios instance configured for Zoom API requests
 */
const apiClient = axios.create({
  baseURL: credentials.zoomCloudApi,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Generates and returns a Zoom access token using client credentials
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  const url = 'https://zoom.us/oauth/token';
  const authHeader = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');

  try {
    const response = await axios.post(url, null, {
      params: {
        grant_type: 'account_credentials',
        account_id: credentials.accountId,
      },
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    console.log('Access token successfully retrieved');
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error.response?.data || error.message);
    throw new Error('Failed to retrieve access token. Please check your Zoom API credentials.');
  }
}

/**
 * Makes an authenticated API request using the Zoom access token
 * @param {Object} options - Axios request options (method, url, data, etc.)
 * @returns {Promise<Object>} Response data from the API
 */
async function makeAuthenticatedRequest(options) {
  try {
    const accessToken = await getAccessToken();
    const response = await apiClient({
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error making authenticated request:', error.response?.data || error.message);
    throw new Error(`API request failed: ${error.message}`);
  }
}

module.exports = { getAccessToken, makeAuthenticatedRequest };
