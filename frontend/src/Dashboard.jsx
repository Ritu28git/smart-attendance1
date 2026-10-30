import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadFaceModels, getFaceDescriptor } from "./faceRecognition";
import {
  Camera,
  Clock,
  Clock3,
  LogIn,
  LogOut,
  Coffee,
  History,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Hourglass,
  CalendarOff,
  Sparkles,
  LayoutDashboard,
  CalendarCheck,
  User,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Building,
  Mail,
  BadgeCheck,
  MapPin,
} from "lucide-react";

import { API_URL as API } from "./apiConfig";
function getToken() {
  return localStorage.getItem("token");
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
}

function formatDuration(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTodayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getAttendanceDateKey(record) {
  if (record?.date) {
    const rawDate = String(record.date);
    if (/^\\d{4}-\\d{2}-\\d{2}/.test(rawDate)) return rawDate.slice(0, 10);
  }
  const value = record?.checkIn || record?.date;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isSundayToday() {
  const dayStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" });
  return dayStr === "Sun";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getInitials(name) {
  if (!name) return "EP";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }
  return data;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [events, setEvents] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Navigation tab state: 'dashboard' | 'attendance' | 'profile' | 'history' | 'settings'
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchHistory, setSearchHistory] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // Sidebar responsive state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live real-time clock for top bar
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);
  // Working & Lunch timers
  const [workingSeconds, setWorkingSeconds] = useState(0);
  const [lunchSeconds, setLunchSeconds] = useState(0);

  // Camera & Verification modal
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const pendingActionRef = useRef(null);
  const locationWatchRef = useRef(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  // Testing Mode Toggle (persisted in localStorage so refreshes don't reset testing mode)
  const [simulateWorkday, setSimulateWorkday] = useState(() => {
    return localStorage.getItem("simulateWorkday") === "true";
  });

  const toggleSimulateWorkday = () => {
    setSimulateWorkday((prev) => {
      const next = !prev;
      localStorage.setItem("simulateWorkday", String(next));
      return next;
    });
  };

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      "x-bypass-sunday": localStorage.getItem("simulateWorkday") === "true" || simulateWorkday ? "true" : "false",
    }),
    [simulateWorkday]
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  }, [navigate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = getToken();
      if (!token) {
        handleLogout();
        return;
      }

      // Restore user from storage
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "null");
        setUser(storedUser);
      } catch {
        setUser(null);
      }

      const response = await fetch(`${API}/attendance/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const data = await readResponse(response);
      const list = Array.isArray(data.records)
        ? data.records
        : Array.isArray(data.history)
        ? data.history
        : Array.isArray(data.attendance)
        ? data.attendance
        : [];
      setRecords(list);

      // Load admin-created company events and holidays for the employee calendar.
      // This is kept separate so a missing events endpoint does not break attendance loading.
      try {
        const eventsResponse = await fetch(`${API}/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json().catch(() => ({}));
          const eventList = Array.isArray(eventsData)
            ? eventsData
            : Array.isArray(eventsData.events)
            ? eventsData.events
            : Array.isArray(eventsData.data)
            ? eventsData.data
            : [];
          setEvents(eventList);
        } else {
          console.warn("Could not load calendar events:", eventsResponse.status);
          setEvents([]);
        }
      } catch (eventsError) {
        console.warn("Could not load calendar events:", eventsError);
        setEvents([]);
      }

      const todayStr = getTodayIST();
      const currentToday = list.find(item => {
        if (!item) return false;
        // Prefer checkIn date if available, else use stored date field
        const sourceDate = item.checkIn ? new Date(item.checkIn) : (item.date ? new Date(item.date) : null);
        if (!sourceDate) return false;
        const isoDate = sourceDate.toISOString().split('T')[0];
        return isoDate === todayStr;
      }) || null;
      setTodayRecord(currentToday);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes("token")) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(err.message || "Failed to load attendance data.");
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Working & Lunch Timer Engine
  useEffect(() => {
    const updateTimers = () => {
      if (!todayRecord || !todayRecord.checkIn) {
        setWorkingSeconds(0);
        setLunchSeconds(0);
        return;
      }

      const checkInTime = new Date(todayRecord.checkIn).getTime();
      const checkOutTime = todayRecord.checkOut ? new Date(todayRecord.checkOut).getTime() : null;
      const lunchStartTime = todayRecord.lunchStart ? new Date(todayRecord.lunchStart).getTime() : null;
      const lunchEndTime = todayRecord.lunchEnd ? new Date(todayRecord.lunchEnd).getTime() : null;

      const now = Date.now();
      const currentEffectiveEnd = checkOutTime || now;

      // Calculate Lunch duration
      let calculatedLunchDurationMs = 0;
      if (lunchStartTime) {
        if (lunchEndTime) {
          calculatedLunchDurationMs = Math.max(0, lunchEndTime - lunchStartTime);
        } else {
          calculatedLunchDurationMs = Math.max(0, currentEffectiveEnd - lunchStartTime);
        }
      }
      setLunchSeconds(Math.floor(calculatedLunchDurationMs / 1000));

      // Calculate pure working time (office presence minus lunch duration)
      const totalOfficeTimeMs = Math.max(0, currentEffectiveEnd - checkInTime);
      const pureWorkTimeMs = Math.max(0, totalOfficeTimeMs - calculatedLunchDurationMs);
      setWorkingSeconds(Math.floor(pureWorkTimeMs / 1000));
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [todayRecord]);

  // Camera Management
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setCameraOpen(false);
  }, []);


const openCamera = useCallback(async (action) => {
  setError("");
  setMessage("");
  setCameraError("");
  setCameraReady(false);
  pendingActionRef.current = action;

  if (!navigator.mediaDevices?.getUserMedia) {
    setCameraError("Camera requires localhost or HTTPS.");
    setCameraOpen(true);
    return;
  }

  // Stop any previous camera stream
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // Pre-fetch live GPS location immediately when camera opens
  setCurrentCoords(null);
  if (navigator.geolocation) {
    setLocationStatus("fetching");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationStatus("ready");
      },
      (err) => {
        console.warn("Camera modal geolocation warning:", err.message);
        setLocationStatus(err.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    setLocationStatus("unsupported");
  }

  setCameraOpen(true);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15, max: 20 },
      },
      audio: false,
    });

    streamRef.current = stream;

    const video = videoRef.current;

    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      throw new Error("Camera preview element not found.");
    }

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    await video.play();

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setCameraReady(true);
    } else {
      video.onloadedmetadata = () => {
        setCameraReady(true);
      };
    }
  } catch (err) {
    console.error("Camera startup error:", err);

    if (err.name === "NotReadableError") {
      setCameraError("Camera is busy. Close other apps using the camera.");
    } else if (err.name === "NotAllowedError") {
      setCameraError("Camera permission denied. Allow camera access in your browser.");
    } else {
      setCameraError(err.message || "Unable to start camera.");
    }
  }
}, []);


     useEffect(() => {
  return () => {
    // Camera stop
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Location tracking stop
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
  };
}, []);

  const stopLocationTracking = () => {
    if (locationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
  };

  const sendLocation = async (position) => {
    try {
      await readResponse(
        await fetch(`${API}/attendance/location`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        })
      );
      setMessage("Location tracking is active.");
    } catch (err) {
      console.error("Location update failed:", err);
      setError(`Location save failed: ${err.message}`);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setError("This browser does not support location tracking.");
      return;
    }
    if (!window.isSecureContext) {
      setError("Location needs a secure connection. Use localhost or HTTPS.");
      return;
    }
    if (locationWatchRef.current !== null) return;

    // Ask for a fresh position first; this should trigger the browser permission prompt.
    navigator.geolocation.getCurrentPosition(
      (position) => { void sendLocation(position); },
      (err) => {
        console.error("Location permission/error:", err);
        const message = err.code === 1
          ? "Location permission is blocked. Browser site settings mein Location ko Allow karo."
          : err.code === 2
          ? "Current location unavailable. Turn on device location services and try again."
          : "Location request timed out. Check location settings and try again.";
        setError(message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    locationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => { void sendLocation(position); },
      (err) => {
        console.error("Location watch error:", err);
        if (err.code === 1) {
          setError("Location permission is blocked. Browser site settings mein Location ko Allow karo.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  };

  const captureAndSubmit = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera preview is loading. Please wait 2 seconds.");
      return;
    }
    const action = pendingActionRef.current;
    let faceDescriptor = null;
    try {
      faceDescriptor = await getFaceDescriptor(video);
    } catch (err) {
      console.warn("Face landmark detection note:", err.message);
      // In low light, fallback to dummy descriptor so live selfie photo can still be captured and saved
      faceDescriptor = new Array(128).fill(0);
    }

    // Capture live selfie photo snapshot from camera
    let selfiePhoto = null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      selfiePhoto = canvas.toDataURL("image/jpeg", 0.7);
    } catch (snapErr) {
      console.warn("Could not capture video snapshot:", snapErr);
    }

    setBusy(true);
    setCameraError("");
    setError("");
    setMessage("");

    try {
      // 1. Verify face/photo with backend
      const verification = await readResponse(
        await fetch(`${API}/attendance/verify-face`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ faceDescriptor }),
        })
      );
      if (!verification.verified) throw new Error(verification.message || "Face verification failed.");

      // 2. Capture live GPS coordinates at the exact moment of capture
      let locCoords = currentCoords;
      if (!locCoords && navigator.geolocation) {
        try {
          locCoords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                resolve({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                }),
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
          });
        } catch {
          locCoords = null;
        }
      }

      // 3. Perform requested attendance action with live coordinates & selfie photo
      const endpoints = {
        checkIn: "/attendance/check-in",
        checkOut: "/attendance/check-out",
        lunchStart: "/attendance/lunch/start",
        lunchEnd: "/attendance/lunch/end",
      };
      const endpoint = endpoints[action];
      if (!endpoint) throw new Error("Invalid attendance action requested.");

      const requestBody = {
        consent: true,
        ...(selfiePhoto ? { photo: selfiePhoto } : {}),
        ...(locCoords
          ? {
              latitude: locCoords.latitude,
              longitude: locCoords.longitude,
              accuracy: locCoords.accuracy,
            }
          : {}),
      };

      const result = await readResponse(
        await fetch(`${API}${endpoint}`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })
      );

      setMessage(result.message || "Attendance updated successfully.");
      if (locCoords) {
        void sendLocation({ coords: locCoords });
      }
      if (action === "checkIn") {
        startLocationTracking();
      } else if (action === "checkOut") {
        stopLocationTracking();
      }
      stopCamera();
      if (result.attendance) {
        setTodayRecord(result.attendance);
      }
      await loadData();
    } catch (err) {
      setCameraError(err.message || "Attendance action failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // State calculations
  const isSunday = isSundayToday() && !simulateWorkday;
  const checkedIn = Boolean(todayRecord?.checkIn);
  const checkedOut = Boolean(todayRecord?.checkOut);
  const lunchStarted = Boolean(todayRecord?.lunchStart);
  const lunchEnded = Boolean(todayRecord?.lunchEnd);
  const onLunchNow = lunchStarted && !lunchEnded;

  // Determine current live badge status
  let attendanceState = {
    label: "Not Checked In",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  };
  if (isSunday && !checkedIn) {
    attendanceState = {
      label: "Weekly Off (Sunday)",
      badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    };
  } else if (checkedOut) {
    attendanceState = {
      label: "Checked Out",
      badgeClass: "bg-slate-200 text-slate-800 border-slate-300",
    };
  } else if (onLunchNow) {
    attendanceState = {
      label: "On Lunch Break",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 animate-pulse",
    };
  } else if (checkedIn) {
    attendanceState = {
      label: "Working",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    };
  }

  const lunchMinutesUsed = todayRecord?.lunchMinutes || Math.floor(lunchSeconds / 60);
  const lunchRemainingSeconds = Math.max(0, 3600 - lunchSeconds);
  const isLunchOverBreak = lunchSeconds > 3600 || todayRecord?.overBreak;

  const actionCards = [
    {
      key: "checkIn",
      title: "Check In",
      subtitle: isSunday
        ? "Sunday Weekly Off"
        : checkedIn
        ? `Checked in at ${formatTime(todayRecord?.checkIn)}`
        : "Start your workday (Office: 10:00 AM - 7:00 PM)",
      icon: LogIn,
      disabled: isSunday || checkedIn || checkedOut,
      bgActive: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25",
    },
    {
      key: "lunchStart",
      title: "Start Lunch",
      subtitle: onLunchNow
        ? "Lunch break currently in progress"
        : lunchEnded
        ? `Lunch finished (${lunchMinutesUsed} mins used)`
        : !checkedIn
        ? "Check-in required first"
        : "Take your 60-minute lunch break",
      icon: Coffee,
      disabled: !checkedIn || checkedOut || onLunchNow || lunchEnded,
      bgActive: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25",
    },
    {
      key: "lunchEnd",
      title: "End Lunch",
      subtitle: onLunchNow
        ? isLunchOverBreak
          ? "Target 60 min exceeded!"
          : `${formatDuration(lunchRemainingSeconds)} remaining`
        : !checkedIn
        ? "Check-in required first"
        : !lunchStarted
        ? "Lunch not started yet"
        : "Lunch break completed",
      icon: Clock3,
      disabled: !onLunchNow || checkedOut,
      bgActive: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25",
    },
    {
      key: "checkOut",
      title: "Check Out",
      subtitle: checkedOut
        ? `Checked out at ${formatTime(todayRecord?.checkOut)}`
        : onLunchNow
        ? "Disabled: End lunch break first"
        : !checkedIn
        ? "Check-in required first"
        : "End your shift and save daily hours",
      icon: LogOut,
      disabled: !checkedIn || checkedOut || onLunchNow,
      bgActive: "bg-slate-900 hover:bg-black text-white shadow-slate-900/25",
    },
  ];

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "profile", label: "My Profile", icon: User },
    { id: "history", label: "History", icon: History },
  ];

  const filteredRecords = records.filter((r) => {
    if (!searchHistory.trim()) return true;
    const term = searchHistory.toLowerCase();
    return (
      (r.date && r.date.toLowerCase().includes(term)) ||
      (r.status && r.status.toLowerCase().includes(term))
    );
  });

  // Calendar uses the attendance records returned for the logged-in employee.
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarStartDay = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const attendanceByDate = records.reduce((map, record) => {
    const dateKey = getAttendanceDateKey(record);
    if (dateKey) map[dateKey] = record;
    return map;
  }, {});
  const eventsByDate = events.reduce((map, event) => {
    const rawDate = event?.date || event?.eventDate || event?.startDate || "";
    const dateKey = String(rawDate).slice(0, 10);
    if (dateKey) {
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    }
    return map;
  }, {});
  const calendarCells = [
    ...Array(calendarStartDay).fill(null),
    ...Array.from({ length: calendarDaysInMonth }, (_, index) => index + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);
  const getCalendarDateKey = (day) =>
    `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-violet-100/70 via-indigo-50/80 to-purple-100/70 text-slate-900 font-sans antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#0B0E23] via-[#0E1330] to-[#080A18] border-r border-indigo-950/70 text-white transition-all duration-300 ease-in-out lg:static ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${sidebarCollapsed ? "w-20" : "w-64"}`}
      >
        {/* Sidebar Header: Logo & Branding */}
        <div className="flex h-20 items-center justify-between px-5 border-b border-white/5">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="/yunify-logo.png"
              alt="YUNIFY"
              className="h-10 w-10 shrink-0 rounded-xl object-contain bg-white/5 p-1"
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                  YUNIFY
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-0.5">
                  Smart Portal
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-2 px-3 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={20} className={isActive ? "text-white" : "text-slate-400"} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Settings & Logout */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <button
            onClick={() => {
              setActiveTab("settings");
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "settings"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
            title={sidebarCollapsed ? "Settings" : undefined}
          >
            <Settings size={19} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition ${
              sidebarCollapsed ? "justify-center px-0" : ""
            }`}
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut size={19} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area Beside Sidebar */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Sticky Header matching Mockup */}
        <header className="h-20 shrink-0 border-b border-indigo-100/60 bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                {getGreeting()},{user?.name ? ` ${user.name}` : ""} 👋
              </h1>
              <p className="text-xs text-slate-500">Have a productive day!</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Sunday Simulation Toggle Button */}
            {isSundayToday() && (
              <button
                type="button"
                onClick={toggleSimulateWorkday}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition border shadow-xs ${
                  simulateWorkday
                    ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                    : "bg-white text-purple-700 border-purple-300 hover:bg-purple-50"
                }`}
                title="Toggle Sunday Workday Simulation"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    simulateWorkday ? "bg-white animate-pulse" : "bg-purple-500"
                  }`}
                />
                <span className="hidden sm:inline">
                  {simulateWorkday ? "Simulate Workday: ON" : "Sunday Off: Active"}
                </span>
                <span className="sm:hidden">
                  {simulateWorkday ? "Sim ON" : "Sun Off"}
                </span>
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"
              title="Refresh attendance records"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition"
                title="Notifications"
              >
                <Bell size={16} />
              </button>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </div>

            {/* Date & Live Clock Card */}
            <div className="hidden md:flex items-center gap-2.5 rounded-2xl border border-indigo-100/80 bg-white px-3.5 py-2 shadow-xs">
              <Calendar size={16} className="text-indigo-600 shrink-0" />
              <div className="text-right leading-tight">
                <p className="text-xs font-bold text-slate-800">
                  {currentTime.toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="font-mono text-[11px] font-semibold text-indigo-600">
                  {currentTime.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
            </div>

            {/* User Profile Pill */}
            <div
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 pr-3 shadow-xs cursor-pointer hover:border-indigo-300 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 font-bold text-xs text-white shadow-sm">
                {getInitials(user?.name)}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[110px]">
                  {user?.name || "Employee"}
                </p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.role || "Employee"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main View Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {/* Global Alerts */}
            {error && (
              <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs">
                <AlertCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Notice</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {message && (
              <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs">
                <CheckCircle2 size={20} className="shrink-0 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Success</p>
                  <p>{message}</p>
                </div>
              </div>
            )}

            {/* Sunday Weekly Off & Simulation Banners */}
            {isSundayToday() && !simulateWorkday && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-purple-200/90 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 p-5 text-sm text-purple-950 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="rounded-2xl bg-purple-100 p-2.5 text-purple-700">
                    <CalendarOff size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-base text-purple-900">Weekly Off Today (Sunday)</p>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Regular employee check-in is locked on Sundays. To test check-in, working timer, lunch, and check-out today, enable Workday Simulation.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSimulateWorkday}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition hover:bg-purple-700 active:scale-95"
                >
                  ⚡ Unlock Actions (Simulate Workday)
                </button>
              </div>
            )}

            {isSundayToday() && simulateWorkday && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-emerald-50 p-5 text-sm text-emerald-950 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-emerald-900">Workday Simulation Active</span>
                      <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                        TESTING UNLOCKED
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Sunday restrictions are temporarily bypassed. Check In, Lunch, Check Out, and working timer are operating as a standard workday.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSimulateWorkday}
                  className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100/70"
                >
                  Revert to Sunday Off
                </button>
              </div>
            )}

            {/* TAB 1: DASHBOARD VIEW */}
            {activeTab === "dashboard" && (
              <>
                {/* Welcome Card matching Mockup */}
                <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-500/20 sm:p-8">
                  <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold tracking-wider uppercase backdrop-blur-md">
                          EMPLOYEE WORKSPACE
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-0.5 text-xs font-bold bg-white/10 backdrop-blur-md`}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          {attendanceState.label}
                        </span>
                        {todayRecord?.late && (
                          <span className="rounded-full bg-amber-400/90 px-2.5 py-0.5 text-xs font-bold text-slate-900">
                            Late Arrival (After 10:00 AM)
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                        Welcome back{user?.name ? `, ${user.name}` : ""} 👋
                      </h2>
                      <p className="mt-1 text-sm text-indigo-100">
                        Employee ID: <strong className="text-white">{user?.employeeId || "—"}</strong> | Department:{" "}
                        <span className="text-white font-medium">{user?.department || "General"}</span>
                      </p>
                    </div>

                    {/* YUNIFY Branding Logo Badge on the right */}
                    <div className="hidden sm:flex items-center gap-3 rounded-2xl bg-white/10 p-3.5 backdrop-blur-md border border-white/20">
                      <img
                        src="/yunify-logo.png"
                        alt="YUNIFY"
                        className="h-12 w-auto object-contain drop-shadow"
                      />
                    </div>
                  </div>
                </section>

                {/* 4 Metric / Timer Cards */}
                <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Working Timer */}
                  <div className="relative overflow-hidden rounded-3xl border border-indigo-100/70 bg-white/95 p-5 shadow-md shadow-indigo-100/30 backdrop-blur-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Working Timer</span>
                      <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                        <Clock size={18} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="font-mono text-3xl font-extrabold tracking-tight text-slate-900">
                        {formatDuration(workingSeconds)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {checkedOut
                          ? "Shift Completed"
                          : onLunchNow
                          ? "Paused during lunch break"
                          : checkedIn
                          ? "Working since check-in"
                          : "Not started yet"}
                      </p>
                    </div>
                  </div>

                  {/* Lunch Break Timer */}
                  <div
                    className={`relative overflow-hidden rounded-3xl border p-5 shadow-md backdrop-blur-xs ${
                      isLunchOverBreak
                        ? "border-red-200 bg-red-50/90 shadow-red-100/30"
                        : "border-indigo-100/70 bg-white/95 shadow-indigo-100/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isLunchOverBreak ? "text-red-600" : "text-amber-600"
                        }`}
                      >
                        Lunch Break
                      </span>
                      <div className={`rounded-xl p-2 ${isLunchOverBreak ? "bg-red-100 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                        <Hourglass size={18} className={isLunchOverBreak ? "animate-spin" : ""} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p
                        className={`font-mono text-3xl font-extrabold tracking-tight ${
                          isLunchOverBreak ? "text-red-700" : "text-slate-900"
                        }`}
                      >
                        {onLunchNow ? formatDuration(lunchRemainingSeconds) : `${lunchMinutesUsed} min`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {onLunchNow
                          ? isLunchOverBreak
                            ? "Target 60 min exceeded!"
                            : "Time remaining for lunch"
                          : lunchEnded
                          ? `Completed: ${lunchMinutesUsed} mins used`
                          : "60-minute target allowance"}
                      </p>
                    </div>
                  </div>

                  {/* Check-In Time */}
                  <div className="rounded-3xl border border-indigo-100/70 bg-white/95 p-5 shadow-md shadow-indigo-100/30 backdrop-blur-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Check-In Time</span>
                      <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                        <LogIn size={18} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold text-slate-900">{formatTime(todayRecord?.checkIn)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {todayRecord?.checkIn ? (todayRecord?.late ? "Marked Late (After 10 AM)" : "On-time arrival") : "Waiting for check-in"}
                      </p>
                    </div>
                  </div>

                  {/* Check-Out Time */}
                  <div className="rounded-3xl border border-indigo-100/70 bg-white/95 p-5 shadow-md shadow-indigo-100/30 backdrop-blur-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Check-Out Time</span>
                      <div className="rounded-xl bg-pink-50 p-2 text-pink-600">
                        <LogOut size={18} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold text-slate-900">{formatTime(todayRecord?.checkOut)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {checkedOut ? "Shift closed for the day" : "Available at end of shift"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Attendance Action Cards */}
                <section className="mb-8 rounded-3xl border border-indigo-100/70 bg-white/95 p-6 shadow-md shadow-indigo-100/30 backdrop-blur-xs sm:p-8">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Attendance Actions</h3>
                      <p className="text-xs text-slate-500">
                        Camera photo verification is performed with each attendance action.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-indigo-50/60 px-3.5 py-1.5 text-xs text-indigo-700 border border-indigo-100">
                      <ShieldCheck size={16} className="text-indigo-600" />
                      <span className="font-semibold">Biometric Photo Verification Enabled</span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {actionCards.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          disabled={item.disabled || busy}
                          onClick={() => openCamera(item.key)}
                          className={`group relative flex flex-col justify-between rounded-2xl p-5 text-left transition duration-200 active:scale-[0.98] border ${
                            item.disabled
                              ? "bg-slate-50/90 text-slate-500 border-slate-200/80 cursor-not-allowed shadow-xs"
                              : `${item.bgActive} border-transparent shadow-md hover:shadow-lg`
                          }`}
                        >
                          <div>
                            <div
                              className={`mb-4 inline-flex rounded-xl p-3 ${
                                item.disabled ? "bg-slate-200/70 text-slate-600" : "bg-white/20 text-white"
                              }`}
                            >
                              <Icon size={24} />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-base font-bold ${item.disabled ? "text-slate-700" : "text-white"}`}>
                                {item.title}
                              </h4>
                              {item.disabled && (
                                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                  Locked
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={`mt-3 text-xs leading-relaxed ${item.disabled ? "text-slate-500" : "text-white/90"}`}>
                            {item.subtitle}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {checkedOut && (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-center text-sm font-semibold text-emerald-800">
                      🎉 Today's attendance has been completed and safely logged in the database.
                    </div>
                  )}
                </section>

                {/* Attendance History Preview */}
                <section className="overflow-hidden rounded-3xl border border-indigo-100/70 bg-white/95 shadow-md shadow-indigo-100/30 backdrop-blur-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700">
                        <History size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 sm:text-lg">Recent Attendance Records</h3>
                        <p className="text-xs text-slate-500">Live attendance ledger from MongoDB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("history")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      View All Records →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Date</th>
                          <th className="px-6 py-4 font-semibold">Check In</th>
                          <th className="px-6 py-4 font-semibold">Lunch Start</th>
                          <th className="px-6 py-4 font-semibold">Lunch End</th>
                          <th className="px-6 py-4 font-semibold">Check Out</th>
                          <th className="px-6 py-4 font-semibold">Break Used</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {records.slice(0, 5).map((r) => {
                          const isRecordCompleted = Boolean(r.checkOut);
                          return (
                            <tr key={r._id || `${r.date}-${r.checkIn}`} className="hover:bg-slate-50/80 transition">
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">{r.date || "—"}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <span>{formatTime(r.checkIn)}</span>
                                  {r.late && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                      LATE
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatTime(r.lunchStart)}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatTime(r.lunchEnd)}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatTime(r.checkOut)}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                                {r.lunchMinutes ? (
                                  <span className={r.overBreak ? "font-bold text-red-600" : ""}>
                                    {r.lunchMinutes} min {r.overBreak && "(Over limit)"}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    isRecordCompleted
                                      ? "bg-slate-100 text-slate-700"
                                      : r.lunchStart && !r.lunchEnd
                                      ? "bg-amber-100 text-amber-800"
                                      : r.checkIn
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {isRecordCompleted
                                    ? "Completed"
                                    : r.lunchStart && !r.lunchEnd
                                    ? "On Lunch"
                                    : r.checkIn
                                    ? "Present"
                                    : "Recorded"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {!loading && records.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                              No attendance records found yet. Check in to log your first record!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {/* TAB 2 & 4: ATTENDANCE & HISTORY VIEW */}
            {(activeTab === "attendance" || activeTab === "history") && (
              <>
                {activeTab === "attendance" && (
                  <section className="mb-6 rounded-3xl border border-indigo-100/70 bg-white/95 p-5 shadow-md shadow-indigo-100/30 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">My Attendance Calendar</h2>
                        <p className="mt-1 text-xs text-slate-500">Your monthly attendance overview</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50" aria-label="Previous month">
                          <ChevronLeft size={18} />
                        </button>
                        <span className="min-w-32 text-center text-sm font-bold text-slate-800">
                          {calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                        </span>
                        <button type="button" onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50" aria-label="Next month">
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {calendarCells.map((day, index) => {
                        if (!day) return <div key={`empty-${index}`} className="min-h-16 rounded-xl bg-slate-50/60 sm:min-h-20" />;
                        const dateKey = getCalendarDateKey(day);
                        const record = attendanceByDate[dateKey];
                        const dayEvents = eventsByDate[dateKey] || [];
                        const holiday = dayEvents.find((event) => String(event.type || "").toLowerCase() === "holiday");
                        const isToday = dateKey === getTodayIST();
                        const isSunday = new Date(`${dateKey}T12:00:00`).getDay() === 0;
                        const isPastWorkday = dateKey < getTodayIST() && !isSunday;
                        const attendanceLabel = record?.checkIn
                          ? "Present"
                          : !holiday && isPastWorkday
                          ? "Absent"
                          : "";
                        const statusClass = holiday
                          ? "border-purple-200 bg-purple-50 text-purple-800"
                          : record?.checkIn
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : attendanceLabel === "Absent"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-slate-100 bg-white text-slate-500";
                        const eventNames = dayEvents
                          .map((event) => event.title || event.name || event.eventName || "Event")
                          .join(", ");
                        const tooltipParts = [
                          attendanceLabel,
                          ...dayEvents.map((event) => `${event.type || "Event"}: ${event.title || event.name || "Untitled"}`),
                          record?.checkIn ? `Check in: ${formatTime(record.checkIn)}` : "",
                        ].filter(Boolean);
                        return (
                          <div key={dateKey} className={`flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-xl border p-1.5 sm:min-h-24 ${statusClass} ${isToday ? "ring-2 ring-indigo-500 ring-offset-1" : ""}`} title={tooltipParts.join(" • ") || "No attendance record"}>
                            <span className="text-sm font-bold">{day}</span>
                            {attendanceLabel && <span className="text-[9px] font-extrabold sm:text-[10px]">{attendanceLabel}</span>}
                            {dayEvents.map((event, eventIndex) => {
                              const isHoliday = String(event.type || "").toLowerCase() === "holiday";
                              return (
                                <span
                                  key={event._id || `${dateKey}-${eventIndex}`}
                                  className={`max-w-full truncate text-[8px] font-bold sm:text-[9px] ${isHoliday ? "text-purple-700" : "text-indigo-700"}`}
                                >
                                  {isHoliday ? "Holiday" : (event.title || event.name || "Event")}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Present</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Absent</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Holiday</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Event</span>
                    </div>
                  </section>
                )}

                <section className="overflow-hidden rounded-3xl border border-indigo-100/70 bg-white/95 shadow-md shadow-indigo-100/30 backdrop-blur-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {activeTab === "attendance" ? "Attendance Ledger" : "Complete Attendance History"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Historical attendance and break timestamps logged in MongoDB
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <Search size={15} className="text-slate-400" />
                      <input
                        value={searchHistory}
                        onChange={(e) => setSearchHistory(e.target.value)}
                        placeholder="Search date or status..."
                        className="bg-transparent outline-none w-36 sm:w-48 text-slate-800"
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      Total: <strong>{filteredRecords.length}</strong>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Check In</th>
                        <th className="px-6 py-4 font-semibold">Lunch Start</th>
                        <th className="px-6 py-4 font-semibold">Lunch End</th>
                        <th className="px-6 py-4 font-semibold">Check Out</th>
                        <th className="px-6 py-4 font-semibold">Break Duration</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((r) => {
                        const isCompleted = Boolean(r.checkOut);
                        return (
                          <tr key={r._id || `${r.date}-${r.checkIn}`} className="hover:bg-slate-50/80 transition">
                            <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">{r.date || "—"}</td>
                            <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <span>{formatTime(r.checkIn)}</span>
                                {r.late && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                    LATE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatTime(r.lunchStart)}</td>
                            <td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatTime(r.lunchEnd)}</td>
                            <td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatTime(r.checkOut)}</td>
                            <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                              {r.lunchMinutes ? (
                                <span className={r.overBreak ? "font-bold text-red-600" : ""}>
                                  {r.lunchMinutes} mins {r.overBreak && "(Over 60m)"}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  isCompleted
                                    ? "bg-slate-100 text-slate-700"
                                    : r.lunchStart && !r.lunchEnd
                                    ? "bg-amber-100 text-amber-800"
                                    : r.checkIn
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {isCompleted
                                  ? "Completed"
                                  : r.lunchStart && !r.lunchEnd
                                  ? "On Lunch"
                                  : r.checkIn
                                  ? "Present"
                                  : "Recorded"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                            {searchHistory ? "No matching records found." : "No attendance records available."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              </>
            )}

            {/* TAB 3: MY PROFILE VIEW */}
            {activeTab === "profile" && (
              <section className="rounded-3xl border border-indigo-100/70 bg-white/95 p-6 shadow-md shadow-indigo-100/30 backdrop-blur-xs sm:p-8">
                <div className="flex flex-wrap items-center gap-6 border-b border-slate-100 pb-8">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 font-extrabold text-2xl text-white shadow-lg shadow-indigo-500/30">
                    {getInitials(user?.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-900">{user?.name || "Employee"}</h2>
                      <BadgeCheck className="text-blue-600" size={22} />
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {user?.designation || "Staff Member"} • {user?.department || "General"}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active Employee
                    </span>
                  </div>
                </div>

                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee ID</span>
                    <p className="mt-1 font-mono text-base font-bold text-slate-800">{user?.employeeId || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</span>
                    <p className="mt-1 text-base font-bold text-slate-800">{user?.email || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</span>
                    <p className="mt-1 text-base font-bold text-slate-800">{user?.department || "General"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</span>
                    <p className="mt-1 text-base font-bold text-slate-800 capitalize">{user?.role || "employee"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Biometric Status</span>
                    <p className="mt-1 text-sm font-semibold text-emerald-700 flex items-center gap-2">
                      <ShieldCheck size={18} /> Face Verification Baseline Configured
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 5: SETTINGS VIEW */}
            {activeTab === "settings" && (
              <section className="rounded-3xl border border-indigo-100/70 bg-white/95 p-6 shadow-md shadow-indigo-100/30 backdrop-blur-xs sm:p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Portal Settings & Policies</h2>
                <p className="text-xs text-slate-500 mb-6">Workplace rules and configuration</p>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Office Working Hours</h4>
                      <p className="text-xs text-slate-500">Configured shift timing for all regular employees</p>
                    </div>
                    <span className="rounded-xl bg-blue-100 px-3 py-1 font-mono text-xs font-bold text-blue-800">
                      10:00 AM – 07:00 PM IST
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Lunch Break Policy</h4>
                      <p className="text-xs text-slate-500">Maximum daily allowed lunch break without penalty</p>
                    </div>
                    <span className="rounded-xl bg-amber-100 px-3 py-1 font-mono text-xs font-bold text-amber-800">
                      60 Minutes Target
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Weekly Off Policy</h4>
                      <p className="text-xs text-slate-500">Regular employees cannot check in on Sundays</p>
                    </div>
                    <span className="rounded-xl bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                      Sunday Off
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Sunday Workday Simulation</h4>
                      <p className="text-xs text-slate-500">Bypass Sunday lock for development and presentation testing</p>
                    </div>
                    <button
                      onClick={toggleSimulateWorkday}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        simulateWorkday
                          ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {simulateWorkday ? "Testing Mode: ACTIVE" : "Testing Mode: OFF"}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Camera Verification Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Live Camera Verification</h3>
                <p className="text-xs text-slate-500">Look at the camera and keep your face in the frame.</p>
              </div>
              <button
                aria-label="Close modal"
                onClick={stopCamera}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner">
             <video
                      ref={videoRef}
                       autoPlay
                          muted
                           playsInline
                             onLoadedMetadata={() => setCameraReady(true)}
                              className="h-full w-full object-cover"
                              style={{ transform: "scaleX(1)" }}
                         />
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-xs text-slate-300">
                  <RefreshCw size={18} className="mr-2 animate-spin text-blue-500" /> Connecting to camera...
                </div>
              )}
            </div>

            {/* Live GPS Status Indicator */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <MapPin
                  size={16}
                  className={currentCoords ? "text-emerald-600" : "animate-pulse text-amber-500"}
                />
                <span className="font-semibold text-slate-700">Live GPS Location:</span>
              </div>
              {currentCoords ? (
                <span className="font-mono font-bold text-emerald-700">
                  {currentCoords.latitude.toFixed(4)}°, {currentCoords.longitude.toFixed(4)}° (±
                  {Math.round(currentCoords.accuracy || 0)}m)
                </span>
              ) : locationStatus === "fetching" ? (
                <span className="font-medium text-amber-600">Detecting GPS location...</span>
              ) : locationStatus === "denied" ? (
                <span className="font-medium text-red-500">Location permission required</span>
              ) : (
                <span className="text-slate-500">Ready to acquire position</span>
              )}
            </div>

            {cameraError && (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {cameraError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={stopCamera}
                disabled={busy}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={captureAndSubmit}
                disabled={!cameraReady || busy}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-700 disabled:opacity-50"
              >
                <Camera size={16} />
                {busy ? "Verifying..." : "Verify & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
