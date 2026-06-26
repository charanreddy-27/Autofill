# 🚀 Deploying the showcase site to Vercel

The showcase site lives in **`web/`** — a static site (HTML/CSS/JS, no build step). The browser extension at the repo root is untouched and keeps working as "load unpacked." This guide ships **only the `web/` folder** to Vercel.

> ⏱️ First deploy takes about 3 minutes.

---

## ✅ TL;DR

1. Push this repo to GitHub (it already points at `github.com/charanreddy-27/Autofill`).
2. Import the repo on Vercel → **set Root Directory to `web`** → Deploy.
3. Update the live URL in 5 small places (see [Step 4](#step-4--point-the-metadata-at-your-real-url)).
4. Post on LinkedIn. 🎉

The one setting people miss: **Root Directory = `web`**. Get that right and everything else is automatic.

---

## Option A — GitHub import (recommended, gives you auto-deploys)

Every `git push` redeploys the site. This is the one to use.

### Step 1 — Push the repo

```bash
git add .
git commit -m "Add showcase site + docs"
git push
```

### Step 2 — Import on Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)** and sign in with GitHub.
2. Find **`Autofill`** in the list → **Import**.

### Step 3 — Configure (the important bit)

| Setting | Value |
|---|---|
| **Framework Preset** | **Other** |
| **Root Directory** | **`web`** ← click *Edit* and select the `web` folder |
| **Build Command** | *(leave empty)* |
| **Output Directory** | *(leave empty)* |
| **Install Command** | *(leave empty)* |

Then click **Deploy**. There's no build — Vercel just serves the static files. The `web/vercel.json` already turns on **clean URLs**, so `/about` and `/about-project` work without `.html`.

You'll get a URL like `https://autofill-vault-xxxx.vercel.app`. ✅

---

## Option B — Vercel CLI (you already have it installed)

The Vercel CLI (`vercel@43.x`) is on this machine. From the repo root:

```bash
cd web
vercel            # first run: log in + link the project. Accept the defaults.
vercel --prod     # ship it to production
```

Because you run it from inside `web/`, the root-directory problem disappears — the current folder *is* the project root. Done.

---

## Step 4 — Point the metadata at your real URL

Once you know your production URL (say `https://autofill-vault.vercel.app`, or a custom domain), replace the placeholder `https://autofill-vault.vercel.app` everywhere it appears so social cards and SEO use the right address.

Find them with a quick search for `autofill-vault.vercel.app` in:

- `web/index.html` — `<link rel="canonical">`, the `og:*` and `twitter:*` tags
- `web/about.html` — same block
- `web/about-project.html` — same block
- `web/robots.txt` — the `Sitemap:` line
- `web/sitemap.xml` — the three `<loc>` URLs

> If you keep the default `autofill-vault.vercel.app` and Vercel hands you a different subdomain, the site still works perfectly — only the social-preview image and canonical URL would point at the wrong place. Two minutes of find-and-replace fixes it.

After editing, `git push` (Option A) or `vercel --prod` (Option B) to redeploy.

---

## Step 5 — (Optional) Custom domain

1. Vercel project → **Settings → Domains → Add**.
2. Add e.g. `autofill.charanreddy.dev` (a subdomain of your portfolio reads great).
3. Add the **CNAME** record Vercel shows you at your DNS provider. SSL is automatic.
4. Redo [Step 4](#step-4--point-the-metadata-at-your-real-url) with the custom domain.

---

## 🧾 Manual checklist — only you can do these

- [ ] **Push to GitHub** (`git push`).
- [ ] **Import on Vercel** with **Root Directory = `web`** (Option A) *or* `cd web && vercel --prod` (Option B).
- [ ] **Grab the production URL** and run the find-and-replace in [Step 4](#step-4--point-the-metadata-at-your-real-url).
- [ ] **(Optional) Add a custom domain** + DNS CNAME.
- [ ] **Drop in real screenshots / a GIF** of the extension filling a form — replace or supplement the CSS mockup on the landing page, and the image in `README.md`. A 5-second screen recording of `Alt+Shift+F` filling a form is the single most convincing asset you can add.
- [ ] **Verify the social card**: paste your URL into [opengraph.xyz](https://www.opengraph.xyz/) or LinkedIn's [Post Inspector](https://www.linkedin.com/post-inspector/) and confirm `og.png` renders.
- [ ] **Test on your phone** — open the live URL, toggle the theme, tab through the nav.
- [ ] **Post on LinkedIn** (draft below), then paste the post URL into the "LinkedIn post" link in `web/about-project.html` so the loop closes.

---

## 📣 LinkedIn post (steal this, edit to taste)

> I got tired of typing my name, email and phone into the same job-application forms forty times a week — so I built a browser extension that does it in one click. 🔐
>
> **Autofill Vault** stores your details once and fills any form on any site. The catch: it's 100% local. No server, no account, nothing leaves your machine.
>
> The fun part was making it work on React/Vue sites, where setting an input's value doesn't stick — the framework throws it away. The fix was filling forms the way a human does: triggering the real browser events so React believes it. That one trick is the whole project.
>
> Built with Manifest V3 and vanilla JS — no framework, no build step, fully auditable.
>
> 🌐 Demo + write-up: [your-vercel-url]
> 💻 Source: github.com/charanreddy-27/Autofill
>
> #buildinpublic #javascript #webdev #chromeextension #privacy

Tip: attach the 5-second screen recording. Posts with native video out-reach link previews on LinkedIn.

---

## 🛠️ Troubleshooting

| Symptom | Fix |
|---|---|
| **404 on the deployed site** | Root Directory isn't `web`. Vercel → Settings → General → Root Directory → set to `web` → redeploy. |
| **`/about` 404s but `/about.html` works** | `web/vercel.json` wasn't picked up — confirm it's inside `web/` and that Root Directory is `web`. |
| **Social card shows no image** | The URL in the `og:image` tag must be absolute and public. Finish [Step 4](#step-4--point-the-metadata-at-your-real-url), redeploy, then re-scrape in LinkedIn Post Inspector (it caches). |
| **CSS/JS 404** | They're referenced relatively (`styles.css`, `main.js`) — they'll only break if Root Directory is wrong. |
| **The extension stopped loading** | The site doesn't touch the extension. Reload it from `chrome://extensions`; nothing in `web/` affects `manifest.json` or `src/`. |

---

*Questions? The build is documented in [`PROJECT_DEEP_DIVE.md`](PROJECT_DEEP_DIVE.md). — Crafted with intent.*
