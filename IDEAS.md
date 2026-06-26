# 💡 Ideas to make Autofill Vault more productive

Lightweight features that would save you the most time — sorted by **effort vs. payoff**.
Everything here stays local, no servers. ⭐ = my top picks for *your* use case (job apps, repetitive forms).

---

## ⚡ Quick wins (small, high impact)

### ⭐ 1. Command palette / quick-copy overlay
Press a shortcut on **any page** (e.g. `Alt+Shift+C`) → a tiny search box pops up → type
`email`, hit **Enter**, value is on your clipboard. Never open the popup again.
- *Why:* copying a single detail is your most frequent action; this makes it one keystroke.
- *Effort:* small (reuse the search + content-script toast you already have).

### ⭐ 2. Cover-letter / long-text snippets
A "Snippets" tab for reusable blocks: cover letter, short bio, "Why do you want this role?",
referral message. Copy with one click; optionally fill `<textarea>`s.
- *Why:* job applications ask the same essay questions constantly.
- *Effort:* small (it's a category whose fields are multi-line).

### 3. Pin / favourite fields ⭐ to the top of the popup
Star your most-used fields so they sit at the top of the popup for instant copy.
- *Effort:* small (add a `pinned` flag + sort).

### 4. Mask sensitive values in the dashboard
A 👁️ blur toggle for fields like ID numbers, so they're hidden until clicked — safe for
screen-sharing.
- *Effort:* small.

### 5. Drag-to-reorder accounts
Same grip handle you have on fields, applied to account cards.
- *Effort:* small (reuse the existing drag engine).

### 6. Duplicate a field / category
"Make a copy" for near-identical entries (e.g. two addresses).
- *Effort:* tiny.

---

## 🧩 Medium (a bit more work, big convenience)

### ⭐ 7. Multiple profiles / personas
Switch between **Personal** and **Work** sets (different email, address, phone) with one
dropdown. Autofill uses the active profile.
- *Why:* job apps sometimes need work vs. personal details; saves duplicate categories.

### ⭐ 8. "Save this field from the page"
Right-click any input you filled manually → **Save to Vault** → pick a category. Capture
details as you encounter them instead of typing them into the dashboard first.
- *Why:* turns the vault into something that *grows itself* while you browse.

### 9. Per-site memory (learns corrections)
If autofill picks the wrong field on a site, you fix it once and it remembers the mapping for
that domain next time.
- *Why:* makes autofill near-perfect on the sites you reuse (LinkedIn, Workday, Greenhouse…).

### 10. Password generator
A "Generate" button on account passwords (length + symbols). Strong passwords without leaving
the extension.
- *Effort:* small-medium.

### 11. Completeness meter + "missing fields" nudge
"Personal 80% complete" with a gentle list of empty fields, so your profile is always
ready before you hit a form.

### 12. Copy-format variants
Quick transforms on copy: phone with/without `+country`, name as `Last, First`, date in
`DD/MM/YYYY` vs `YYYY-MM-DD`.

---

## 🚀 Bigger (worth it if you live in forms)

### 13. Bulk import (CSV / vCard / browser autofill)
Onboard all your existing data at once instead of typing it in.

### 14. Auto-save new logins
When you submit a login that isn't saved, a small bar offers **Save to Vault** (like a
password manager, but minimal).

### 15. Optional quick-lock (PIN)
A simple 4-digit lock for the dashboard/popup. Off by default (you didn't want heavy
security), but handy on shared machines.

### 16. Encrypted backup
Export that's password-protected, so your backup file is safe to store in cloud drive.

---

## 🎨 Polish / nice-to-have
- Follow **system theme** automatically (auto light/dark).
- **Backup reminder** every N days (with one-click export).
- **Recently copied** strip in the popup.
- **Keyboard navigation** in the popup (↑/↓ + Enter to copy).
- Subtle **confetti / check animation** when a page is fully filled. 🎉

---

## My recommendation — what to build next
If it were me, I'd do these three first, in order:
1. **Command palette quick-copy** (#1) — biggest daily time-saver.
2. **Snippets** (#2) — kills the repetitive essay/cover-letter typing.
3. **Save field from page** (#8) — makes the vault grow effortlessly.

Tell me which ones you want and I'll build them. Most of the "quick wins" I can add in one go.
