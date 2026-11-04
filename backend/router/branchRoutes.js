
const mongoose = require("mongoose");
const express = require("express");
const bcrypt = require("bcryptjs");

const Branch = require("../models/Branch");
const User = require("../models/User");

const {
  authenticate,
  superAdminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Only Super Admin can manage branches
router.use(authenticate, superAdminOnly);

// GET ALL BRANCHES
router.get("/", async (req, res) => {
  try {
    const branches = await Branch.find().sort({ name: 1 });

    res.json({ success: true, branches });
  } catch (error) {
    console.error("Get branches error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch branches",
    });
  }
});

// CREATE BRANCH
router.post("/", async (req, res) => {
  try {
    const { name, code, address = "" } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof code !== "string" ||
      !code.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Branch name and code are required",
      });
    }

    const branch = await Branch.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: typeof address === "string" ? address.trim() : "",
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, branch });
  } catch (error) {
    console.error("Create branch error:", error);
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error.code === 11000
          ? "Branch code already exists"
          : "Could not create branch",
    });
  }
});

// UPDATE BRANCH
router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    const updates = {};

    ["name", "address", "isActive"].forEach((key) => {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    res.json({ success: true, branch });
  } catch (error) {
    console.error("Update branch error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update branch",
    });
  }
});

// CREATE SUB-ADMIN FOR A BRANCH
router.post("/:id/subadmins", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    const branch = await Branch.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Active branch not found",
      });
    }

    const { name, employeeId, email, password } = req.body || {};

    if (
      typeof name !== "string" || !name.trim() ||
      typeof employeeId !== "string" || !employeeId.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || password.length < 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, employee ID, email and password (minimum 12 characters) are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedId = employeeId.trim();

    const existing = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { employeeId: normalizedId },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email or employee ID already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const subadmin = await User.create({
      name: name.trim(),
      employeeId: normalizedId,
      email: normalizedEmail,
      password: hashedPassword,
      role: "subadmin",
      branchId: branch._id,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      subadmin: {
        id: subadmin._id,
        name: subadmin.name,
        employeeId: subadmin.employeeId,
        email: subadmin.email,
        role: subadmin.role,
        branchId: branch._id,
      },
    });
  } catch (error) {
    console.error("Create subadmin error:", error);
    res.status(500).json({
      success: false,
      message: "Could not create Sub-Admin",
    });
  }
});

// ASSIGN EXISTING EMPLOYEES TO A BRANCH
router.patch("/:id/assign-employees", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    const branch = await Branch.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Active branch not found",
      });
    }

    const { employeeIds } = req.body || {};

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "employeeIds array is required",
      });
    }

    const invalidIds = employeeIds.some(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID found",
      });
    }

    const result = await User.updateMany(
      {
        _id: { $in: employeeIds },
        role: "employee",
      },
      {
        $set: { branchId: branch._id },
      }
    );

    res.json({
      success: true,
      assignedCount: result.modifiedCount,
      branchId: branch._id,
    });
  } catch (error) {
    console.error("Assign employees error:", error);
    res.status(500).json({
      success: false,
      message: "Could not assign employees",
    });
  }
});

// GET SUB-ADMINS OF A BRANCH
router.get("/:id/subadmins", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    const subadmins = await User.find({
      role: "subadmin",
      branchId: req.params.id,
    }).select("name employeeId email isActive branchId");

    res.json({ success: true, subadmins });
  } catch (error) {
    console.error("Get subadmins error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch Sub-Admins",
    });
  }
});

module.exports = router;
