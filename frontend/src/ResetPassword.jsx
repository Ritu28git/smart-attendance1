
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { API_URL as API, readResponse } from "./apiConfig";

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 12) {
      setError("Password kam se kam 12 characters ka hona chahiye.");
      return;
    }

    if (password.length > 128) {
      setError("Password 128 characters se zyada nahi ho sakta.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Dono passwords match nahi kar rahe.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API}/auth/reset-password/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset failed");
      }

      setSuccess(true);
      setMessage(data.message || "Password reset successful.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Server se connect nahi ho pa raha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-slate-800">
          Reset Password
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          Apna naya password set karo.
        </p>

        {success ? (
          <div>
            <p className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
            <Link
              to="/login"
              className="block rounded-lg bg-indigo-600 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-700"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              New Password
              <input
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Confirm New Password
              <input
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter password again"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-indigo-600">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
