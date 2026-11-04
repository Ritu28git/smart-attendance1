
const express = require("express");

const {
  protect,
  branchManagerOnly,
} = require("../middleware/authMiddleware");

const {
  checkIn,
  checkOut,
  startLunch,
  endLunch,
  uploadPhoto,
  getHistory,
  getAllAttendance,
  verifyFace,
} = require("../controllers/attendanceController");

const {
  updateMyLocation,
  getLiveEmployeeLocations,
} = require("../controllers/locationController");

const router = express.Router();


// ==================== EMPLOYEE ROUTES ====================

// Check-in
router.post("/check-in", protect, checkIn);

// Check-out
router.post("/check-out", protect, checkOut);

// Lunch break
router.post("/lunch/start", protect, startLunch);
router.post("/lunch/end", protect, endLunch);

// Photo upload
router.post("/photo", protect, uploadPhoto);

// Face verification
router.post("/verify-face", protect, verifyFace);

// Employee's own attendance history
router.get("/history", protect, getHistory);

// Employee's own live location
router.post("/location", protect, updateMyLocation);


// ==================== ADMIN / SUB-ADMIN ROUTES ====================

// Super Admin: all branches
// Sub-Admin: own branch only (controller must enforce this)
router.get(
  "/admin/live-locations",
  protect,
  branchManagerOnly,
  getLiveEmployeeLocations
);

router.get(
  "/admin",
  protect,
  branchManagerOnly,
  getAllAttendance
);

module.exports = router;
