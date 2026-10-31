
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, readResponse } from "./apiConfig";
import {
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  ShieldCheck,
  Clock3,
  MapPin,
} from "lucide-react";

export default function Login() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeId.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid Employee ID or password.");
      }

      const user = data.user || data.employee;

      if (!data.token || !user?.role) {
        throw new Error("Invalid login response from server.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", user.role.toLowerCase());

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Backend se connection nahi ho raha. Server check karo."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f7f8ff] text-slate-900 lg:grid-cols-[1.02fr_0.98fr]">
      {/* Soft brand-colour glow */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-fuchsia-300/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />

      {/* YUNIFY brand panel */}
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#090d27] p-10 text-white lg:flex xl:p-14">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_15%,rgba(91,64,255,0.34),transparent_42%),radial-gradient(ellipse_at_85%_85%,rgba(0,204,230,0.22),transparent_38%)]" />
        <div aria-hidden="true" className="absolute -right-24 top-28 h-80 w-80 rounded-full border border-cyan-300/20" />
        <div aria-hidden="true" className="absolute -right-10 top-44 h-52 w-52 rounded-full border border-fuchsia-300/20" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white p-1.5 shadow-lg shadow-fuchsia-950/30">
            <img src="/yunify-logo.png" alt="YUNIFY logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-[0.16em] text-white">YUNIFY</h2>
            <p className="mt-1 text-xs font-semibold tracking-[0.16em] text-cyan-200">SMART ATTENDANCE PORTAL</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl py-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-white/[0.07] px-4 py-2 text-xs font-bold tracking-[0.18em] text-cyan-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            SMART WORKPLACE
          </span>
          <h1 className="mt-7 text-5xl font-black leading-[1.12] tracking-tight xl:text-6xl">
            Your workday,
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-fuchsia-400 bg-clip-text text-transparent">
              made smarter.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
            A smarter way to manage attendance, track working hours and keep your workplace connected.
          </p>

          <div className="mt-10 grid max-w-md gap-3 sm:grid-cols-1">
            {[
              [ShieldCheck, "Secure employee access", "Protected sign-in for your team"],
              [Clock3, "Smart attendance management", "Work hours and breaks in one place"],
              [MapPin, "Consent-based location sharing", "Location only when permission is given"],
            ].map(([Icon, label, detail]) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500/30 to-fuchsia-500/30 text-cyan-200 ring-1 ring-white/10">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{label}</span>
                  <span className="mt-1 block text-xs text-slate-400">{detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-slate-400">
          <span>© 2026 YUNIFY · Empowering Growth • Talent • Technology</span>
          <span className="hidden rounded-full border border-emerald-300/20 px-3 py-1.5 text-emerald-200 sm:inline-flex">Secure access</span>
        </div>
      </section>

      {/* Login form */}
      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-violet-200/70 ring-1 ring-violet-100">
              <img src="/yunify-logo.png" alt="YUNIFY logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-[0.12em] text-violet-700">YUNIFY</h2>
              <p className="text-xs font-semibold text-slate-500">Smart Attendance Portal</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white bg-white/95 p-7 shadow-[0_25px_80px_rgba(58,40,130,0.13)] ring-1 ring-violet-100/80 backdrop-blur sm:p-10">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-50 to-cyan-50 px-3.5 py-2 text-[11px] font-extrabold tracking-[0.18em] text-violet-700 ring-1 ring-violet-100">
                <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
                WELCOME BACK
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-[#111735] sm:text-[2.1rem]">
                Sign in to your account
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enter your company credentials to continue to your workspace.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="employeeId" className="mb-2 block text-sm font-bold text-slate-700">
                  Employee ID
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-violet-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-500/10">
                  <UserRound size={19} className="shrink-0 text-violet-500" />
                  <input
                    id="employeeId"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Enter your Employee ID"
                    autoComplete="username"
                    required
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-violet-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-500/10">
                  <LockKeyhole size={19} className="shrink-0 text-violet-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="shrink-0 text-slate-400 transition hover:text-violet-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-sm font-semibold text-violet-700 transition hover:text-violet-900 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-5 text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-[3.25rem] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-purple-600 to-blue-600 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/30 active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-white/15 to-fuchsia-300/0 opacity-0 transition group-hover:opacity-100" />
                <span className="relative">{loading ? "Signing in..." : "Sign In"}</span>
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
              <ShieldCheck size={16} className="text-emerald-500" />
              Authorized employees only
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © 2026 YUNIFY · Empowering Growth • Talent • Technology
          </p>
        </div>
      </section>
    </main>
  );
}
