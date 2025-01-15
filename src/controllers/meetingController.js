const zoomService = require("../services/meetingService");

async function createMeeting(req, res) {
  try {
    const { userId } = req.params;
    const meetingDetails = req.body;

    const meeting = await zoomService.createMeeting(userId, meetingDetails);
    res.status(201).json({ message: "Meeting created successfully", meeting });
  } catch (error) {
    console.error("Error creating meeting:", error.message);
    res.status(500).json({ error: "Failed to create meeting", message: error.message });
  }
}

async function updateMeeting(req, res) {
  try {
    const { meetingId } = req.params;
    const updateDetails = req.body;

    const updatedMeeting = await zoomService.updateMeeting(meetingId, updateDetails);
    res.status(200).json({ message: "Meeting updated successfully", updatedMeeting });
  } catch (error) {
    console.error("Error updating meeting:", error.message);
    res.status(500).json({ error: "Failed to update meeting", message: error.message });
  }
}

async function deleteMeeting(req, res) {
  try {
    const { meetingId } = req.params;

    await zoomService.deleteMeeting(meetingId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting meeting:", error.message);
    res.status(500).json({ error: "Failed to delete meeting", message: error.message });
  }
}

async function listUserMeetings(req, res) {
  try {
    const { userId } = req.params;

    const meetings = await zoomService.listMeetings(userId);
    res.status(200).json({ meetings });
  } catch (error) {
    console.error("Error listing user meetings:", error.message);
    res.status(500).json({ error: "Failed to list meetings", message: error.message });
  }
}

async function listAllMeetings(req, res) {
  try {
    const meetings = [];

    const users = await zoomService.listAllUsers(); // Fetch all Zoom users
    for (const user of users) {
      const userMeetings = await zoomService.listMeetings(user.id); // Fetch meetings for each user
      meetings.push(...userMeetings);
    }

    res.status(200).json({ meetings });
  } catch (error) {
    console.error("Error listing all meetings:", error.message);
    res.status(500).json({ error: "Failed to list all meetings", message: error.message });
  }
}

async function rescheduleMeeting(req, res) {
  try {
    const { meetingId } = req.params;
    const { start_time } = req.body;

    const updatedMeeting = await zoomService.updateMeeting(meetingId, { start_time });
    res.status(200).json({ message: "Meeting rescheduled successfully", updatedMeeting });
  } catch (error) {
    console.error("Error rescheduling meeting:", error.message);
    res.status(500).json({ error: "Failed to reschedule meeting", message: error.message });
  }
}

module.exports = {
  createMeeting,
  updateMeeting,
  deleteMeeting,
  listUserMeetings,
  listAllMeetings,
  rescheduleMeeting,
};
