/*
 * content.js — runs on every page. Detects form fields and fills them from the
 * vault. Triggered by the popup, the right-click menu or the keyboard shortcut.
 */
(function () {
  "use strict";

  const V = window.Vault;
  const FILLABLE = "input, select, textarea";

  // ---------------------------------------------------------------------------
  // Signal gathering
  // ---------------------------------------------------------------------------
  function getLabelText(el) {
    let txt = "";
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) txt += " " + lbl.textContent;
    }
    const wrap = el.closest("label");
    if (wrap) txt += " " + wrap.textContent;
    if (el.getAttribute("aria-labelledby")) {
      el.getAttribute("aria-labelledby").split(/\s+/).forEach((id) => {
        const n = document.getElementById(id);
        if (n) txt += " " + n.textContent;
      });
    }
    return txt;
  }

  function signalsFor(el) {
    const parts = [
      el.name, el.id, el.placeholder, el.getAttribute("aria-label"),
      el.getAttribute("autocomplete"), el.getAttribute("title"),
      el.getAttribute("data-test"), el.getAttribute("data-testid"),
      getLabelText(el)
    ];
    return V.normalize(parts.filter(Boolean).join(" "));
  }

  function isFillable(el) {
    if (!el || el.disabled || el.readOnly) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "input") {
      const t = (el.type || "text").toLowerCase();
      if (["hidden", "submit", "button", "reset", "image", "file", "range", "color", "checkbox", "radio"].includes(t)) return false;
    }
    // skip invisible elements
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Scoring: how well does a stored field match a form input?
  // ---------------------------------------------------------------------------
  function scoreField(field, el, signals) {
    const typeDef = V.FIELD_TYPE_MAP[field.type] || V.FIELD_TYPE_MAP.custom;
    const inputType = (el.type || "").toLowerCase();
    const ac = V.normalize(el.getAttribute("autocomplete") || "");
    let score = 0;

    // Strong: autocomplete token match
    if (typeDef.autocomplete && typeDef.autocomplete.length) {
      for (const token of typeDef.autocomplete) {
        if (ac && (ac === V.normalize(token) || ac.endsWith(" " + V.normalize(token)))) { score += 100; break; }
      }
    }

    // Strong: native input type (email/tel)
    if (typeDef.inputType && inputType === typeDef.inputType) score += 60;

    // Build the list of phrases to look for: the label, custom keywords, synonyms.
    const phrases = [];
    if (field.label) phrases.push(V.normalize(field.label));
    if (field.keywords) field.keywords.split(",").forEach((k) => { const n = V.normalize(k); if (n) phrases.push(n); });
    (typeDef.synonyms || []).forEach((s) => phrases.push(V.normalize(s)));

    let phraseHit = 0;
    for (const p of phrases) {
      if (!p) continue;
      if (signals === p) { phraseHit = Math.max(phraseHit, 50); }
      else if (new RegExp("\\b" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(signals)) {
        phraseHit = Math.max(phraseHit, p.includes(" ") ? 40 : 25);
      }
    }
    score += phraseHit;

    // Penalise email-ish content going into a non-email free input only slightly: skip.
    return score;
  }

  // ---------------------------------------------------------------------------
  // Setting values in a framework-friendly way (React/Vue track their own state)
  // ---------------------------------------------------------------------------
  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    const ownDesc = Object.getOwnPropertyDescriptor(el, "value");
    try {
      if (desc && desc.set && (!ownDesc || desc.set !== ownDesc.set)) desc.set.call(el, value);
      else el.value = value;
    } catch (e) { el.value = value; }
  }

  function fireEvents(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function fillSelect(el, value) {
    const target = V.normalize(value);
    let chosen = null;
    for (const opt of el.options) {
      if (V.normalize(opt.value) === target || V.normalize(opt.textContent) === target) { chosen = opt; break; }
    }
    if (!chosen) {
      for (const opt of el.options) {
        if (V.normalize(opt.textContent).includes(target) && target) { chosen = opt; break; }
      }
    }
    if (chosen) { el.value = chosen.value; fireEvents(el); return true; }
    return false;
  }

  function fillInput(el, value) {
    if (el.tagName.toLowerCase() === "select") return fillSelect(el, value);
    setNativeValue(el, value);
    fireEvents(el);
    return true;
  }

  function highlight(el) {
    el.classList.add("afv-filled-highlight");
    setTimeout(() => el.classList.remove("afv-filled-highlight"), 1600);
  }

  // ---------------------------------------------------------------------------
  // Fill all personal/profile fields
  // ---------------------------------------------------------------------------
  function fillPersonal(vault) {
    const fields = V.allFields(vault).filter((f) => f.value && f.value.toString().trim() && f.type !== "username");
    const elements = Array.from(document.querySelectorAll(FILLABLE)).filter(isFillable);
    let count = 0;

    for (const el of elements) {
      // don't clobber fields the user already filled
      if (el.value && el.value.trim() && el.tagName.toLowerCase() !== "select") continue;

      const signals = signalsFor(el);
      if (!signals) continue;

      let best = null, bestScore = 0;
      for (const f of fields) {
        const s = scoreField(f, el, signals);
        if (s > bestScore) { bestScore = s; best = f; }
      }
      if (best && bestScore >= 25) {
        if (fillInput(el, best.value)) { highlight(el); count++; }
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Fill a saved account (username + password) into a login form
  // ---------------------------------------------------------------------------
  function fillAccount(account) {
    const all = Array.from(document.querySelectorAll(FILLABLE)).filter(isFillable);
    const passwords = all.filter((el) => (el.type || "").toLowerCase() === "password");
    let count = 0;

    // username: prefer an email/text input near (before) the password field
    let userEl = null;
    if (passwords.length) {
      const pw = passwords[0];
      const candidates = all.filter((el) => el !== pw && ["text", "email", "tel"].includes((el.type || "text").toLowerCase()));
      // pick the closest one that appears before the password in document order
      const ordered = candidates.filter((el) => (el.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING));
      userEl = ordered.length ? ordered[ordered.length - 1] : candidates[0];
    } else {
      // no password on page (e.g. multi-step) — match a username/email looking field
      userEl = all.find((el) => /user|email|login/.test(signalsFor(el)));
    }

    if (userEl && account.username) { fillInput(userEl, account.username); highlight(userEl); count++; }
    passwords.forEach((pw) => { if (account.password) { fillInput(pw, account.password); highlight(pw); count++; } });
    return count;
  }

  // ---------------------------------------------------------------------------
  // Tiny toast
  // ---------------------------------------------------------------------------
  function toast(message, kind) {
    if (window.top !== window) return; // only in the top frame
    let host = document.getElementById("afv-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "afv-toast-host";
      document.documentElement.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "afv-toast " + (kind || "");
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 2400);
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;

    if (msg.type === "PING") { sendResponse({ ok: true }); return; }

    if (msg.type === "FILL_PERSONAL") {
      V.getVault().then((vault) => {
        const count = fillPersonal(vault);
        if (vault.settings?.autofillToast !== false) {
          toast(count ? `Filled ${count} field${count === 1 ? "" : "s"}` : "No matching fields found", count ? "ok" : "warn");
        }
        sendResponse({ count });
      });
      return true; // async
    }

    if (msg.type === "FILL_ACCOUNT") {
      const count = fillAccount(msg.account || {});
      toast(count ? `Filled login for ${msg.account?.label || "account"}` : "No login fields found", count ? "ok" : "warn");
      sendResponse({ count });
      return true;
    }
  });
})();
