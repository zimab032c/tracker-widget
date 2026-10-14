# Exercise Widget — circular day markers, monthly grid, free cloud sync

A tiny, responsive habit tracker with circular days, a regular month grid, a configurable color palette, light/dark mode, and private cross-device sync. No build step, paid widget service, or monthly view limit.

## Important Notion limitation

Notion's documentation states that **embeds requiring external login do not work in Notion's desktop/mobile apps**. This widget has an email-link login, so the **standalone URL is the reliable cross-device option**. In a browser, embedding may work, but it is not guaranteed (especially with third-party-storage restrictions). Add a link in your Notion page as a fallback for its apps.

## Setup (about 15–30 minutes)

### 1. Create a free Supabase project

1. Open https://supabase.com/dashboard and make a free project.
2. Go to **SQL Editor** → **New query**. Paste all of `setup.sql` and run it once. This creates the tables and row-level security rules (your records belong only to your account).
3. Go to **Authentication** → **Providers** → **Email** and make sure email OTP/passwordless sign-in is enabled.
4. **Do not edit Email Templates or set up SMTP.** The widget uses Supabase's default email *magic link* to sign in. Since June 2026, free Supabase projects using the default email sender cannot edit templates anyway.
5. Once you have published your widget to GitHub Pages, go to **Authentication → URL Configuration** and set **Site URL** to `https://YOUR-USERNAME.github.io/exercise-widget/`. Under **Redirect URLs**, add that same exact URL. When you click the email link, Supabase will return you to your hosted widget.
6. IMPORTANT: Supabase's default email sender only sends to emails belonging to members of your Supabase organization/team. Use the same email address as your Supabase account when testing, on both devices. Other addresses need custom SMTP.
7. Go to **Project Settings** → **API** (sometimes **Connect** → **API keys**). Copy the **Project URL** and **publishable** key (`sb_publishable_...`) or the legacy `anon` public key.

### 2. Add the public configuration

Open `config.js` and replace the two `PASTE_...` placeholders with your URL and publishable key. **Never use a `service_role` or secret key in a public website.** Supabase's Row Level Security policies protect the table even though the public publishable key is visible.

Example:

```js
window.WIDGET_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabasePublishableKey: "sb_publishable_YOUR_PUBLIC_KEY"
};
```

### 3. Host for free with GitHub Pages

1. Create a **public** GitHub repository, e.g. `exercise-widget`.
2. Upload `index.html`, `style.css`, `app.js`, and your edited `config.js` to the repository root. (You can also upload `setup.sql` and `README.md` if you wish.)
3. Under **Settings → Pages**, select **Deploy from a branch**, branch **main**, folder **/(root)**, and save.
4. Your widget should appear at `https://YOUR-USERNAME.github.io/exercise-widget/` within a few minutes. Open that URL in a new browser tab and test email-link login before embedding it.

GitHub Pages hosts public sites, so don't place secrets in this repo. The publishable key isn't a secret.

### 4. Add it to Notion

- On a Notion page type `/embed`, then paste your GitHub Pages URL.
- Resize the block to roughly **475 × 520 px** (or larger if you open the color settings).
- Also add a regular **link to the widget** on the page for use in Notion mobile/desktop apps, where logged-in embeds are unsupported.
- Open the *same URL* on your Mac and iPhone, enter the *same email* on both, and follow the email sign-in link each device sends. Your checked days and chosen color/theme will sync.

## Usage

- Click a dated circle to mark/unmark exercise. Future days cannot be checked.
- Use the arrows to browse earlier months, and **Today** to return to the current month.
- Click the gear to change accent colors, pick any custom color, change theme, or sign out.
- The progress bar is calculated against days elapsed so far this month (not future days).
- Data is saved to Supabase. If you open the same account on two devices, switching back to the widget refreshes the latest entries.

## Preview mode

Before `config.js` is filled in, you can open the widget for a **visual demo**. It says `Preview · not synced`; demo taps are intentionally **not saved**. You need to complete steps 1–3 to enable actual syncing.

## Troubleshooting

- **Email sends a link instead of a number:** that is correct for this version. Click the link to sign in.
- **Sign-in email isn't arriving:** check Supabase's email sending limits and your spam folder. Supabase's built-in email service is rate limited; for personal use it normally suffices, but limits can change.
- **"Could not sync":** run `setup.sql`, confirm RLS policies are present, and make sure you're signed into the same email on both devices.
- **The widget doesn't load inside Notion:** use the standalone URL, particularly in Notion desktop/mobile apps. Notion warns that external sign-in embeds won't work there.
- **Your session doesn't stay logged in inside the embed:** this can happen because embedded third-party browser storage is restricted. Use the standalone URL.
- **It says "Preview · not synced":** your public project URL/key in `config.js` are still placeholders or invalid.

## Privacy / security

- Your login is backed by Supabase Auth.
- The database has per-user Row Level Security for every read/write action.
- Passwords are not used; only one-time email sign-in links.
- A GitHub Pages repository is public, but it contains no private credentials; your publishable Supabase key may safely be public.
- Progress is not stored in the Notion database itself.

## Technical details

Vanilla HTML/CSS/JS, `@supabase/supabase-js` v2 via CDN, Supabase Postgres/Auth, GitHub Pages static hosting. No compilation or npm required.
