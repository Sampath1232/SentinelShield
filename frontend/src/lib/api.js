import axios from "axios";
import { generateFingerprint } from "./fingerprint";
export const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach bearer token from localStorage as a fallback (in case cookies blocked)
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("ss_token");

  if (t) {
    cfg.headers.Authorization = `Bearer ${t}`;
  }

  cfg.headers["X-Device-Fingerprint"] = generateFingerprint();
  console.log("Fingerprint:", cfg.headers["X-Device-Fingerprint"]);
  return cfg;
});

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
