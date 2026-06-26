# 🎤 Autofill Vault — Interview Prep

Rehearse-from-this notes for talking about this project. Read it out loud once or twice and the words will be there when you need them.

---

## ⏱️ The 30-second elevator pitch

> "Autofill Vault is a browser extension I built to stop retyping the same details into every form — job applications, checkouts, logins. You store your info once, and it fills any form on any site in one click. The catch is it's completely local — no server, no account, nothing leaves your machine. The fun engineering problem was making it work on React and Vue sites, where you can't just set the input's value; the framework throws it away. I had to fill forms the way a human does, by triggering the real browser events."

Memorize the **shape** (what → constraint → hard part), not the words.

---

## 🎬 The 2-minute walkthrough

**1. The why (15s).** "I was deep in a stretch of job applications, filling the same six fields forty times a week. Browser autofill is a black box and password managers only solve logins. I wanted a vault I controlled that filled *everything*, and that never touched a network."

**2. The shape (20s).** "It's a Manifest V3 extension, plain JavaScript, no build step. There's a dashboard where you organize your details into categories, a toolbar popup for quick fills, and a content script — that's the engine — injected into every page. All the data lives in `chrome.storage.local`, so it's per-browser, on-device, period."

**3. The engine (35s).** "When you hit fill, the content script looks at every input on the page and gathers every signal it can — the name, id, placeholder, aria-label, the linked `<label>`, even `data-testid` — and normalizes that into one string. Then it scores each of your stored fields against it: an `autocomplete` token match is worth 100 points, a native `type=email` is 60, an exact label match 50, and so on. The highest score above a threshold wins. So it's not trusting any one attribute — it's an ensemble, which is what makes it robust to how inconsistent real forms are."

**4. The hard part (35s).** "The bug that taught me the most: on a React job board, every value I filled vanished on submit. Setting `el.value` updates the DOM but not React's internal state, so React just resets it. The fix is to call the *native* value setter on the element's prototype — bypassing React's override — and then dispatch real, bubbling `input` and `change` events. React's event system picks those up and updates its state as if you'd typed. That one function is the reason the whole thing works on modern sites."

**5. The close (15s).** "It's open source, it's live with a showcase site I deployed on Vercel, and I use it every day. The next thing I'd add is a command-palette quick-copy, so you can grab a single field on any page with one keystroke."

---

## ⭐ STAR stories

### STAR 1 — "The values kept disappearing" (the React fill)

- **Situation:** The autofill engine worked perfectly on plain HTML forms, but on a React-based job application the filled values vanished the moment the form was submitted.
- **Task:** Figure out why a value that was visibly *in* the input was being ignored, and make filling work reliably on framework-driven sites.
- **Action:** I traced it to React's controlled-input model — it keeps state internally and overwrites direct `value` assignments on re-render. I dug into how React tracks values and found it shadows the input's `value` setter. So I called the original setter from `HTMLInputElement.prototype` directly, then dispatched bubbling `input`/`change` events to trigger React's own update path — simulating a real keystroke rather than fighting it.
- **Result:** Filling became reliable across React and Vue sites with a ~15-line function. More importantly, I came away genuinely understanding the controlled-component model instead of cargo-culting it.

### STAR 2 — "Match, don't guess" (the scoring engine)

- **Situation:** My first matcher keyed off the input's `name` attribute. It worked on tidy forms and failed on real ones, where fields are named `field_2` or labelled only by a sibling element.
- **Task:** Make field detection robust to wildly inconsistent markup without hand-coding rules per site.
- **Action:** I replaced the single rule with a weighted scoring function that combines several independent signals — autocomplete token (100), native input type (60), exact/partial label and synonym matches (25–50) — each backed by a normalization step so casing and punctuation don't matter. A minimum threshold prevents low-confidence fills.
- **Result:** Detection degrades gracefully — losing one signal doesn't break the match — and the threshold means it stays quiet rather than filling the wrong field. It's the same instinct as an ensemble model: no single weak signal becomes a single point of failure.

### STAR 3 — "One brain, three contexts" (the architecture)

- **Situation:** An extension runs code in the page, in isolated extension pages, and in a service worker — none of which share a module graph — yet they all need the same data model and field dictionary.
- **Task:** Avoid three diverging copies of the core logic without adding a bundler to a deliberately build-free project.
- **Action:** I put the data model, field dictionary, normalization and Promise-wrapped storage helpers in a single classic script, `common.js`, exposing one global (`globalThis.Vault`). It's loaded by the dashboard, popup and content script via `<script>` and by the service worker via `importScripts` — the same file everywhere.
- **Result:** One source of truth, live storage sync across every open view, and zero build tooling. Changing a field type is a one-line edit in one place.

---

## 💻 Likely technical Q&A

**Q: Why no framework or build step?**
A: It's a privacy tool — being trivially auditable matters. No bundle to read, no dependency supply chain, and `Reload` is the entire dev loop. For a project this size, the platform was enough; the discipline cost was worth the transparency.

**Q: How do you handle Single Page Apps where fields appear after load?**
A: The fill is triggered on demand (button / shortcut / right-click), not on page load, so by the time you ask, the fields exist. It also skips invisible elements and ones you've already filled. A future improvement is a `MutationObserver` for "fill as it appears" flows.

**Q: Isn't storing passwords in plain text a problem?**
A: Yes, and I document it loudly. It was an explicit simplicity tradeoff — it's `chrome.storage.local`, readable only by this extension on this profile, never synced. I'm clear that it's a convenience tool, not a replacement for a real password manager on high-value accounts. Encrypted backup is on the roadmap.

**Q: How do you avoid overwriting what the user already typed?**
A: Before filling, each input is checked — if it already has a non-empty value (and isn't a `<select>`), it's skipped. Restraint turned out to matter more to how it *feels* than matching cleverness.

**Q: How does the `<select>` matching work?**
A: Separate path. I match an option by its `value` or its visible text — exact match first, then a contains-fallback — because dropdown options are labelled for humans, so the visible text is often the only reliable key.

**Q: What's the security model / attack surface?**
A: The content script runs on `<all_urls>`, which is the permission cost of "works everywhere." It makes no network calls and reads only from local storage. The honest risks are the broad host permission and plain-text local storage — both documented. No remote code, no eval, no third-party scripts.

**Q: How would you scale this to a published Chrome Web Store extension?**
A: Tighten permissions where possible, add encrypted backup, add a `MutationObserver` mode, and a per-site correction memory so it learns from fixes. Then a proper test matrix across the big ATS platforms (Workday, Greenhouse, Lever).

**Q: How is it tested?**
A: Manually against a bundled `sample-form.html` and real sites today. The scoring function is pure and side-effect-free, so the natural next step is unit tests feeding it synthetic field signals and asserting the winning match.

---

## 🌱 What I'd improve next

- **Command-palette quick-copy** — one keystroke to copy a single detail on any page (my highest-payoff idea).
- **`MutationObserver` fill** for forms that render fields lazily.
- **Per-site learned corrections** — fix a mis-fill once, remember it for that domain.
- **Multiple profiles** (work vs personal) and **encrypted backup**.
- **Unit tests** around `scoreField` now that it's cleanly separable.

Naming these unprompted shows you can see past your own code — interviewers notice.

---

## 🙋 Smart questions to ask the interviewer

- "Where does this team draw the line between shipping fast and building the robust version — and who makes that call?"
- "What's a piece of internal tooling here that everyone relies on but nobody owns?"
- "When something breaks in production, what does the first hour look like?"
- "What does the path from 'works on my machine' to 'shipped' actually involve here — review, testing, deploy?"
- "What would you want the person in this role to have meaningfully improved six months in?"

---

*Tip: the strongest signal in all of this is the React-fill story. Lead with the problem ("values kept disappearing"), not the solution — let them feel the bug before you resolve it.*
