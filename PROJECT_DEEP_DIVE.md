# 🔬 Autofill Vault — Project Deep Dive

A tour of how this thing actually works, why it's built the way it is, and where the genuinely hard parts live. If `README.md` is the trailer, this is the director's commentary.

---

## 1. The shape of the problem

Autofilling forms sounds trivial until you try it on the real web. Three things make it hard:

1. **Forms are gloriously inconsistent.** One site's email field is `name="email"`; another's is `data-testid="contact_field_2"` with the word "email" only in a sibling `<label>`. There is no single attribute you can trust.
2. **Modern frameworks own their inputs.** React and Vue keep input values in internal state. Writing `el.value = "…"` updates the pixels but not the state — so the form submits *empty*.
3. **Three execution contexts, one brain.** An extension runs code in the page (content script), in isolated extension pages (dashboard, popup), and in a service worker. They can't share a module graph, but they must agree on the data model.

Everything below is a response to one of those three.

---

## 2. Architecture at a glance

```
        ┌──────────────────────────────────────────────────────────┐
        │                     chrome.storage.local                  │
        │        { "autofill_vault": { categories, accounts… } }    │
        └──────────────▲───────────────▲───────────────▲────────────┘
                       │               │               │
            getVault() │     saveVault │     onChanged │ (live sync)
                       │               │               │
   ┌───────────────────┴──┐  ┌─────────┴────────┐  ┌───┴───────────────┐
   │  dashboard.{html,js}  │  │   popup.{html,js}│  │  content.js        │
   │  manage the vault     │  │  quick fill/copy │  │  the fill engine   │
   └───────────────────────┘  └─────────┬────────┘  └───▲────────────────┘
                                         │  sendMessage  │
                                         └───────────────┘
                                                ▲
                                  ┌─────────────┴─────────────┐
                                  │      background.js (SW)    │
                                  │  shortcut · context menu  │
                                  └───────────────────────────┘

         common.js  ── loaded by ALL of the above (globalThis.Vault) ──
```

**The keystone is `common.js`.** It's a classic (non-module) script that defines exactly one global: `globalThis.Vault`. Because it's classic, the *same file* loads in pages, content scripts and the service worker (`importScripts`) without a bundler. It owns:

- `FIELD_TYPES` — the 22-entry field dictionary (synonyms + autocomplete tokens + input-type hints). This is the engine's vocabulary.
- `defaultVault()` — the seed structure a new user sees.
- `getVault()` / `saveVault()` / `onVaultChanged()` — Promise-wrapped storage with live cross-view sync.
- `normalize()` — the great equalizer (lowercases, strips punctuation/underscores/dashes) so `"First_Name"`, `"first name"` and `"firstName"` all collapse to one comparable string.
- `allFields()` — flattens every field across categories into one list for the engine.

One source of truth, zero duplication, no build step.

---

## 3. Data flow: from keypress to filled form

```
User: Alt+Shift+F
  └─ background.js  chrome.commands.onCommand → sendMessage(tab, FILL_PERSONAL)
       └─ content.js  onMessage(FILL_PERSONAL)
            ├─ Vault.getVault()                    → read vault from storage
            ├─ fillPersonal(vault)                 → the engine (section 4)
            │    ├─ collect fillable elements
            │    ├─ for each: signalsFor(el)       → one normalized string
            │    ├─ score every vault field        → scoreField()
            │    ├─ pick best above threshold (25)
            │    └─ fillInput() + highlight()
            └─ toast("Filled N fields")
```

The popup's **⚡ Fill this page** and the right-click **Autofill this page** funnel into the exact same `FILL_PERSONAL` message — three entry points, one code path.

---

## 4. The matching engine (`content.js` → `scoreField`)

The core idea: **don't trust any single signal — score them and let the best win.**

### 4a. Gather every signal

For each input, `signalsFor(el)` concatenates and normalizes:

`name`, `id`, `placeholder`, `aria-label`, `autocomplete`, `title`, `data-test`, `data-testid`, and the **resolved label text** — which `getLabelText()` digs out of `<label for>`, a wrapping `<label>`, and `aria-labelledby` references.

### 4b. Score each stored field against the input

```
autocomplete token match   → +100   (the gold standard: the site told us the answer)
native input type match    → + 60   (<input type="email"> really is an email)
exact label/synonym match  → + 50   (signals === phrase)
multi-word phrase hit       → + 40   (word-boundary regex, "date of birth")
single-word phrase hit      → + 25   (word-boundary regex, "email")
```

The phrase list per field = its **label** + the user's **custom keywords** + the field type's **synonyms**. Highest score wins; anything below **25** is left alone. That threshold is the difference between "helpful" and "fills your phone number into a search box."

### 4c. Why scoring beats rules

A single rule ("match on `name`") breaks the moment a site renames its fields. A weighted score **degrades gracefully**: lose the `name`, the `autocomplete` token or `type` can still carry it; lose those, the visible label usually saves you. It's the same instinct as an ensemble model — no single weak signal gets to be a single point of failure.

---

## 5. The part that broke everything: filling React/Vue

This is the bug that cost two evenings and taught the most.

**Symptom:** values appeared in the inputs, then vanished on submit. **Cause:** React tracks input state internally; assigning `el.value` never tells React, so on the next render React "corrects" the DOM back to its empty state.

**Fix** (`setNativeValue`): bypass React by calling the **native value setter** defined on the element's prototype (`HTMLInputElement.prototype`'s `value` descriptor), *then* dispatch genuine bubbling `input` and `change` events. React's synthetic event system listens for those and updates its state — exactly as if a human typed.

```js
function setNativeValue(el, value) {
  const proto   = Object.getPrototypeOf(el);
  const desc    = Object.getOwnPropertyDescriptor(proto, "value");
  const ownDesc = Object.getOwnPropertyDescriptor(el, "value");
  // Use the prototype setter unless React shadowed it on the instance.
  if (desc && desc.set && (!ownDesc || desc.set !== ownDesc.set)) desc.set.call(el, value);
  else el.value = value;
}
```

`<select>` elements get their own path (`fillSelect`): match an option by `value` or visible text, exact first, then a contains-fallback — because dropdowns label their options for humans, not machines.

---

## 6. Logins: finding the username on a lonely page

Multi-step login flows show the username on screen 1 and the password on screen 2. `fillAccount()` handles both:

- **Password present:** take the first password field, then choose the text/email/tel input that appears **closest before it in document order** (`compareDocumentPosition`). That's almost always the username.
- **No password (step 1):** fall back to the first input whose normalized signals match `/user|email|login/`.

Simple heuristics, but they cover the messy real-world cases that trip up naïve "fill the first text box" approaches.

---

## 7. Key decisions & tradeoffs

| Decision | Why | Tradeoff accepted |
|---|---|---|
| **Local-only, no backend** | Privacy is the product. Nowhere to leak data, nothing to breach. | No cross-device sync (JSON export/import instead). |
| **No framework / no build** | Auditable, instant reload, zero supply-chain surface. | More manual DOM code; discipline instead of guardrails. |
| **Scoring over rules** | Robust to inconsistent markup. | Needs a tuned threshold; occasional misses on hostile forms. |
| **Plain-text storage** | The user explicitly wanted simplicity. | Not safe for high-value secrets — documented loudly. |
| **Classic script `common.js`** | One data model across all 3 contexts, no bundler. | Global namespace (`Vault`) instead of ES modules. |

---

## 8. Folder structure

```
manifest.json            MV3 manifest — permissions, content scripts, commands
icons/                   16 / 32 / 48 / 128 toolbar icons
src/
  common.js              ⭐ shared brain: data model, field dictionary, storage
  content.js             ⭐ the fill engine — signals, scoring, native-value fill
  content.css            fill highlight + injected toast
  background.js          service worker: keyboard shortcut + context menu
  dashboard.html/css/js  the vault manager (categories, fields, accounts, backup)
  popup.html/css/js      toolbar popup: fill, search-and-copy, per-site accounts
test/sample-form.html    a practice form for testing autofill
web/                     the showcase site (static, deploys to Vercel)
  index.html             landing page
  about.html             /about — about me
  about-project.html     /about-project — the story
  styles.css · main.js   shared design system + interactions
  assets/                favicon source, og.png, icons
```

---

## 9. What I'd build next

The roadmap (see `IDEAS.md`) is sorted by effort-vs-payoff. The three I'd ship first:

1. **Command-palette quick-copy** — one keystroke on any page to copy a single detail.
2. **Snippets** — reusable long-text blocks (cover letters, "why this role?").
3. **Save-field-from-page** — right-click any input you filled by hand → add it to the vault, so the vault grows itself as you browse.

Plus the bigger swings: **multiple profiles** (work vs personal), **per-site learned corrections**, and **encrypted backup**.

---

*Built by [Charan Reddy Chanda](https://www.charanreddy.dev). Questions, critiques, better ideas — [let's talk](https://cal.com/charanreddy-27/30min).*
