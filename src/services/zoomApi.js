const axios = require("axios");
const { generateZoomToken } = require("../utils/jwtToken");
const { ZOOM_USER_ID } = require("../config/env");

const ZOOM_BASE_URL = "https://api.zoom.us/v2";

async function fetchRecordings() {
  const token = generateZoomToken();
  try {
    const response = await axios.get(`${ZOOM_BASE_URL}/users/${ZOOM_USER_ID}/recordings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.meetings || [];
  } catch (error) {
    console.log(error.response)
    console.error("Error fetching recordings:", error.response?.data || error.message);
    return [];
  }
}

module.exports = { fetchRecordings };
