## Fabric Reuse (MERN)

Marketplace-style fabric reuse platform:
- Users sign up/login and upload old-cloth listings with photos.
- Companies review listings and award points.
- Users redeem points for **partner-style voucher codes** (Myntra / Nykaa labels in the demo). Real brands usually require **bulk-purchased codes** or a **B2B gift-card API**—this app assigns codes you load into the database.

### Repo structure
- `server/`: Node/Express API + MongoDB
- `client/`: React (Vite) web app

### Prerequisites
- Node.js 18+ (recommended)
- MongoDB (local or Atlas)

### Environment variables
Create `server/.env`:

```bash
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/fabric_reuse
JWT_SECRET=change_me_to_a_long_random_string
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
# Optional: protect POST /api/redemptions/admin/vouchers (bulk upload codes)
# ADMIN_KEY=your_secret_key
```

### Run backend
From `server/`:
- Install: `npm install`
- Start: `npm run dev`

### Run frontend
From `client/`:
- Install: `npm install`
- Start: `npm run dev`

### MVP features implemented
- Auth (register/login) with JWT
- Roles: `user`, `company`, `admin`
- Create cloth listing with photo upload (user only)
- List/search listings
- Company can review a listing and award points to the user
- **Redeem points** for voucher codes (catalog + stock + history)
- **1:1 chat** between users and companies (Socket.io real-time + REST history)

### Seed demo voucher offers (Myntra / Nykaa–style)
From `server/` after MongoDB is configured:

```bash
npm run seed
```

This creates two offers and demo codes (safe for local testing).

### Load real voucher codes (admin)
Set `ADMIN_KEY` in `server/.env`, then `POST /api/redemptions/admin/vouchers` with header `x-admin-key: <ADMIN_KEY>` and JSON body `{ "offerId": "<mongo id>", "codes": ["CODE1", "CODE2"] }`.

### Next features (we can add next)
- Company onboarding + KYC-ish verification
- Admin moderation queue
- Better image storage (Cloudinary/S3)
