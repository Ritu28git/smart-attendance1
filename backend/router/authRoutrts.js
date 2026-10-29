
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const {
  authenticate,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==================== LOGIN ====================
router.post("/login", async (req, res) => {
  try {
    const { employeeId, password } = req.body || {};

    if (
      typeof employeeId !== "string" ||
      !employeeId.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is missing in .env",
      });
    }

    const user = await User.findOne({
      employeeId: employeeId.trim(),
    }).select("+password");

    if (!user || !user.isActive || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid Employee ID or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Employee ID or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR DETAILS:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Login failed due to a server error",
    });
  }
});
  
  
 // ==================== FORGOT PASSWORD ====================
router.post("/forgot-password", async (req, res) => {
  const genericMessage =
    "If an account exists for this email, a password reset link will be sent.";

  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Registered email is required",
      });
    }

    if (
      !process.env.FRONTEND_URL ||
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS ||
      !process.env.MAIL_FROM
    ) {
      return res.status(500).json({
        success: false,
        message: "Email service configuration is incomplete",
      });
    }

    const user = await User.findOne({
      email,
      isActive: true,
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const frontendUrl = process.env.FRONTEND_URL.replace(/\/+$/, "");
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: "Smart Attendance - Reset Your Password",
        text:
          `Hello ${user.name},\n\n` +
          `Click the link below to reset your password:\n${resetUrl}\n\n` +
          `This link expires in 15 minutes. If you did not request this, ignore this email.`,
      });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      console.error("RESET EMAIL ERROR:", emailError.message);

      return res.status(500).json({
        success: false,
        message: "Email could not be sent. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request",
    });
  }
});

// ==================== RESET PASSWORD ====================
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link",
      });
    }

    if (typeof password !== "string" || password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 12 characters",
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must not exceed 128 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      isActive: true,
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link. Please request a new one.",
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password",
    });
  }
});


// ==================== INITIAL ADMIN SETUP ====================
// Use only for initial setup. Disable/remove after creating Admin.
router.post("/setup-admin", async (req, res) => {
  try {
    const setupSecret = process.env.ADMIN_SETUP_SECRET;
    const providedSecret = req.get("x-admin-setup-secret");

    if (!setupSecret) {
      return res.status(500).json({
        success: false,
        message: "ADMIN_SETUP_SECRET is missing in .env",
      });
    }

    if (!providedSecret || providedSecret !== setupSecret) {
      return res.status(403).json({
        success: false,
        message: "Invalid setup secret",
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
        message: "Enter name, employee ID, email, and a password of at least 12 characters",
      });
    }

    const normalizedId = employeeId.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const adminExists = await User.exists({ role: "admin" });

    if (adminExists) {
      return res.status(403).json({
        success: false,
        message: "An Admin already exists. Setup is disabled",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { employeeId: normalizedId },
        { email: normalizedEmail },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists",
      });
    }

    const admin = await User.create({
      name: name.trim(),
      employeeId: normalizedId,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: "admin",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Initial Admin created successfully",
      user: {
        id: admin._id,
        name: admin.name,
        employeeId: admin.employeeId,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("ADMIN SETUP ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Admin setup failed",
    });
  }
});

// ==================== ADMIN-ONLY EMPLOYEE REGISTRATION ====================
router.post("/register", authenticate, adminOnly, async (req, res) => {
  try {
    const {
      name,
      employeeId,
      email,
      password,
      department,
      designation,
      faceDescriptor,
    } = req.body || {};

    if (
      typeof name !== "string" || !name.trim() ||
      typeof employeeId !== "string" || !employeeId.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, Employee ID, email and password are required",
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 12 characters",
      });
    }

    const hasValidDescriptor =
      Array.isArray(faceDescriptor) &&
      faceDescriptor.length === 128 &&
      faceDescriptor.every((n) => Number.isFinite(n));

    const normalizedEmployeeId = employeeId.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({
      $or: [
        { employeeId: normalizedEmployeeId },
        { email: normalizedEmail },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists",
      });
    }

    const employee = await User.create({
      name: name.trim(),
      employeeId: normalizedEmployeeId,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      department: typeof department === "string" ? department.trim() : "",
      designation: typeof designation === "string" ? designation.trim() : "",
      faceDescriptor: hasValidDescriptor ? faceDescriptor : [],
      faceEnrolledAt: hasValidDescriptor ? new Date() : null,
      role: "employee",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Employee registered successfully",
      employee: {
        id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        role: employee.role,
        email: employee.email,
      },
    });
  } catch (error) {
    console.error("REGISTRATION ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Employee registration failed",
    });
  }
});

module.exports = router;
