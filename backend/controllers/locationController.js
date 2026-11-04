
const Attendance = require("../models/Attendance");
const User = require("../models/User");

// Employee ki live location update karna
async function updateMyLocation(req, res) {
  try {
    const { latitude, longitude, accuracy } = req.body || {};

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude required.",
      });
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const now = new Date();

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: today,
      checkIn: { $ne: null },
    });

    if (attendance) {
      attendance.location = { latitude, longitude };
      await attendance.save();
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        lastLocation: {
          latitude,
          longitude,
          accuracy:
            typeof accuracy === "number" && Number.isFinite(accuracy)
              ? accuracy
              : null,
          updatedAt: now,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Location updated successfully.",
    });
  } catch (err) {
    console.error("Update location error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update location.",
    });
  }
}


// Admin / Sub-Admin ke liye live employee locations
async function getLiveEmployeeLocations(req, res) {
  try {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // Super Admin: all branches
    // Sub-Admin: only assigned branch
    const employeeFilter = {
      role: "employee",
    };

    if (req.user.role === "subadmin") {
      if (!req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: "No branch is assigned to this Sub-Admin.",
        });
      }

      employeeFilter.branchId = req.user.branchId;
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view employee locations.",
      });
    }

    const usersWithLocation = await User.find({
      ...employeeFilter,
      "lastLocation.latitude": { $exists: true, $ne: null },
    }).select(
      "name employeeId department designation lastLocation branchId"
    );

    const employeeMap = new Map();

    usersWithLocation.forEach((emp) => {
      const location = emp.lastLocation;

      if (
        location &&
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude)
      ) {
        employeeMap.set(emp._id.toString(), {
          _id: emp._id,
          name: emp.name,
          employeeId: emp.employeeId,
          department: emp.department || "",
          designation: emp.designation || "",
          branchId: emp.branchId || null,
          lastLocation: location,
          status: "active",
        });
      }
    });

    // Today's attendance status
    const employeeIds = Array.from(employeeMap.keys());

    const todayAttendances = employeeIds.length
      ? await Attendance.find({
          date: today,
          employee: { $in: employeeIds },
          checkIn: { $ne: null },
        })
          .populate(
            "employee",
            "name employeeId department designation branchId"
          )
          .sort({ checkIn: -1 })
      : [];

    todayAttendances.forEach((att) => {
      const emp = att.employee;

      if (!emp) return;

      const empIdStr = emp._id.toString();
      const existing = employeeMap.get(empIdStr);

      if (!existing) return;

      const location =
        att.location &&
        Number.isFinite(att.location.latitude) &&
        Number.isFinite(att.location.longitude)
          ? {
              latitude: att.location.latitude,
              longitude: att.location.longitude,
              accuracy: null,
              updatedAt: att.checkIn,
            }
          : null;

      if (location) {
        const userLocationTime = existing.lastLocation?.updatedAt
          ? new Date(existing.lastLocation.updatedAt).getTime()
          : 0;

        const attendanceLocationTime = new Date(
          location.updatedAt
        ).getTime();

        if (attendanceLocationTime > userLocationTime) {
          existing.lastLocation = location;
        }
      }

      existing.status = att.checkOut
        ? "checked-out"
        : att.lunchStart && !att.lunchEnd
        ? "on-lunch"
        : "working";
    });

    const employees = Array.from(employeeMap.values());

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
      locations: employees,
    });
  } catch (err) {
    console.error("Get live locations error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch live locations.",
    });
  }
}

module.exports = {
  updateMyLocation,
  getLiveEmployeeLocations,
};
