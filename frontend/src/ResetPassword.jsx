
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

    if (!token) {
      setError("Reset link invalid hai. Please naya reset link request karo.");
      return;
    }

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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        }
      );

      const data = await readResponse(
        response,
        "Password reset failed. Please try again."
      );

      setSuccess(true);
      setMessage(data.message || "Password reset successful.");

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message || "Server se connect nahi ho pa raha."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl">
            🔐
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            Reset Password
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Apna naya password set karo.
          </p>
        </div>

        {success ? (
          <div>
            <div className="mb-5 rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
              <p className="mb-1 font-bold">
                Password Updated Successfully!
              </p>
              <p>{message}</p>
            </div>

            <Link
              to="/login"
              className="block w-full rounded-lg bg-indigo-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-indigo-700"
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
                placeholder="Enter new password"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                placeholder="Confirm new password"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <p className="text-xs text-slate-500">
              Password must be between 12 and 128 characters.
            </p>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating Password..." : "Reset Password"}
            </button>

          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:underline"
          >
            Back to Login
          </Link>
        </p>

      </div>
    </div>
  );
}
