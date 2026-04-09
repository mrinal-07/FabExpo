import React from "react";
import { Link } from "react-router-dom";
import { api } from "./api.js";

export function CompanyOnboarding({ me, onDone }) {
  const existing = me.companyProfile || {};
  const [form, setForm] = React.useState({
    brandName: existing.brandName || "",
    website: existing.website || "",
    gstNumber: existing.gstNumber || "",
    address: {
      line1: existing.address?.line1 || "",
      line2: existing.address?.line2 || "",
      city: existing.address?.city || "",
      state: existing.address?.state || "",
      pincode: existing.address?.pincode || "",
      country: existing.address?.country || "India"
    },
    docs: {
      gstCertificateUrl: existing.docs?.gstCertificateUrl || "",
      addressProofUrl: existing.docs?.addressProofUrl || ""
    }
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [ok, setOk] = React.useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      await api.companySubmitOnboarding(form);
      await onDone();
      setOk("Submitted. Status is now pending verification.");
    } catch (e2) {
      setError(e2.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  const status = me.companyProfile?.verificationStatus || "unsubmitted";

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Company onboarding</h2>
        <Link className="btn" to="/">
          Home
        </Link>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        Submit business details for verification. Only <strong>verified</strong> companies can review listings and award points.
      </p>

      <div className="spacer" />
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Status</strong>
          <span className="pill">{status}</span>
        </div>
        {me.companyProfile?.verificationNote ? (
          <p className="muted" style={{ marginTop: 8 }}>
            Note: {me.companyProfile.verificationNote}
          </p>
        ) : null}
      </div>

      <div className="spacer" />
      <div className="card">
        {error ? <div className="error">{error}</div> : null}
        {ok ? <div className="card" style={{ borderColor: "rgba(34,197,94,0.45)" }}>{ok}</div> : null}
        <form onSubmit={submit}>
          <label>Brand name</label>
          <input value={form.brandName} onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))} required />

          <label>Website (optional)</label>
          <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />

          <label>GST number</label>
          <input value={form.gstNumber} onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))} required />

          <label>Address line 1</label>
          <input value={form.address.line1} onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, line1: e.target.value } }))} required />
          <label>Address line 2 (optional)</label>
          <input value={form.address.line2} onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, line2: e.target.value } }))} />

          <div className="row">
            <div style={{ flex: 1, minWidth: 180 }}>
              <label>City</label>
              <input value={form.address.city} onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))} required />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label>State</label>
              <input value={form.address.state} onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, state: e.target.value } }))} required />
            </div>
          </div>

          <div className="row">
            <div style={{ flex: 1, minWidth: 180 }}>
              <label>Pincode</label>
              <input value={form.address.pincode} onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, pincode: e.target.value } }))} required />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label>Country</label>
              <input value={form.address.country} onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, country: e.target.value } }))} />
            </div>
          </div>

          <label>GST certificate URL (MVP)</label>
          <input value={form.docs.gstCertificateUrl} onChange={(e) => setForm((f) => ({ ...f, docs: { ...f.docs, gstCertificateUrl: e.target.value } }))} />

          <label>Address proof URL (MVP)</label>
          <input value={form.docs.addressProofUrl} onChange={(e) => setForm((f) => ({ ...f, docs: { ...f.docs, addressProofUrl: e.target.value } }))} />

          <div className="spacer" />
          <button className="btn primary" disabled={busy}>
            {busy ? "Submitting..." : "Submit for verification"}
          </button>
        </form>
      </div>
    </div>
  );
}

