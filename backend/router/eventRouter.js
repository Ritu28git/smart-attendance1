const express = require("express");
const Event = require("../models/Event");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin and Employee: View all events
router.get("/", protect, async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
});

// Admin: Add event
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { title, type, date } = req.body;

    if (!title?.trim() || !date) {
      return res.status(400).json({
        success: false,
        message: "Title and date are required",
      });
    }

    const event = await Event.create({
      title: title.trim(),
      type: type || "holiday",
      date,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add event",
    });
  }
});

// Admin: Edit event
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { title, type, date } = req.body;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { title, type, date },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
});

// Admin: Delete event
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
});

module.exports = router;