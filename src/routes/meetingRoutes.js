const express = require("express");
const meetingController = require("../controllers/meetingController");

const router = express.Router();

// Admin functionalities
router.post("/users/:userId/meetings", meetingController.createMeeting); // Create meeting for a user
router.patch("/meetings/:meetingId", meetingController.updateMeeting);   // Update meeting
router.delete("/meetings/:meetingId", meetingController.deleteMeeting);  // Delete meeting
router.get("/users/:userId/meetings", meetingController.listUserMeetings); // List meetings for a user
router.get("/meetings", meetingController.listAllMeetings);              // List all meetings (for all users)
router.patch("/meetings/:meetingId/reschedule", meetingController.rescheduleMeeting); // Reschedule meeting

module.exports = router;
