import React from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { api, setToken, getToken, API_BASE } from "./api.js";
import { ChatPage } from "./ChatPage.jsx";
import { CompanyOnboarding } from "./CompanyOnboarding.jsx";

function useMe() {
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(getToken()));
  const [error, setError] = React.useState("");

  const refresh = React.useCallback(async () => {
    const token = getToken();
    if (!token) {
      setMe(null);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.me();
      setMe(data);
    } catch (e) {
      setToken("");
      setMe(null);
      setError(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { me, loading, error, refresh };
}

function Nav({ me, onLogout }) {
  return (
    <div className="nav">
      <div className="brand">
        <Link to="/">Fabric Reuse</Link>
        <span className="badge">MVP</span>
      </div>
      <div className="row">
        {me ? (
          <>
            {me.role === "user" ? (
              <Link className="btn" to="/redeem">
                Redeem points
              </Link>
            ) : null}
            {me.role === "company" ? (
              <Link className="btn" to="/company/onboarding">
                Verification
              </Link>
            ) : null}
            {me.role === "user" || me.role === "company" ? (
              <Link className="btn" to="/chat">
                Messages
              </Link>
            ) : null}
            <div className="profile">
  <strong>{me.name}</strong>
  <div className="muted">{me.email}</div>

  <div className="muted">
    {me.address?.line1 && `${me.address.line1}, `}
    {me.address?.city && `${me.address.city}, `}
    {me.address?.state && `${me.address.state} `}
    {me.address?.pincode}
  </div>
</div>
            {me.role === "company" ? (
              <span className="pill">
                {me.companyProfile?.verificationStatus || "unsubmitted"}
              </span>
            ) : null}
            <button className="btn" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link className="btn primary" to="/login">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}

function LoginPage({ onAuthed }) {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState("login"); // login | register
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data =
        mode === "login"
          ? await api.login({ email: form.email, password: form.password })
          : await api.register({
              name: form.name,
              email: form.email,
              password: form.password,
              role: form.role
            });
      setToken(data.token);
      await onAuthed();
      navigate("/");
    } catch (e2) {
      setError(e2.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>{mode === "login" ? "Login" : "Create an account"}</h2>
        <p className="muted">
          Users upload cloth listings. Companies review and award points.
        </p>
        {error ? <div className="error">{error}</div> : null}
        <form onSubmit={submit}>
          {mode === "register" ? (
            <>
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                required
              />
              <label>Account type</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="user">User (send/sell clothes)</option>
                <option value="company">Company (review & award points)</option>
              </select>
            </>
          ) : null}

          <label>Email</label>
          <input
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="name@email.com"
            type="email"
            required
          />

          <label>Password</label>
          <input
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min 8 characters"
            type="password"
            required
          />

          <div className="spacer" />
          <div className="row">
            <button className="btn primary" disabled={busy}>
              {busy ? "Please wait..." : mode === "login" ? "Login" : "Register"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
              disabled={busy}
            >
              {mode === "login" ? "Create account" : "I already have an account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadCard({ onCreated }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("Other");
  const [condition, setCondition] = React.useState("good");
  const [weightKg, setWeightKg] = React.useState("0");
  const [files, setFiles] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("category", category);
      fd.append("condition", condition);
      fd.append("weightKg", weightKg);
      for (const f of files) fd.append("photos", f);

      await api.createListing(fd);
      setTitle("");
      setDescription("");
      setFiles([]);
      await onCreated();
    } catch (e2) {
      setError(e2.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Upload your cloth</h2>
      <p className="muted">
        Add 1–5 photos. Companies will review and award points.
      </p>
      {error ? <div className="error">{error}</div> : null}
      <form onSubmit={submit}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="row">
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>
        <label>Weight (kg) (optional)</label>
        <input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />

        <label>Photos</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          required
        />

        <div className="spacer" />
        <button className="btn primary" disabled={busy}>
          {busy ? "Uploading..." : "Submit listing"}
        </button>
      </form>
    </div>
  );
}

function SchedulePickupForm({ listingId, onScheduled, onCancel }) {
  const [address, setAddress] = React.useState({ line1: "", city: "", state: "", pincode: "" });
  const [phone, setPhone] = React.useState("");
  const [date, setDate] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!date) throw new Error("Please select a date");
      await api.schedulePickup(listingId, {
        scheduledFor: new Date(date).toISOString(),
        address: { ...address, country: "India" },
        contactPhone: phone
      });
      await onScheduled();
    } catch (err) {
      setError(err.message || "Failed to schedule pickup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 12, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Schedule Pickup</h3>
      {error ? <div className="error">{error}</div> : null}
      <form onSubmit={submit}>
        <div className="row">
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Address Line 1</label>
            <input required value={address.line1} onChange={e => setAddress({ ...address, line1: e.target.value })} placeholder="123 Main St" />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>City</label>
            <input required value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>State</label>
            <input required value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Pincode</label>
            <input required value={address.pincode} onChange={e => setAddress({ ...address, pincode: e.target.value })} />
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Phone Number</label>
            <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Pickup Date</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div className="spacer" />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={busy}>{busy ? "Scheduling..." : "Confirm Schedule"}</button>
          <button className="btn" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function Listings({ me }) {
  const [q, setQ] = React.useState("");
  const [mine, setMine] = React.useState(me?.role === "user");
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [schedulingFor, setSchedulingFor] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listings({ q, mine });
      setItems(data.listings || []);
    } catch (e) {
      setError(e.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [q, mine]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function award(listingId) {
    const points = Number(prompt("Points to award (0-5000):", "100") || "0");
    if (!Number.isFinite(points) || points < 0) return;
    await api.reviewListing(listingId, { status: "accepted", pointsAwarded: points, note: "" });
    await load();
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Listings</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            {me.role === "user"
              ? "Your submissions and public feed."
              : "Review user submissions and award points."}
          </p>
        </div>
        <span className="pill">{items.length} shown</span>
      </div>

      <div className="row">
        <input
          style={{ flex: 1, minWidth: 220 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title..."
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          <span className="muted">Only mine</span>
        </label>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="spacer" />
      {error ? <div className="error">{error}</div> : null}
      {loading ? <p className="muted">Loading...</p> : null}

      <div className="list">
        {items.map((it) => (
          <div className="tile" key={it._id}>
            <img src={`${API_BASE}${it.photos?.[0] || ""}`} alt={it.title} />
            <div className="content">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{it.title}</strong>
                <span className="pill">{it.status}</span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {it.category} · {it.condition}
              </div>
              {it.description ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  {it.description}
                </div>
              ) : null}

              {it.review ? (
                <div className="row" style={{ marginTop: 10 }}>
                  <span className="pill">
                    reviewed: {it.review.status} · +{it.review.pointsAwarded} pts
                  </span>
                </div>
              ) : null}

              {me.role === "company" && !it.review ? (
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={() => award(it._id)}>
                    Accept + award points
                  </button>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      await api.reviewListing(it._id, { status: "rejected", pointsAwarded: 0, note: "" });
                      await load();
                    }}
                  >
                    Reject
                  </button>
                </div>
              ) : null}

              {me.role === "user" && it.status === "accepted" && schedulingFor !== it._id ? (
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={() => setSchedulingFor(it._id)}>
                    Schedule Pickup
                  </button>
                </div>
              ) : null}

              {schedulingFor === it._id && me.role === "user" && it.status === "accepted" ? (
                <SchedulePickupForm 
                  listingId={it._id} 
                  onScheduled={async () => {
                    setSchedulingFor(null);
                    await load();
                  }}
                  onCancel={() => setSchedulingFor(null)} 
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RedeemPage({ me, onRedeemed }) {
  const [offers, setOffers] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busyId, setBusyId] = React.useState("");
  const [lastCode, setLastCode] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cat, mine] = await Promise.all([api.redemptionCatalog(), api.redemptionMine()]);
      setOffers(cat.offers || []);
      setHistory(mine.redemptions || []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function redeem(offerId) {
    setBusyId(offerId);
    setError("");
    setLastCode(null);
    try {
      const data = await api.redeem(offerId);
      setLastCode({
        code: data.voucherCode,
        partner: data.partnerKey,
        valueLabel: data.valueLabel
      });
      await onRedeemed();
      await load();
    } catch (e) {
      setError(e.message || "Redeem failed");
    } finally {
      setBusyId("");
    }
  }

  if (me.role !== "user") {
    return (
      <div className="container">
        <div className="card">
          <h2>Redeem</h2>
          <p className="muted">Only user accounts can redeem points for vouchers.</p>
          <Link className="btn" to="/">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Redeem points</h2>
        <Link className="btn" to="/">
          Back home
        </Link>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        Exchange your balance for a voucher code. In production, you load real codes you get from
        partners or gift-card providers; this app stores and assigns them safely.
      </p>
      <div className="spacer" />
      {error ? <div className="error">{error}</div> : null}
      {lastCode ? (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(34,197,94,0.45)" }}>
          <strong>Your voucher code</strong>
          <p className="muted" style={{ marginTop: 6 }}>
            {lastCode.partner} {lastCode.valueLabel ? `· ${lastCode.valueLabel}` : ""}
          </p>
          <div
            style={{
              marginTop: 10,
              fontFamily: "ui-monospace, monospace",
              fontSize: 18,
              letterSpacing: "0.04em",
              wordBreak: "break-all"
            }}
          >
            {lastCode.code}
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            Copy this code into the brand’s gift-card / voucher flow at checkout (subject to their
            terms).
          </p>
        </div>
      ) : null}

      {loading ? <p className="muted">Loading offers...</p> : null}

      <div className="list" style={{ marginTop: 12 }}>
        {offers.map((o) => (
          <div className="tile" key={o._id}>
            <div className="content">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{o.title}</strong>
                <span className="pill">{o.pointsCost} pts</span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {o.partnerKey} {o.valueLabel ? `· ${o.valueLabel}` : ""} · {o.availableCount} in
                stock
              </div>
              {o.description ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  {o.description}
                </div>
              ) : null}
              <div className="row" style={{ marginTop: 12 }}>
                <button
                  className="btn primary"
                  disabled={busyId === o._id || o.availableCount < 1 || me.pointsBalance < o.pointsCost}
                  onClick={() => redeem(o._id)}
                >
                  {busyId === o._id ? "Working..." : "Redeem"}
                </button>
                {me.pointsBalance < o.pointsCost ? (
                  <span className="muted">Not enough points</span>
                ) : o.availableCount < 1 ? (
                  <span className="muted">Out of stock</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="spacer" />
      <div className="card">
        <h2>Your redemptions</h2>
        {!history.length ? (
          <p className="muted">No redemptions yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {history.map((r) => (
              <li key={r._id} style={{ marginBottom: 10 }}>
                <strong>{r.title}</strong> · {r.pointsSpent} pts
                <div className="muted" style={{ fontFamily: "ui-monospace, monospace" }}>
                  {r.code}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Home({ me, onListingCreated }) {
  return (
    <div className="container">
      <div className="grid">
        <div>
          <Listings me={me} />
        </div>
        <div>
          {me.role === "user" ? <UploadCard onCreated={onListingCreated} /> : null}
          <div className="spacer" />
          <div className="card">
            <h2>How points work</h2>
            <p className="muted">
              A company reviews your listing and awards points. Use{" "}
              <Link to="/redeem">Redeem points</Link> to exchange points for partner voucher codes
              (Myntra / Nykaa–style offers in this demo).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { me, loading, error, refresh } = useMe();
  const navigate = useNavigate();

  function logout() {
    setToken("");
    refresh();
    navigate("/login");
  }

  return (
    <div className="container">
      <Nav me={me} onLogout={logout} />
      <div className="spacer" />

      {loading ? <p className="muted">Loading...</p> : null}
      {!loading && error ? <div className="error">{error}</div> : null}

      <Routes>
        <Route path="/login" element={<LoginPage onAuthed={refresh} />} />
        <Route
          path="/company/onboarding"
          element={
            me && me.role === "company" ? (
              <CompanyOnboarding me={me} onDone={refresh} />
            ) : me ? (
              <div className="container card">
                <p className="muted">Only company accounts can access onboarding.</p>
                <Link className="btn" to="/">
                  Home
                </Link>
              </div>
            ) : (
              <LoginPage onAuthed={refresh} />
            )
          }
        />
        <Route
          path="/redeem"
          element={
            me ? <RedeemPage me={me} onRedeemed={refresh} /> : <LoginPage onAuthed={refresh} />
          }
        />
        <Route
          path="/chat"
          element={
            me && (me.role === "user" || me.role === "company") ? (
              <ChatPage me={me} onRefreshMe={refresh} />
            ) : me ? (
              <div className="container card">
                <p className="muted">Chat is for users and companies only.</p>
                <Link className="btn" to="/">
                  Home
                </Link>
              </div>
            ) : (
              <LoginPage onAuthed={refresh} />
            )
          }
        />
        <Route
          path="/"
          element={
            me ? (
              <Home me={me} onListingCreated={refresh} />
            ) : (
              <div className="card">
                <h2>Welcome</h2>
                <p className="muted">
                  Please login to upload cloth listings or review them as a company.
                </p>
                <Link className="btn primary" to="/login">
                  Go to login
                </Link>
              </div>
            )
          }
        />
      </Routes>
    </div>
  );
}

