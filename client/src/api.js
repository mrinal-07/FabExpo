export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("fr_token") || "";
}

export function setToken(token) {
  if (!token) localStorage.removeItem("fr_token");
  else localStorage.setItem("fr_token", token);
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${API_BASE}. Start the backend (cd server → npm run dev) and check the port matches VITE_API_BASE.`
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  health: () => request("/health"),
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  me: () => request("/api/me"),
  listings: ({ q = "", mine = false } = {}) =>
    request(`/api/listings?q=${encodeURIComponent(q)}&mine=${mine ? "true" : "false"}`),
  createListing: (formData) =>
    request("/api/listings", { method: "POST", body: formData, isForm: true }),
  reviewListing: (id, payload) =>
    request(`/api/listings/${id}/review`, { method: "POST", body: payload }),
  schedulePickup: (id, payload) =>
    request(`/api/listings/${id}/pickup/schedule`, { method: "POST", body: payload }),
  getPickup: (id) => request(`/api/listings/${id}/pickup`),
  assignCourier: (id, payload) =>
    request(`/api/listings/${id}/pickup/courier`, { method: "POST", body: payload }),
  receivePickup: (id) => 
    request(`/api/listings/${id}/pickup/receive`, { method: "POST" }),
  verifyListing: (id, payload) =>
    request(`/api/listings/${id}/verify`, { method: "POST", body: payload }),
  redemptionCatalog: () => request("/api/redemptions/catalog"),
  redemptionMine: () => request("/api/redemptions/mine"),
  redeem: (offerId) =>
    request("/api/redemptions/redeem", { method: "POST", body: { offerId } }),
  chatCompanies: () => request("/api/chat/companies"),
  chatUsers: () => request("/api/chat/users"),
  chatConversations: () => request("/api/chat/conversations"),
  chatCreateConversation: (body) =>
    request("/api/chat/conversations", { method: "POST", body }),
  chatMessages: (conversationId) =>
    request(`/api/chat/conversations/${conversationId}/messages`),
  chatSendMessage: (conversationId, text) =>
    request(`/api/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { body: text }
    }),
  companySubmitOnboarding: (payload) =>
    request("/api/company/onboarding/submit", { method: "POST", body: payload }),
  companyOnboardingStatus: () => request("/api/company/onboarding/status")
};

