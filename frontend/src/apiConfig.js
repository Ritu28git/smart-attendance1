// Centralized API configuration
// Local development backend default: http://localhost:5000
const DEFAULT_BASE = "http://localhost:5000";

const rawUrl = (import.meta.env.VITE_API_URL || DEFAULT_BASE).trim().replace(/\/+$/, "");

// Base backend URL (without trailing /api)
export const BACKEND_BASE = rawUrl.replace(/\/api$/, "");

// API URL (with /api suffix)
export const API_URL = `${BACKEND_BASE}/api`;

// Safe response reader to prevent "Unexpected token <" syntax errors
export async function readResponse(response, fallbackMsg = "Request failed") {
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      `${fallbackMsg} (status: ${response.status})`
    );
  }

  return data;
}
