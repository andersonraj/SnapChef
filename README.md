# 🍳 SnapChef

**Snap your fridge. Cook zero-waste. Save money.**

SnapChef is a smart kitchen assistant built for college students. Take a photo of your fridge or upload a grocery receipt, and AI builds your digital pantry, tracks what's about to expire, and generates recipes using only the food you already have, with the true cost of every meal.

Built for a college demo night with Next.js, Supabase, and Google Gemini.

---

## ✨ Features

| Feature | What it does |
|---|---|
| **AI Scan** | Photograph your fridge or a receipt; Gemini extracts items, quantities, prices, and estimated shelf life. You review and edit before saving. |
| **Digital Pantry** | See everything in stock, sorted by expiry, with color-coded badges. Search, filter to "Expiring", add items manually, and mark items used, wasted, or deleted. |
| **Zero-Waste Recipes** | Generates 3 recipes from your pantry, prioritizing food closest to expiring. Respects dietary preferences and allergies saved on your profile. |
| **True Cost-Per-Meal** | Costs are computed on the server from real receipt prices (not guessed by the AI), so every dollar figure traces back to a purchase. |
| **Cook This** | One tap logs the meal and deducts the ingredients from your pantry. |
| **Meal History** | Every cooked meal with ingredients, steps, total cost, cost per serving, and running totals. |
| **Dashboard** | At-a-glance pantry count, weekly grocery spend, meals cooked, and items to use soon. |

### Roadmap

The database schema already includes tables for these, but the UI is not built yet:

- 👯 **Group Potluck mode**: merge friends' pantries with a room code, then split prep and cost for a shared meal
- 🛒 **Smart grocery list** with live web pricing

---

## 🧱 Tech Stack

- **Frontend:** Next.js 16 (App Router, Cache Components), React, Tailwind CSS v4, Lucide icons
- **Backend:** Next.js Route Handlers
- **Database and Auth:** Supabase (PostgreSQL, Row Level Security, Supabase Auth, Storage)
- **AI:** Google Gemini via the `@google/genai` SDK (vision for scanning, structured JSON for recipes)
- **Validation:** Zod

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 22 or newer** ([download](https://nodejs.org)). Check with `node -v`.
- A free **[Supabase](https://supabase.com)** account
- A free **[Google AI Studio](https://aistudio.google.com)** account for a Gemini API key

### 1. Clone and install

```bash
git clone <your-repo-url>
cd snapchef
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates all tables, security policies, triggers, the storage bucket, and realtime settings.
3. In **Table Editor**, confirm you can see `profiles`, `receipts`, `pantry_items`, `meal_logs`, `group_sessions`, and `group_session_members`.
4. Go to **Authentication → Providers → Email** and turn **off** "Confirm email" (so test accounts can sign in immediately).
5. Go to **Project Settings → API** and copy your **Project URL** and your **anon / publishable key**.

### 3. Get a Gemini API key

Create a key in [Google AI Studio](https://aistudio.google.com/apikey).

### 4. Configure environment variables

Create a file named `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash
NEXT_PUBLIC_APP_NAME=SnapChef
```

> `.env.local` is git-ignored. Never commit your keys.

### 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Create an account**, and sign up. A profile is created automatically.

### 6. Try the demo flow

1. **Scan** tab → upload a fridge photo or receipt → review items → **Add to pantry**
2. **Pantry** tab → see items with expiry badges
3. **Recipes** tab → **Cook with what I have** → see costs per serving
4. Tap **Cook this** → pantry updates → check **History**

> 💡 Receipt scans capture prices; fridge photos don't. Items without a price count as $0.00 in recipe costs, so scan a receipt (or edit prices in the review screen) for realistic numbers.

---

## 📱 Testing on a phone

Your phone can't use `localhost`. Options:

**Same Wi-Fi:** find your computer's Wi-Fi IPv4 address (`ipconfig` on Windows, `ifconfig` on macOS/Linux) and open `http://<that-ip>:3000` on your phone. Add that IP to `allowedDevOrigins` in `next.config.ts`, then restart the dev server. Next.js blocks dev scripts from unlisted addresses, which makes buttons silently do nothing. Some routers block device-to-device traffic, in which case use a tunnel.

**Tunnel (works on any network):**

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Add the tunnel's hostname pattern (for example `"*.trycloudflare.com"`) to `allowedDevOrigins`, restart, and open the printed link.

**Production build:** much faster than dev mode.

```bash
npm run build
npm start
```

---

## ☁️ Deploying

The easiest path is **[Vercel](https://vercel.com)**:

1. Push the repo to GitHub and import it in Vercel.
2. Add the five environment variables from `.env.local` in **Project Settings → Environment Variables**.
3. Deploy, then add your Vercel URL under **Supabase → Authentication → URL Configuration → Site URL**.

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── (auth)/login/           # Sign in / sign up
│   ├── (app)/                  # Authenticated app shell + bottom nav
│   │   ├── dashboard/
│   │   ├── pantry/
│   │   ├── scan/
│   │   ├── recipes/
│   │   └── history/
│   ├── api/
│   │   ├── scan/               # Image → Gemini → items
│   │   └── recipes/generate/   # Pantry → Gemini → recipes + costs
│   └── globals.css             # Theme + animations
├── components/                 # BottomNav, SignOutButton, CountUp
├── lib/
│   ├── supabase/               # Browser, server, and proxy clients
│   └── ai/                     # Gemini client, prompts, Zod schemas
└── proxy.ts                    # Session refresh + route protection
supabase/
└── schema.sql                  # Full database schema with RLS
```

---

## 🔒 Security Notes

- Every table uses **Row Level Security**; users can only read and write their own data.
- Uploaded images live in a private storage bucket with per-user folders.
- The Gemini key is only used server-side (in Route Handlers) and is never sent to the browser.
- Only the Supabase **anon/publishable** key is exposed to the client. Never put a `service_role` key in `NEXT_PUBLIC_*` variables.

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| Login button does nothing / page reloads to `/login?` | The address you're using isn't in `allowedDevOrigins` in `next.config.ts`. Add it and restart the dev server. |
| "Invalid login credentials" | The email/password doesn't match an account. Check **Supabase → Authentication → Users**, or create a new account. |
| "Email not confirmed" | Turn off **Confirm email** in Supabase (Setup step 2.4). |
| Scan or recipes fail | Check the terminal for `Scan failed:` or `Recipe generation failed:`. Common causes: wrong `GEMINI_API_KEY`, a retired model name in `GEMINI_MODEL`, or free-tier rate limits (wait a minute). |
| Model not found | Gemini models get retired. Check [Google's deprecations page](https://ai.google.dev/gemini-api/docs/deprecations) and update `GEMINI_MODEL`. |
| Unstyled / text hard to read | Restart the dev server after CSS changes. |
| Node version warning from Supabase | Upgrade to Node 22 or newer. |

---

## 📄 License

Add a license of your choice (for example MIT) before making the repo public.

---

*Built for demo night by Anderson.*