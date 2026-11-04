
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");

const {
  authenticate,
  branchManagerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();


// ==================== GET EMPLOYEES ====================

router.get("/", authenticate, branchManagerOnly, async (req, res) => {
  try {
    const filter = {
      role: "employee",
    };

    // Sub-Admin can only see employees of their assigned branch
    if (req.user.role === "subadmin") {
      filter.branchId = req.user.branchId;
    }

    const employees = await User.find(filter)
      .select("name employeeId email department designation isActive branchId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Fetch employees error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
});


// ==================== UPDATE EMPLOYEE ====================

router.put("/:id", authenticate, branchManagerOnly, async (req, res) => {
  try {
    const {
      name,
      employeeId,
      email,
      department,
      designation,
    } = req.body || {};

    if (
      typeof name !== "string" || !name.trim() ||
      typeof employeeId !== "string" || !employeeId.trim() ||
      typeof email !== "string" || !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, Employee ID and email are required.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID.",
      });
    }

    const filter = {
      _id: req.params.id,
      role: "employee",
    };

    // Sub-Admin can only update employees in their own branch
    if (req.user.role === "subadmin") {
      filter.branchId = req.user.branchId;
    }

    const employee = await User.findOne(filter);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in your assigned branch.",
      });
    }

    const normalizedEmployeeId = employeeId.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const duplicate = await User.findOne({
      _id: { $ne: employee._id },
      $or: [
        { employeeId: normalizedEmployeeId },
        { email: normalizedEmail },
      ],
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This Employee ID or email is already in use.",
      });
    }

    employee.name = name.trim();
    employee.employeeId = normalizedEmployeeId;
    employee.email = normalizedEmail;
    employee.department =
      typeof department === "string" ? department.trim() : "";
    employee.designation =
      typeof designation === "string" ? designation.trim() : "";

    await employee.save();

    res.status(200).json({
      success: true,
      message: "Employee details updated successfully.",
      employee: {
        _id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        branchId: employee.branchId,
      },
    });
  } catch (error) {
    console.error("Update employee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update employee details.",
    });
  }
});

module.exports = router;
