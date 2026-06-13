# 🔐 Autofill Vault

A personal browser extension to **store all your details once** — name, email, address,
education, accounts — and **copy or autofill them anywhere** with one click.

No server, no sign-up, no cloud. Everything stays in your browser's local storage on this
computer.

---

## ✨ What it does

- **Dashboard** (full page) — your vault, organised into categories (Personal, Address,
  Education, Professional, plus any you add).
  - Every field has a **📋 copy** button.
  - **➕ Field** adds a new value to a category; **➕ Add category** makes a new group.
  - Rename categories, change their icon, drag-free inline editing — just type, it autosaves.
- **Accounts** tab — store **website / username / password** with show-hide and copy.
- **Popup** (toolbar icon) — **⚡ Fill this page**, see accounts saved for the current site,
  and a quick search-and-copy box.
- **Autofill engine** — detects form fields on any website and fills them from your vault by
  matching field names, labels and `autocomplete` hints. Works on React/Vue sites too.
- **Backup** — export/import your whole vault as a JSON file (in the ⚙️ menu).
- Light / dark theme.

### Ways to trigger autofill
| Action | How |
|---|---|
| Fill the whole page | Popup → **⚡ Fill this page**, or press **Alt+Shift+F** |
| Fill a login | Popup → **Fill** next to the matching account |
| Right-click | **Autofill this page** |
| Open the popup | **Alt+Shift+V** |

---

## 🚀 Install (load unpacked)

Works in **Chrome**, **Edge**, Brave, and any Chromium browser.

1. Open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `Autofill` folder.
4. Pin the extension. Click its icon → **⚙️** to open the dashboard and fill in your details.

> To test autofill on the included `test/sample-form.html` (a `file://` page), open the
> extension's **Details** and enable **Allow access to file URLs**. On normal websites this
> isn't needed.

---

## 🧪 Try it

1. Open the dashboard, type your real values into **Personal** and **Address**.
2. Open `test/sample-form.html` in the browser (or any job-application form).
3. Click the toolbar icon → **⚡ Fill this page**. Filled fields flash blue.

---

## 🔒 A note on privacy & security

You asked to keep this simple, so by design:

- Data is stored **unencrypted** in `chrome.storage.local`, readable only by this extension
  on this browser profile. It is **not** synced or uploaded anywhere.
- **Passwords are stored in plain text.** This is fine for convenience, but it is *not* a
  substitute for a dedicated password manager for high-value accounts (bank, primary email).
- Anyone with access to your unlocked computer / browser profile can read the vault.
- Use **⚙️ → Export backup** regularly so you don't lose your data.

---

## 📁 Structure

```
manifest.json          Extension manifest (MV3)
icons/                 Toolbar icons (16/32/48/128)
src/
  common.js            Data model, field-type dictionary, storage helpers (shared)
  content.js           Autofill engine injected into pages
  content.css          Fill highlight + on-page toast
  background.js        Service worker: shortcut, right-click menu
  dashboard.html/css/js  The vault management UI
  popup.html/css/js      Toolbar popup
test/
  sample-form.html     A practice form to test autofill
```

No build step — it's plain HTML/CSS/JS. Edit a file, then hit **Reload** on the extension.
