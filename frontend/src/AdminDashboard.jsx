import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFaceDescriptor } from "./faceRecognition";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  ArrowUpRight,
  Search,
  Plus,
  RefreshCw,
  X,
  LayoutDashboard,
  CalendarCheck,
  User,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  Building,
  Briefcase,
  FileSpreadsheet,
  Camera,
  ScanFace,
  MapPin,
  Eye,
EyeOff,
} from "lucide-react";

import { API_URL as API, BACKEND_BASE, readResponse } from "./apiConfig";

const getToken = () => localStorage.getItem("token");

const getToday = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [faceStatus, setFaceStatus] = useState("");
  const [faceBusy, setFaceBusy] = useState(false);
  const enrollmentVideoRef = useRef(null);
  const enrollmentStreamRef = useRef(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
const [showEditForm, setShowEditForm] = useState(false);
  const [liveLocations, setLiveLocations] = useState([]);
  const [locationError, setLocationError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  // Layout & Navigation State
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'employees' | 'attendance' | 'settings'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);
  // Admin calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("holiday");
  const [eventDate, setEventDate] = useState("");

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  };

  const formatCalendarDate = (day) => {
    if (!day) return "";
    const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const addCalendarEvent = (e) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    setEvents((current) => [...current, { id: `${Date.now()}-${Math.random()}`, title: eventTitle.trim(), type: eventType, date: eventDate }]);
    setEventTitle("");
    setEventType("holiday");
    setEventDate("");
    setShowEventForm(false);
  };

  // Live real-time clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const [form, setForm] = useState({
    name: "",
    employeeId: "",
    email: "",
    password: "",
    department: "",
    designation: "",
  });

  useEffect(() => () => {
    if (enrollmentStreamRef.current) enrollmentStreamRef.current.getTracks().forEach((track) => track.stop());
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  }, [navigate]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();
      if (!token) {
        handleLogout();
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [er, ar] = await Promise.all([
        fetch(`${API}/employees`, { headers }),
        fetch(`${API}/attendance/admin`, { headers }),
      ]);

      if (er.status === 401 || ar.status === 401) {
        handleLogout();
        return;
      }

      const ed = await readResponse(er, "Failed to load employees");
      const ad = await readResponse(ar, "Failed to load attendance records");

      setEmployees(ed.employees || []);
      setRecords(ad.records || []);
    } catch (e) {
      setError(e.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Load the latest locations shared by employees who are checked in.
  const loadLiveLocations = useCallback(async () => {
    try {
      setLocationError("");
      const token = getToken();

      if (!token) {
        setLocationError("Login token nahi mila. Dobara login karo.");
        return;
      }

      const response = await fetch(`${API}/attendance/admin/live-locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const data = await readResponse(response, "Locations load nahi hui");

      setLiveLocations(data.employees || data.locations || data.data || []);
    } catch (e) {
      setLocationError(e.message || "Locations load nahi hui.");
      setLiveLocations([]);
    }
  }, [handleLogout]);

  useEffect(() => {
    loadLiveLocations();
    const locInterval = setInterval(loadLiveLocations, 10000);
    return () => clearInterval(locInterval);
  }, [loadLiveLocations]);

  const today = getToday();

  const todayRecords = useMemo(
    () =>
      records.filter((r) => {
        if (!r || !r.date) return false;
        const norm = String(r.date).split("T")[0].split(" ")[0].trim();
        return norm === today;
      }),
    [records, today]
  );

  const recordMap = useMemo(() => {
    const map = new Map();
    todayRecords.forEach((r) => {
      const id = typeof r.employee === "object" ? r.employee?._id : r.employee;
      if (id) map.set(String(id), r);
    });
    return map;
  }, [todayRecords]);

  const present = new Set(
    todayRecords
      .filter((r) => r.checkIn)
      .map((r) => (typeof r.employee === "object" ? r.employee?._id : r.employee))
      .filter(Boolean)
      .map(String)
  ).size;

  const total = employees.length;
  const absent = Math.max(0, total - present);
  const currentlyWorking = todayRecords.filter((r) => r.checkIn && !r.checkOut).length;

  const stats = [
    {
      title: "Total Employees",
      value: total,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      note: "Registered workforce",
    },
    {
      title: "Present Today",
      value: present,
      icon: UserCheck,
      color: "bg-emerald-50 text-emerald-600",
      note: total ? `${((present / total) * 100).toFixed(0)}% attendance rate` : "No employees",
    },
    {
      title: "Absent Today",
      value: absent,
      icon: UserX,
      color: "bg-red-50 text-red-500",
      note: total ? `${((absent / total) * 100).toFixed(0)}% absent rate` : "No employees",
    },
    {
      title: "Currently Working",
      value: currentlyWorking,
      icon: Briefcase,
      color: "bg-purple-50 text-purple-600",
      note: "Live active shifts",
    },
  ];

  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));

      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      return {
        date,
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        count: records.filter((r) => r.date === date && r.checkIn).length,
      };
    });
  }, [records]);

  const maxCount = Math.max(1, ...week.map((d) => d.count));

  const rows = employees
    .filter((e) =>
      [e.name, e.employeeId, e.department, e.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const at = recordMap.get(String(a._id))?.checkIn;
      const bt = recordMap.get(String(b._id))?.checkIn;
      return new Date(bt || 0) - new Date(at || 0);
    });

  function stopEnrollmentCamera() {
    if (enrollmentStreamRef.current) {
      enrollmentStreamRef.current.getTracks().forEach((track) => track.stop());
      enrollmentStreamRef.current = null;
    }
    if (enrollmentVideoRef.current) enrollmentVideoRef.current.srcObject = null;
  }
async function startEnrollmentCamera() {
  try {
    setFaceStatus("Opening camera...");

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera requires localhost or HTTPS.");
    }

 const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "user",
    width: { ideal: 320 },
    height: { ideal: 240 },
    frameRate: { ideal: 15, max: 20 },
  },
  audio: false,
});

    enrollmentStreamRef.current = stream;

    const video = enrollmentVideoRef.current;

    if (!video) {
      throw new Error("Camera preview element not found.");
    }

    video.srcObject = stream;
    await video.play();

    setFaceStatus("Camera ready. Click Capture Face to continue.");
  } catch (err) {
    console.error("Camera error:", err);
    setFaceStatus(err.message || "Failed to open camera.");
  }
}
 
async function captureEmployeeFace() {
  setFaceBusy(true);
  setFaceStatus("Loading face recognition models...");

  try {
    if (
      !enrollmentVideoRef.current ||
      !enrollmentVideoRef.current.videoWidth
    ) {
      throw new Error(
        "Please start the camera and wait for the preview to load."
      );
    }

    const descriptor = await getFaceDescriptor(
      enrollmentVideoRef.current
    );

    setFaceDescriptor(descriptor);
    setFaceStatus("Face detected successfully. Ready for enrollment.");
  } catch (err) {
    setFaceDescriptor(null);
    setFaceStatus(err.message || "Face capture failed.");
  } finally {
    setFaceBusy(false);
  }
}

async function addEmployee(event) {
  event.preventDefault();
  setSaving(true);
  setError("");
  setMessage("");

  try {
    const token = getToken();

    if (!token) {
      throw new Error("Login token not found.");
    }

    const payload = {
      ...form,
      ...(faceDescriptor && faceDescriptor.length === 128 ? { faceDescriptor } : {}),
    };

    const response = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await readResponse(response, "Failed to register employee");

    setMessage(
      "Employee registered successfully. Face descriptor saved to MongoDB."
    );

    stopEnrollmentCamera();
    setFaceDescriptor(null);
    setFaceStatus("");

    setForm({
      name: "",
      employeeId: "",
      email: "",
      password: "",
      department: "",
      designation: "",
    });

    setShowForm(false);
    await loadDashboard();
  } catch (e) {
    setError(e.message || "Failed to register employee.");
  } finally {
    setSaving(false);
  }
}


  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "employees", label: "Employees", icon: Users },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
  ];

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
                  Admin Portal
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
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

        {/* Sidebar Footer */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Sticky Header */}
        <header className="h-20 shrink-0 border-b border-indigo-100/60 bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Admin Dashboard 👋</h1>
              <p className="text-xs text-slate-500">Overview of your office attendance system</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"
              title="Refresh dashboard data"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>

            <div className="relative">
              <button className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition">
                <Bell size={16} />
              </button>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </div>

            {/* Date Widget */}
            <div className="hidden md:flex items-center gap-2.5 rounded-2xl border border-indigo-100/80 bg-white px-3.5 py-2 shadow-xs">
              <CalendarDays size={16} className="text-indigo-600 shrink-0" />
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

            {/* Admin Badge */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 pr-3 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 font-bold text-xs text-white shadow-sm">
                AD
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-slate-900">Administrator</p>
                <p className="text-[10px] text-slate-500">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-xs">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-xs">
                {message}
              </div>
            )}

            {/* TAB 1: OVERVIEW DASHBOARD */}
            {activeTab === "dashboard" && (
              <>
                {/* 4 Stats Cards */}
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.title} className="rounded-3xl border border-indigo-100/70 bg-white/95 p-6 shadow-md shadow-indigo-100/30 backdrop-blur-xs">
                        <div className={`mb-4 inline-flex rounded-2xl p-3 ${s.color}`}>
                          <Icon size={22} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{s.title}</p>
                        <div className="mt-2 flex items-baseline justify-between gap-2">
                          <h2 className="text-3xl font-black text-slate-900">{loading ? "—" : s.value}</h2>
                          <span className="text-xs text-slate-500">{s.note}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  {/* Attendance Overview Chart */}
                  <section className="rounded-3xl border border-indigo-100/70 bg-white/95 p-6 shadow-md shadow-indigo-100/30 backdrop-blur-xs lg:col-span-2">
                    <div className="mb-8 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Attendance Overview</h2>
                        <p className="mt-1 text-xs text-slate-500">Last 7 days check-in activity</p>
                      </div>
                      <button
                        onClick={loadDashboard}
                        className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition"
                      >
                        <RefreshCw size={13} /> Refresh
                      </button>
                    </div>

                    <div className="flex h-56 items-end justify-around gap-3 border-b border-slate-100 pb-2">
                      {week.map((d) => (
                        <div key={d.date} title={`${d.date}: ${d.count} check-ins`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                          <span className="text-xs font-bold text-slate-600">{d.count}</span>
                          <div className="flex h-full w-full items-end justify-center">
                            <div
                              className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-indigo-600 to-purple-400 shadow-sm transition-all duration-300"
                              style={{ height: d.count ? `${Math.max(10, (d.count / maxCount) * 88)}%` : "4%" }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 font-semibold">{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Quick Actions */}
                  <section className="rounded-3xl border border-indigo-100/70 bg-white/95 p-6 shadow-md shadow-indigo-100/30 backdrop-blur-xs flex flex-col justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
                      <p className="mt-1 text-xs text-slate-500">Workforce controls</p>
                      <button
                        onClick={() => {
                          setError("");
                          setMessage("");
                          setShowForm(true);
                        }}
                        className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-left text-white shadow-lg shadow-purple-600/25 hover:from-purple-700 hover:to-indigo-700 transition"
                      >
                        <Plus size={20} />
                        <span className="flex-1 text-sm font-bold">Add New Employee</span>
                        <ArrowUpRight size={18} />
                      </button>
                      <button
                        onClick={() => setActiveTab("employees")}
                        className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-4 text-left text-slate-700 hover:bg-slate-100 transition border border-slate-200/60"
                      >
                        <Users size={20} className="text-indigo-600" />
                        <span className="flex-1 text-sm font-semibold">Manage Employees</span>
                        <ArrowUpRight size={18} />
                      </button>
                    </div>

                    <div className="mt-6 rounded-2xl bg-indigo-50/60 p-4 text-xs text-indigo-900 border border-indigo-100">
                      💡 Employees can only be registered by an authorized Admin.
                    </div>
                  </section>
                </div>

                {/* Admin Calendar: Sundays are automatically marked; events are managed locally */}
                <section className="mt-6 rounded-3xl border border-indigo-100/70 bg-white/95 p-6 shadow-md shadow-indigo-100/30 backdrop-blur-xs">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CalendarDays size={21} className="text-violet-600" />
                        <h2 className="text-lg font-bold text-slate-900">Holiday & Events Calendar</h2>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Sundays are marked automatically. Add office holidays and events.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Previous month"><ChevronLeft size={18} /></button>
                      <span className="min-w-36 text-center text-sm font-bold text-slate-800">{calendarDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
                      <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Next month"><ChevronRight size={18} /></button>
                      <button type="button" onClick={() => { setEventDate(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,"0")}-${String(calendarDate.getDate()).padStart(2,"0")}`); setShowEventForm(true); }} className="ml-1 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white"><Plus size={15} /> Add Event</button>
                    </div>
                  </div>

                  {showEventForm && (
                    <form onSubmit={addCalendarEvent} className="mb-5 grid gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 sm:grid-cols-4">
                      <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Holiday or event name" required className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 sm:col-span-2" />
                      <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500" />
                      <div className="flex gap-2">
                        <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"><option value="holiday">Holiday</option><option value="event">Event</option></select>
                        <button type="submit" className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white">Save</button>
                        <button type="button" onClick={() => setShowEventForm(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-7 gap-1 ">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className={`py-2 text-center text-xs font-bold ${day === "Sun" ? "text-red-600" : "text-slate-500"}`}>{day}</div>)}
                    {getCalendarDays().map((day, index) => {
                      if (!day) return <div key={`empty-${index}`} className="min-h-14 rounded-xl bg-slate-50/60 sm:min-h-16"/>;
                      const dateKey = formatCalendarDate(day);
                      const sunday = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).getDay() === 0;
                      const today = dateKey === new Date().toLocaleDateString("en-CA");
                      const dayEvents = events.filter((item) => item.date === dateKey);
                      return <div key={dateKey} className={`min-h-14 overflow-hidden rounded-xl border p-1 sm:min-h-16 sm:p-1.5 ${sunday ? "border-red-100 bg-red-50" : "border-slate-100 bg-white"} ${today ? "ring-2 ring-violet-400" : ""}`}>
                        <div className={`flex h-5 w-5  items-center justify-center rounded-full text-xs font-bold ${sunday ? "bg-red-100 text-red-700" : "text-slate-700"}`}>{day}</div>
                        {sunday && <div className="mt-1 text-[10px] font-semibold text-red-600">Sunday off</div>}
                        {dayEvents.map((item) => <div key={item.id} title={item.title} className={`mt-1 truncate rounded px-1 py-0.5 text-[10px] font-semibold ${item.type === "holiday" ? "bg-amber-100 text-amber-800" : "bg-violet-100 text-violet-800"}`}>{item.title}</div>)}
                      </div>;
                    })}
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <h3 className="mb-2 text-sm font-bold text-slate-800">Events this month</h3>
                    {events.filter((item) => item.date.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,"0")}`)).length === 0 ? <p className="text-xs text-slate-400">No holidays or events added for this month.</p> : <div className="space-y-2">{events.filter((item) => item.date.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,"0")}`)).sort((a,b) => a.date.localeCompare(b.date)).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.title}</p><p className="text-xs text-slate-500">{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {item.type === "holiday" ? "Holiday" : "Event"}</p></div><button type="button" onClick={() => setEvents((current) => current.filter((entry) => entry.id !== item.id))} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`Delete ${item.title}`}><X size={15} /></button></div>)}</div>}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400">Note: Events are currently saved in this page's state and will reset if you refresh. Database saving can be added separately.</p>
                </section>
              </>
            )}

            {/* TAB 2: EMPLOYEE MANAGEMENT */}
            {(activeTab === "employees" || activeTab === "dashboard") && (
              <section className="mt-6 overflow-hidden rounded-3xl border border-indigo-100/70 bg-white/95 shadow-md shadow-indigo-100/30 backdrop-blur-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {activeTab === "employees" ? "Employee Directory" : "Today's Workforce Status"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">Live employee check-in and shift records</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 text-xs">
                      <Search size={15} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search employees..."
                        className="w-36 sm:w-48 bg-transparent outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition"
                    >
                      <Plus size={15} /> Add Employee
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">

                      <tr>
                        <th className="px-6 py-4 font-semibold">Employee</th>
                        <th className="px-6 py-4 font-semibold">Employee ID</th>
                        <th className="px-6 py-4 font-semibold">Department</th>
                        <th className="px-6 py-4 font-semibold">Check-in</th>
                        <th className="px-6 py-4 font-semibold">Check-out</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((employee) => {
                        const r = recordMap.get(String(employee._id));
                        const status = !r?.checkIn
                          ? "Absent"
                          : r.checkOut
                          ? "Checked out"
                          : r.lunchStart && !r.lunchEnd
                          ? "On lunch"
                          : "Present";
                        const badge = !r?.checkIn
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : r.checkOut
                          ? "bg-slate-100 text-slate-600"
                          : r.lunchStart && !r.lunchEnd
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200";

                        return (
                          <tr key={employee._id} className="hover:bg-slate-50/80 transition">
                            <td className="px-6 py-4 font-bold text-slate-900">{employee.name}</td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{employee.employeeId || "—"}</td>
                            <td className="px-6 py-4 text-slate-600">{employee.department || "General"}</td>
                            <td className="px-6 py-4 text-slate-600">{formatTime(r?.checkIn)}</td>
                            <td className="px-6 py-4 text-slate-600">{formatTime(r?.checkOut)}</td>
                            <td className="px-6 py-4">
                               <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
                                     {status}
                                      </span>
                                     </td>

                                      {/* Edit button */}
                                   <td className="px-6 py-4">
                                    <button
                                     type="button"                
                                     onClick={() => {
                                       setEditingEmployee(employee);
                                       setShowEditForm(true);
                                      }}
                                   className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                 >
                                Edit
                              </button>
                                 </td>
                            
                          </tr>
                        );
                      })}
                      {!loading && rows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                            {search ? "No matching employees found." : "No employees registered yet."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* LIVE EMPLOYEE LOCATIONS */}
            {(activeTab === "dashboard" || activeTab === "employees") && (
              <section className="mt-6 overflow-hidden rounded-3xl border border-indigo-100/70 bg-white/95 shadow-md shadow-indigo-100/30">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Live Employee Locations</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Latest locations shared by checked-in employees
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadLiveLocations}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-1 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    <RefreshCw size={14} /> Refresh Locations
                  </button>
                </div>

                <div className="p-6">
                  {locationError && (
                    <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                      {locationError}
                    </p>
                  )}

                  {liveLocations.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No employee locations available. An employee must check in and allow location access.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="p-3">Employee</th>
                            <th className="p-3">Latitude</th>
                            <th className="p-3">Longitude</th>
                            <th className="p-3">Accuracy</th>
                            <th className="p-3">Last Updated</th>
                            <th className="p-3">Map</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {liveLocations.map((employee, index) => {
                            const loc = employee.lastLocation || employee.location || {};
                            const lat = loc.latitude ?? loc.lat;
                            const lng = loc.longitude ?? loc.lng ?? loc.lon;
                            const employeeName = employee.name || employee.fullName || employee.employee?.name || "Employee";

                            return (
                              <tr key={employee._id || employee.employeeId || index}>
                                <td className="p-3 font-semibold text-slate-800">{employeeName}</td>
                                <td className="p-3">{lat ?? "—"}</td>
                                <td className="p-3">{lng ?? "—"}</td>
                                <td className="p-3">
                                  {loc.accuracy != null ? `${Math.round(loc.accuracy)} m` : "—"}
                                </td>
                                <td className="p-3">
                                  {loc.updatedAt || loc.timestamp
                                    ? new Date(loc.updatedAt || loc.timestamp).toLocaleString("en-IN")
                                    : "—"}
                                </td>
                                <td className="p-3">
                                  {lat != null && lng != null ? (
                                    <a
                                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-indigo-600 hover:underline"
                                    >
                                      Open Map
                                    </a>
                                  ) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB 3: ATTENDANCE LEDGER */}
            {activeTab === "attendance" && (
              <section className="overflow-hidden rounded-3xl border border-indigo-100/70 bg-white/95 shadow-md shadow-indigo-100/30 backdrop-blur-xs">
                <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Complete Company Attendance Log</h2>
                    <p className="text-xs text-slate-500 mt-1">All employee records stored in MongoDB</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Total Records: <strong>{records.length}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Photo</th>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Employee</th>
                        <th className="px-6 py-4 font-semibold">ID</th>
                        <th className="px-6 py-4 font-semibold">Check-in</th>
                        <th className="px-6 py-4 font-semibold">Lunch</th>
                        <th className="px-6 py-4 font-semibold">Check-out</th>
                        <th className="px-6 py-4 font-semibold">Location</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((r) => {
                        const empName = typeof r.employee === "object" ? r.employee?.name : "Employee";
                        const empId = typeof r.employee === "object" ? r.employee?.employeeId : "—";
                        return (
                          <tr key={r._id} className="hover:bg-slate-50/80 transition">
                            <td className="px-6 py-4">
                              {r.photoPath ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhoto(`${BACKEND_BASE}${r.photoPath}`)}
                                  className="group relative flex h-10 w-10 overflow-hidden rounded-xl border border-indigo-200 shadow-xs transition hover:scale-105"
                                  title="Click to view live selfie"
                                >
                                  <img
                                    src={`${BACKEND_BASE}${r.photoPath}`}
                                    alt="Live selfie"
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ) : (
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400"
                                  title="No selfie captured"
                                >
                                  <Camera size={16} />
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-900">{r.date}</td>
                            <td className="px-6 py-4 font-bold text-slate-800">{empName}</td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-500">{empId}</td>
                            <td className="px-6 py-4 text-slate-600">{formatTime(r.checkIn)}</td>
                            <td className="px-6 py-4 text-slate-600">
                              {r.lunchMinutes ? `${r.lunchMinutes}m` : r.lunchStart ? "On break" : "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{formatTime(r.checkOut)}</td>
                            <td className="px-6 py-4">
                              {r.location &&
                              typeof r.location.latitude === "number" &&
                              typeof r.location.longitude === "number" ? (
                                <a
                                  href={`https://www.google.com/maps?q=${r.location.latitude},${r.location.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                >
                                  <MapPin size={12} className="text-indigo-600" />
                                  <span>View Map</span>
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  r.checkOut
                                    ? "bg-slate-100 text-slate-700"
                                    : r.checkIn
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {r.checkOut ? "Completed" : r.checkIn ? "Present" : r.status || "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && records.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">
                            No attendance records logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* TAB 4: SETTINGS */}
            {activeTab === "settings" && (
              <section className="rounded-3xl border border-indigo-100/70 bg-white/95 p-6 shadow-md shadow-indigo-100/30 backdrop-blur-xs sm:p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Admin Configuration & Policies</h2>
                <p className="text-xs text-slate-500 mb-6">Workplace rules and database sync settings</p>

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
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Add Employee Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs">
          <div className="my-3 sm:my-6 w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-3xl bg-white p-4 sm:p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add New Employee</h2>
                <p className="mt-1 text-xs text-slate-500">Employee record will be stored in MongoDB.</p>
              </div>
              <button
                onClick={() => { stopEnrollmentCamera(); setFaceDescriptor(null); setFaceStatus(""); setShowForm(false); }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={addEmployee} className="grid gap-4 sm:grid-cols-2">
              {[
                ["name", "Full name", "text"],
                ["employeeId", "Employee ID", "text"],
                ["email", "Email address", "email"],
                ["password", "Temporary password (min 12 characters)", "password"],
                ["department", "Department", "text"],
                ["designation", "Designation", "text"],
              ].map(([name, label, type]) => (
                <label key={name} className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
                <div className="relative">
  <input
    name={name}
    type={
      name === "password"
        ? showEmployeePassword
          ? "text"
          : "password"
        : type
    }
    value={form[name]}
    onChange={(e) =>
      setForm((old) => ({ ...old, [name]: e.target.value }))
    }
    required={["name", "employeeId", "email", "password"].includes(name)}
    minLength={name === "password" ? 12 : undefined}
    placeholder={`Enter ${label.toLowerCase()}`}
    className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition ${
      name === "password" ? "pr-11" : ""
    }`}
  />

  {name === "password" && (
    <button
      type="button"
      onClick={() =>
        setShowEmployeePassword((prev) => !prev)
      }
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
      aria-label={
        showEmployeePassword ? "Hide password" : "Show password"
      }
    >
      {showEmployeePassword ? (
        <EyeOff size={18} />
      ) : (
        <Eye size={18} />
      )}
    </button>
  )}
</div>
                </label>
              ))}
              <div className="sm:col-span-2 rounded-2xl border border-violet-200 bg-violet-50/70 p-3 sm:p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-violet-950"><ScanFace size={18} /> Face Registration <span className={faceDescriptor ? "ml-auto text-emerald-700" : "ml-auto text-amber-700"}>{faceDescriptor ? "Face captured ✓" : "Required"}</span></div>
                <p className="mb-2 text-xs leading-5 text-slate-600">Register the employee's face for secure attendance verification.</p>
                 <video
                     ref={enrollmentVideoRef}
                             autoPlay
                              muted
                                playsInline
                           className="mb-3 h-40 w-full max-w-md mx-auto rounded-xl bg-slate-950 object-cover"
                    />
                {faceStatus && <p className="mb-3 text-xs text-slate-700" role="status">{faceStatus}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={startEnrollmentCamera} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-800"><Camera size={15}/> Open Camera</button>
                  <button type="button" onClick={captureEmployeeFace} disabled={faceBusy} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><ScanFace size={15}/>{faceBusy ? "Detecting..." : "Capture Face"}</button>
                  <button type="button" onClick={() => { setFaceDescriptor(null); setFaceStatus("Face capture reset karein."); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Retake</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => { stopEnrollmentCamera(); setFaceDescriptor(null); setShowForm(false); }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !faceDescriptor}
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:bg-purple-700 disabled:opacity-60 transition"
                >
                  {saving ? "Saving..." : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
{/* Edit Employee Modal */}
{showEditForm && editingEmployee && (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
    <div className="my-8 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Edit Employee
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Update employee details
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowEditForm(false);
            setEditingEmployee(null);
          }}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      <form
       
onSubmit={async (e) => {
  e.preventDefault();
  setSaving(true);
  setError("");
  setMessage("");

  try {
    const token = getToken();

    const response = await fetch(
      `${API}/employees/${editingEmployee._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingEmployee.name,
          employeeId: editingEmployee.employeeId,
          email: editingEmployee.email,
          department: editingEmployee.department,
          designation: editingEmployee.designation,
        }),
      }
    );

    const data = await readResponse(response, "Failed to update employee");

    setEmployees((old) =>
      old.map((emp) =>
        emp._id === data.employee._id ? data.employee : emp
      )
    );

    setMessage("Employee details updated successfully.");
    setShowEditForm(false);
    setEditingEmployee(null);
    await loadDashboard();
  } catch (err) {
    setError(err.message || "Failed to update employee.");
  } finally {
    setSaving(false);
  }
}}
 
        className="grid gap-4 sm:grid-cols-2"
      >
        {[
          ["name", "Full Name"],
          ["employeeId", "Employee ID"],
          ["email", "Email Address"],
          ["department", "Department"],
          ["designation", "Designation"],
        ].map(([field, label]) => (
          <label key={field} className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              {label}
            </span>
            <input
              name={field}
              value={editingEmployee[field] || ""}
              onChange={(e) =>
                setEditingEmployee((old) => ({
                  ...old,
                  [field]: e.target.value,
                }))
              }
              required={["name", "employeeId", "email"].includes(field)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </label>
        ))}

        <div className="flex justify-end gap-3 sm:col-span-2">
          <button
            type="button"
            onClick={() => {
              setShowEditForm(false);
              setEditingEmployee(null);
              setError("");
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Photo Preview Modal */}
{selectedPhoto && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
    <div className="relative max-w-lg w-full rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Live Attendance Selfie</h3>
          <p className="text-xs text-slate-500">Captured at the moment of employee check-in</p>
        </div>
        <button
          onClick={() => setSelectedPhoto(null)}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={20} />
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl bg-black shadow-inner flex items-center justify-center max-h-[65vh]">
        <img src={selectedPhoto} alt="Live selfie" className="w-full h-auto object-contain max-h-[65vh]" />
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setSelectedPhoto(null)}
          className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}



