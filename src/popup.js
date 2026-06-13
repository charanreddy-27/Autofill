/* popup.js — quick actions from the toolbar. */
(function () {
  "use strict";
  const V = window.Vault;
  const $ = (s) => document.querySelector(s);

  let vault = null;
  let tab = null;

  function hostOf(u) {
    try { return new URL(/^https?:\/\//.test(u) ? u : "https://" + u).hostname.replace(/^www\./, ""); }
    catch (e) { return ""; }
  }
  function siteMatches(accUrl, host) {
    const a = hostOf(accUrl);
    if (!a || !host) return false;
    return host === a || host.endsWith("." + a) || a.endsWith("." + host);
  }

  // Send a message to the page; if the content script isn't there yet, inject it.
  function sendToTab(message) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, message, (resp) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript(
            { target: { tabId: tab.id, allFrames: true }, files: ["src/common.js", "src/content.js"] },
            () => {
              if (chrome.runtime.lastError) { resolve(null); return; }
              chrome.tabs.sendMessage(tab.id, message, (r2) => resolve(chrome.runtime.lastError ? null : r2));
            }
          );
        } else resolve(resp);
      });
    });
  }

  // ----- fill this page
  $("#fill-page").addEventListener("click", async () => {
    const btn = $("#fill-page");
    const resp = await sendToTab({ type: "FILL_PERSONAL" });
    if (resp == null) { btn.textContent = "⚠️ Can’t autofill on this page"; setTimeout(() => (btn.textContent = "⚡ Fill this page"), 1600); return; }
    btn.textContent = resp.count ? `✓ Filled ${resp.count} field${resp.count === 1 ? "" : "s"}` : "No matching fields found";
    setTimeout(() => (btn.textContent = "⚡ Fill this page"), 1600);
  });

  // ----- open dashboard
  function openDash() { chrome.runtime.openOptionsPage(); window.close(); }
  $("#open-dash").addEventListener("click", openDash);
  $("#open-dash-2").addEventListener("click", openDash);

  // ----- accounts for this site
  function renderAccounts(host) {
    const matching = vault.accounts.filter((a) => siteMatches(a.url, host));
    if (!matching.length) return;
    $("#accounts-section").classList.remove("hidden");
    $("#accounts-list").innerHTML = matching.map((a, i) => `
      <div class="acc-item">
        <div class="acc-fav">${(a.label || "?").charAt(0).toUpperCase()}</div>
        <div class="acc-meta"><div class="nm">${esc(a.label)}</div><div class="un">${esc(a.username || "")}</div></div>
        <button class="acc-fill" data-i="${i}">Fill</button>
      </div>`).join("");
    $("#accounts-list").addEventListener("click", async (e) => {
      const b = e.target.closest(".acc-fill"); if (!b) return;
      const acc = matching[+b.dataset.i];
      b.textContent = "…";
      const resp = await sendToTab({ type: "FILL_ACCOUNT", account: acc });
      b.textContent = resp && resp.count ? "✓" : "—";
      setTimeout(() => (b.textContent = "Fill"), 1400);
    });
  }

  // ----- quick search & copy
  function renderResults(term) {
    const all = V.allFields(vault).filter((f) => f.value && f.value.trim());
    const t = term.toLowerCase();
    const list = (t ? all.filter((f) => (f.label + " " + f.value + " " + f.categoryName).toLowerCase().includes(t)) : all).slice(0, 40);
    if (!list.length) { $("#results").innerHTML = `<div class="p-hint">${all.length ? "No matches." : "Add details in the dashboard to copy them here."}</div>`; return; }
    $("#results").innerHTML = list.map((f, i) => `
      <div class="res-item">
        <div class="res-meta"><div class="lbl">${esc(f.categoryIcon || "")} ${esc(f.categoryName)} · ${esc(f.label)}</div><div class="val">${esc(f.value)}</div></div>
        <button class="res-copy" data-v="${esc(f.value)}" title="Copy">📋</button>
      </div>`).join("");
  }
  $("#results").addEventListener("click", (e) => {
    const b = e.target.closest(".res-copy"); if (!b) return;
    navigator.clipboard.writeText(b.dataset.v).then(() => {
      b.classList.add("copied"); b.textContent = "✓";
      setTimeout(() => { b.classList.remove("copied"); b.textContent = "📋"; }, 1100);
    });
  });
  $("#p-search").addEventListener("input", (e) => renderResults(e.target.value.trim()));

  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  // ----- boot
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    tab = tabs[0];
    const host = tab ? hostOf(tab.url || "") : "";
    V.getVault().then((data) => {
      vault = data;
      document.documentElement.setAttribute("data-theme", (vault.settings && vault.settings.theme) || "light");
      if (host) $("#site-label").textContent = host;
      renderAccounts(host);
      renderResults("");
    });
  });
})();
