
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account not found or inactive",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}


// Only Super Admin
function superAdminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Only Super Admin can perform this action",
    });
  }

  next();
}


// Backward compatibility with existing admin routes
const adminOnly = superAdminOnly;


// Super Admin OR Sub-Admin
function branchManagerOnly(req, res, next) {
  if (
    !req.user ||
    !["admin", "subadmin"].includes(req.user.role)
  ) {
    return res.status(403).json({
      success: false,
      message: "Only Admin or Sub-Admin can perform this action",
    });
  }

  if (req.user.role === "subadmin" && !req.user.branchId) {
    return res.status(403).json({
      success: false,
      message: "No branch assigned to this Sub-Admin",
    });
  }

  next();
}


module.exports = {
  authenticate,
  adminOnly,
  superAdminOnly,
  branchManagerOnly,
  protect: authenticate,
};
