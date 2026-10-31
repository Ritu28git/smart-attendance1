const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dns = require("dns");
const eventRoutes = require("./router/eventRoutes");
require("dotenv").config();

// Ensure DNS resolves MongoDB SRV records properly on Windows and varied networks
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore if not supported in runtime
}

const app = express();
app.use("/api/events", eventRoutes);
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

let dbConnectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment variables");
  }

  if (!dbConnectionPromise) {
    dbConnectionPromise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .then((conn) => {
        console.log("MongoDB Connected Successfully");
        return conn;
      })
      .catch((error) => {
        dbConnectionPromise = null;
        console.error("MongoDB Connection Error:", error.message);
        throw error;
      });
  }

  return dbConnectionPromise;
};

// Database connection middleware — runs before API routes
app.use(async (req, res, next) => {
  // Allow root and test route without waiting for DB
  if (req.path === "/" || req.path === "/api/auth/test") {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database unavailable:", error.message);

    res.status(503).json({
      success: false,
      message: "Database connection failed. Make sure your IP is added to MongoDB Atlas Network Access (or add 0.0.0.0/0).",
      error: error.message,
    });
  }
});


app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Smart Attendance API is running",
  });
});


// Routes
const authRoutes = require("./router/authRoutrts");
const attendanceRoutes = require("./router/attendanceRoutes");
const employeeRoutes = require("./router/employeeRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/employees", employeeRoutes);

app.get("/api/auth/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth test route working",
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Attendance API is running",
  });
});

app.get("/.netlify/functions/api/api/auth/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth test route working",
  });
});
// Local development server startup
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  connectDB()
    .then(() => {
      console.log("Database connected successfully at startup");
    })
    .catch((err) => {
      console.warn("Initial DB connection warning (will retry on incoming request):", err.message);
    });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, connectDB };
