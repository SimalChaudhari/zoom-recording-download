const apiClient = require("../utils/apiClient");
const { generateZoomToken } = require("../utils/jwtToken");

// Fetch all users from Zoom
async function listAllUsers() {
  const token = generateZoomToken();
  const response = await apiClient.get("/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.users || [];
}

// Create a new meeting
async function createMeeting(userId, meetingDetails) {
  const token = generateZoomToken();
  const response = await apiClient.post(`/users/${userId}/meetings`, meetingDetails, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// List all meetings for a specific user
async function listMeetings(userId) {
  const token = generateZoomToken();
  const response = await apiClient.get(`/users/${userId}/meetings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.meetings || [];
}

// Get details of a specific meeting
async function getMeetingDetails(meetingId) {
  const token = generateZoomToken();
  const response = await apiClient.get(`/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// Update a meeting
async function updateMeeting(meetingId, updateDetails) {
  const token = generateZoomToken();
  const response = await apiClient.patch(`/meetings/${meetingId}`, updateDetails, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// Delete a meeting
async function deleteMeeting(meetingId) {
  const token = generateZoomToken();
  await apiClient.delete(`/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return true;
}

module.exports = {
  listAllUsers,
  createMeeting,
  listMeetings,
  getMeetingDetails,
  updateMeeting,
  deleteMeeting,
};
