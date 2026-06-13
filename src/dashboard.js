/* dashboard.js — the vault management UI. */
(function () {
  "use strict";
  const V = window.Vault;

  let vault = null;
  let view = "profile";
  let search = "";
  let saveTimer = null;

  const $ = (sel) => document.querySelector(sel);
  const content = $("#content");

  function esc(s) {
    return (s == null ? "" : String(s)).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function hexToRgba(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#6366f1");
    if (!m) return `rgba(99,102,241,${a})`;
    return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => V.saveVault(vault), 250); }
  function saveNow() { clearTimeout(saveTimer); return V.saveVault(vault); }

  function matches(text) { return !search || (text || "").toLowerCase().includes(search); }

  // ----------------------------------------------------------------- render
  function render() {
    if (view === "profile") renderProfile();
    else renderAccounts();
    $("#primary-add").textContent = view === "profile" ? "＋ Add category" : "＋ Add account";
    updateStats();
  }

  function updateStats() {
    const el = $("#vault-stats");
    if (!el) return;
    const fields = V.allFields(vault).filter((f) => f.value && f.value.toString().trim()).length;
    const accs = vault.accounts.length;
    el.textContent = `✨ ${fields} detail${fields === 1 ? "" : "s"} · ${vault.categories.length} categor${vault.categories.length === 1 ? "y" : "ies"} · ${accs} account${accs === 1 ? "" : "s"}`;
  }

  function setGreeting() {
    const el = $("#greeting");
    if (!el) return;
    const h = new Date().getHours();
    const g = h < 5 ? "Working late 🌙" : h < 12 ? "Good morning ☀️" : h < 17 ? "Good afternoon 👋" : h < 21 ? "Good evening 🌆" : "Good night 🌙";
    el.textContent = g + " — everything's ready";
  }

  function typeOptions(selected) {
    return V.FIELD_TYPES.map((t) =>
      `<option value="${t.value}" ${t.value === selected ? "selected" : ""}>${esc(t.label)}</option>`).join("");
  }

  function renderProfile() {
    const cats = vault.categories.map((cat) => {
      const visibleFields = cat.fields.filter((f) =>
        matches(f.label) || matches(f.value) || matches(cat.name) || matches(f.keywords));
      if (search && visibleFields.length === 0 && !matches(cat.name)) return "";
      const fieldsToShow = search && !matches(cat.name) ? visibleFields : cat.fields;

      const draggable = !search; // reordering disabled while filtering
      const rows = fieldsToShow.map((f) => `
        <div class="field-row" data-cat="${cat.id}" data-field="${f.id}">
          <span class="drag-handle" data-drag="field" title="Drag to reorder">⠿</span>
          <input class="field-label" data-prop="label" value="${esc(f.label)}" placeholder="Label" />
          <input class="field-value" data-prop="value" value="${esc(f.value)}" placeholder="Empty — type a value or autofill it" />
          <div class="field-actions">
            <select class="type-select" data-prop="type" title="Field type (used for autofill matching)">${typeOptions(f.type)}</select>
            <button class="mini-btn copy" data-act="copy" title="Copy">📋</button>
            <button class="mini-btn del" data-act="del-field" title="Delete field">🗑️</button>
          </div>
        </div>`).join("");

      return `
        <section class="card${draggable ? "" : " no-drag"}" data-cat="${cat.id}">
          <div class="card-head">
            <span class="drag-handle cat-handle" data-drag="cat" title="Drag to reorder category">⠿</span>
            <div class="cat-icon" data-act="edit-cat" style="background:${hexToRgba(cat.color, 0.16)}" title="Change icon & colour">${esc(cat.icon)}</div>
            <input class="cat-name" data-prop="cat-name" value="${esc(cat.name)}" />
            <span class="cat-count">${cat.fields.length} field${cat.fields.length === 1 ? "" : "s"}</span>
            <div class="card-head-actions">
              <button class="btn-soft" data-act="add-field">＋ Field</button>
              <button class="btn-soft danger" data-act="del-cat" title="Delete category">🗑️</button>
            </div>
          </div>
          <div class="fields" data-cat="${cat.id}">
            ${rows || `<div class="empty" style="padding:20px">No fields yet — add one below.</div>`}
            <div class="quick-add">
              <input class="quick-add-input" data-cat="${cat.id}" placeholder="＋ Add a field — type a name and press Enter" />
            </div>
          </div>
        </section>`;
    }).join("");

    content.innerHTML = cats.trim()
      ? cats
      : emptyState("🔍", "Nothing found", "Try a different search term.");
  }

  function renderAccounts() {
    const list = vault.accounts.filter((a) =>
      matches(a.label) || matches(a.url) || matches(a.username));

    if (vault.accounts.length === 0) {
      content.innerHTML = emptyState("🔑", "No accounts yet",
        "Save the websites you log into — URL, username and password — and fill them in one click.",
        `<button class="btn-primary" data-act="add-account">＋ Add your first account</button>`);
      return;
    }

    const cards = list.map((a) => `
      <div class="account-card" data-acc="${a.id}">
        <div class="account-top">
          <div class="account-fav">${esc((a.label || "?").trim().charAt(0).toUpperCase() || "?")}</div>
          <input class="account-name" data-prop="label" value="${esc(a.label)}" placeholder="Account name" />
          <button class="mini-btn del" data-act="del-acc" title="Delete account">🗑️</button>
        </div>
        ${accField(a, "url", "Website", "https://…")}
        ${accField(a, "username", "Username / Email", "you@example.com")}
        ${accPassword(a)}
        <div class="account-foot">
          <a class="btn-soft" data-act="open-site" href="${esc(normalizeUrl(a.url))}" target="_blank" rel="noopener">↗ Open site</a>
        </div>
      </div>`).join("");

    content.innerHTML = `<div class="accounts-grid">${cards}
      <button class="account-card" data-act="add-account" style="border-style:dashed;cursor:pointer;align-items:center;justify-content:center;color:var(--text-soft);font-weight:700;min-height:160px;">＋ Add account</button>
    </div>`;
  }

  function accField(a, prop, label, ph) {
    return `
      <div class="acc-field">
        <label>${label}</label>
        <div class="acc-input-row">
          <input class="acc-input" data-prop="${prop}" value="${esc(a[prop] || "")}" placeholder="${ph}" />
          <button class="mini-btn copy" data-act="copy" title="Copy">📋</button>
        </div>
      </div>`;
  }
  function accPassword(a) {
    return `
      <div class="acc-field">
        <label>Password</label>
        <div class="acc-input-row">
          <input class="acc-input" data-prop="password" type="password" value="${esc(a.password || "")}" placeholder="••••••••" />
          <button class="mini-btn" data-act="reveal" title="Show / hide">👁️</button>
          <button class="mini-btn copy" data-act="copy" title="Copy">📋</button>
        </div>
      </div>`;
  }

  function emptyState(icon, title, sub, extra) {
    return `<div class="empty"><div class="big">${icon}</div><h3>${esc(title)}</h3><p>${esc(sub)}</p>${extra || ""}</div>`;
  }

  function normalizeUrl(u) {
    if (!u) return "#";
    return /^https?:\/\//i.test(u) ? u : "https://" + u;
  }

  // ----------------------------------------------------------------- find model
  function findCat(id) { return vault.categories.find((c) => c.id === id); }
  function findField(catId, fid) { const c = findCat(catId); return c && c.fields.find((f) => f.id === fid); }
  function findAcc(id) { return vault.accounts.find((a) => a.id === id); }

  // ----------------------------------------------------------------- events
  content.addEventListener("input", (e) => {
    const el = e.target;
    const prop = el.dataset.prop;
    if (!prop) return;
    const catEl = el.closest("[data-cat]");
    const accEl = el.closest("[data-acc]");

    if (prop === "cat-name" && catEl) { const c = findCat(catEl.dataset.cat); if (c) c.name = el.value; scheduleSave(); return; }
    if (catEl && el.closest("[data-field]")) {
      const f = findField(catEl.dataset.cat, el.closest("[data-field]").dataset.field);
      if (f) { f[prop] = el.value; scheduleSave(); }
      return;
    }
    if (accEl) { const a = findAcc(accEl.dataset.acc); if (a) { a[prop] = el.value; scheduleSave(); } }
  });

  content.addEventListener("change", (e) => {
    if (e.target.dataset.prop === "type") {
      const row = e.target.closest("[data-field]");
      const f = findField(row.closest("[data-cat]").dataset.cat, row.dataset.field);
      if (f) { f.type = e.target.value; scheduleSave(); }
    }
  });

  // ------------------------------------------------------ drag & drop reorder
  let dragData = null;

  content.addEventListener("mousedown", (e) => {
    if (search) return; // reordering disabled while filtering
    const h = e.target.closest("[data-drag]");
    if (!h) return;
    const el = h.dataset.drag === "field" ? h.closest(".field-row") : h.closest(".card");
    if (el) el.setAttribute("draggable", "true");
  });

  function clearDropMarks() {
    content.querySelectorAll(".drop-before, .drop-after").forEach((el) => el.classList.remove("drop-before", "drop-after"));
  }
  function endDrag() {
    dragData = null;
    clearDropMarks();
    content.querySelectorAll('[draggable="true"]').forEach((el) => el.setAttribute("draggable", "false"));
    content.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
  }
  function markRelative(el, y) {
    const r = el.getBoundingClientRect();
    el.classList.add(y > r.top + r.height / 2 ? "drop-after" : "drop-before");
  }

  content.addEventListener("dragstart", (e) => {
    const fieldRow = e.target.closest('.field-row[draggable="true"]');
    const card = e.target.closest('.card[draggable="true"]');
    if (fieldRow) { dragData = { kind: "field", catId: fieldRow.dataset.cat, fieldId: fieldRow.dataset.field }; fieldRow.classList.add("dragging"); }
    else if (card) { dragData = { kind: "cat", catId: card.dataset.cat }; card.classList.add("dragging"); }
    else return;
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", dragData.catId); } catch (_) {}
  });

  content.addEventListener("dragend", endDrag);
  // If a handle was pressed but no drag happened (plain click), un-arm it so
  // text selection inside the row keeps working.
  document.addEventListener("mouseup", () => {
    if (dragData) return;
    content.querySelectorAll('[draggable="true"]').forEach((el) => el.setAttribute("draggable", "false"));
  });

  content.addEventListener("dragover", (e) => {
    if (!dragData) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    clearDropMarks();
    if (dragData.kind === "field") {
      const overRow = e.target.closest(".field-row");
      if (overRow && overRow.dataset.field !== dragData.fieldId) markRelative(overRow, e.clientY);
      else if (!overRow) {
        const fields = e.target.closest(".fields");
        if (fields) { const last = fields.querySelector(".field-row:last-of-type"); if (last) last.classList.add("drop-after"); }
      }
    } else {
      const overCard = e.target.closest(".card");
      if (overCard && overCard.dataset.cat !== dragData.catId) markRelative(overCard, e.clientY);
    }
  });

  content.addEventListener("drop", (e) => {
    if (!dragData) return;
    e.preventDefault();
    if (dragData.kind === "field") dropField(e);
    else dropCategory(e);
    dragData = null;
    saveNow().then(render);
  });

  function dropField(e) {
    const overRow = e.target.closest(".field-row");
    if (overRow && overRow.dataset.field === dragData.fieldId) return; // dropped on itself
    const srcCat = findCat(dragData.catId);
    const field = srcCat && srcCat.fields.find((f) => f.id === dragData.fieldId);
    if (!field) return;
    srcCat.fields = srcCat.fields.filter((f) => f.id !== dragData.fieldId);

    if (overRow) {
      const tc = findCat(overRow.dataset.cat);
      let idx = tc.fields.findIndex((f) => f.id === overRow.dataset.field);
      const r = overRow.getBoundingClientRect();
      if (e.clientY > r.top + r.height / 2) idx++;
      if (idx < 0) idx = tc.fields.length;
      tc.fields.splice(idx, 0, field);
    } else {
      const box = e.target.closest(".fields");
      const tc = box ? findCat(box.dataset.cat) : srcCat;
      tc.fields.push(field);
    }
  }

  function dropCategory(e) {
    const overCard = e.target.closest(".card");
    const src = findCat(dragData.catId);
    if (!src) return;
    vault.categories = vault.categories.filter((c) => c.id !== dragData.catId);
    if (overCard && overCard.dataset.cat !== dragData.catId) {
      let idx = vault.categories.findIndex((c) => c.id === overCard.dataset.cat);
      const r = overCard.getBoundingClientRect();
      if (e.clientY > r.top + r.height / 2) idx++;
      if (idx < 0) idx = vault.categories.length;
      vault.categories.splice(idx, 0, src);
    } else vault.categories.push(src);
  }

  // ------------------------------------------------------ quick-add a field
  content.addEventListener("keydown", (e) => {
    if (!e.target.classList.contains("quick-add-input") || e.key !== "Enter") return;
    e.preventDefault();
    const catId = e.target.dataset.cat;
    const val = e.target.value.trim();
    if (!val) return;
    const c = findCat(catId);
    if (!c) return;
    c.fields.push({ id: V.uid(), label: val, type: "custom", value: "", keywords: "" });
    saveNow().then(() => {
      render();
      const again = content.querySelector(`.quick-add-input[data-cat="${CSS.escape(catId)}"]`);
      if (again) again.focus();
    });
  });

  content.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const catEl = btn.closest("[data-cat]");
    const fieldEl = btn.closest("[data-field]");
    const accEl = btn.closest("[data-acc]");

    if (act === "copy") return doCopy(btn);
    if (act === "reveal") return toggleReveal(btn);
    if (act === "open-site") { if (!btn.getAttribute("href") || btn.getAttribute("href") === "#") e.preventDefault(); return; }

    if (act === "add-field" && catEl) return openFieldModal(catEl.dataset.cat);
    if (act === "del-field" && fieldEl) {
      const c = findCat(catEl.dataset.cat);
      c.fields = c.fields.filter((f) => f.id !== fieldEl.dataset.field);
      saveNow().then(render);
      return;
    }
    if (act === "edit-cat" && catEl) return openCategoryModal(findCat(catEl.dataset.cat));
    if (act === "del-cat" && catEl) {
      const c = findCat(catEl.dataset.cat);
      confirmModal(`Delete “${c.name}”?`, `This removes the category and its ${c.fields.length} field(s).`, () => {
        vault.categories = vault.categories.filter((x) => x.id !== c.id);
        saveNow().then(render);
      });
      return;
    }
    if (act === "add-account") return addAccount();
    if (act === "del-acc" && accEl) {
      const a = findAcc(accEl.dataset.acc);
      confirmModal(`Delete “${a.label || "this account"}”?`, "This account will be permanently removed.", () => {
        vault.accounts = vault.accounts.filter((x) => x.id !== a.id);
        saveNow().then(render);
      });
      return;
    }
  });

  function doCopy(btn) {
    const input = btn.closest(".acc-input-row")?.querySelector(".acc-input")
      || btn.closest(".field-row")?.querySelector(".field-value");
    const val = input ? input.value : "";
    if (!val) { toast("Nothing to copy"); return; }
    navigator.clipboard.writeText(val).then(() => {
      btn.classList.add("copied"); const old = btn.textContent; btn.textContent = "✓";
      setTimeout(() => { btn.classList.remove("copied"); btn.textContent = old; }, 1100);
      toast("Copied to clipboard", "ok");
    });
  }
  function toggleReveal(btn) {
    const input = btn.closest(".acc-input-row")?.querySelector('input[type="password"], input[data-prop="password"]');
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
  }

  // ----------------------------------------------------------------- modals
  const backdrop = $("#modal-backdrop");
  const modal = $("#modal");
  function openModal(html) { modal.innerHTML = html; backdrop.classList.remove("hidden"); }
  function closeModal() { backdrop.classList.add("hidden"); modal.innerHTML = ""; }
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  function confirmModal(title, sub, onYes) {
    openModal(`
      <h2>${esc(title)}</h2><p class="sub">${esc(sub)}</p>
      <div class="modal-actions">
        <button class="btn-ghost" id="m-cancel">Cancel</button>
        <button class="btn-primary" id="m-yes" style="background:linear-gradient(135deg,#ef4444,#f97316)">Delete</button>
      </div>`);
    $("#m-cancel").onclick = closeModal;
    $("#m-yes").onclick = () => { closeModal(); onYes(); };
  }

  function openFieldModal(catId) {
    openModal(`
      <h2>Add field</h2><p class="sub">Pick a type so autofill knows what it is — or choose “Custom”.</p>
      <label class="fld">Field type</label>
      <select id="f-type">${typeOptions("custom")}</select>
      <label class="fld">Label</label>
      <input id="f-label" placeholder="e.g. First name" />
      <div class="modal-actions">
        <button class="btn-ghost" id="m-cancel">Cancel</button>
        <button class="btn-primary" id="m-add">Add field</button>
      </div>`);
    const typeSel = $("#f-type"), labelIn = $("#f-label");
    typeSel.onchange = () => { const t = V.FIELD_TYPE_MAP[typeSel.value]; if (t && t.value !== "custom") labelIn.value = t.label; };
    labelIn.focus();
    $("#m-cancel").onclick = closeModal;
    $("#m-add").onclick = () => {
      const c = findCat(catId);
      c.fields.push({ id: V.uid(), label: labelIn.value.trim() || (V.FIELD_TYPE_MAP[typeSel.value]?.label) || "New field", type: typeSel.value, value: "", keywords: "" });
      closeModal(); saveNow().then(render);
    };
    labelIn.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#m-add").click(); });
  }

  function openCategoryModal(cat) {
    // cat === null  -> create new ; else edit icon/color/name
    const creating = !cat;
    const presets = V.CATEGORY_PRESETS;
    const COLORS = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6"];
    let chosen = creating ? { icon: presets[0].icon, color: presets[0].color } : { icon: cat.icon, color: cat.color };

    const grid = presets.map((p) =>
      `<button data-icon="${p.icon}" data-color="${p.color}">${p.icon}</button>`).join("");
    const swatches = COLORS.map((c) =>
      `<button class="swatch ${c === chosen.color ? "sel" : ""}" data-color="${c}" style="background:${c}"></button>`).join("");

    openModal(`
      <h2>${creating ? "Add category" : "Edit category"}</h2>
      <p class="sub">Group related details together. Make it yours — name it, pick an emoji and a colour.</p>
      <label class="fld">Name</label>
      <input id="c-name" placeholder="e.g. Banking" value="${esc(creating ? "" : cat.name)}" />
      <label class="fld">Quick pick</label>
      <div class="emoji-grid" id="c-emoji">${grid}</div>
      <label class="fld">Or type any emoji</label>
      <input id="c-emoji-custom" maxlength="6" placeholder="🎓 😀 💳 …" value="${esc(chosen.icon)}" />
      <label class="fld">Colour</label>
      <div class="color-grid" id="c-colors">${swatches}</div>
      <div class="modal-actions">
        <button class="btn-ghost" id="m-cancel">Cancel</button>
        <button class="btn-primary" id="m-save">${creating ? "Create" : "Save"}</button>
      </div>`);

    const emojiInput = $("#c-emoji-custom");
    function selectColor(color) {
      chosen.color = color;
      $("#c-colors").querySelectorAll(".swatch").forEach((x) => x.classList.toggle("sel", x.dataset.color === color));
    }
    $("#c-emoji").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      chosen.icon = b.dataset.icon; emojiInput.value = b.dataset.icon;
      selectColor(b.dataset.color);
    });
    $("#c-colors").addEventListener("click", (e) => {
      const b = e.target.closest(".swatch"); if (!b) return;
      selectColor(b.dataset.color);
    });
    emojiInput.addEventListener("input", () => { chosen.icon = emojiInput.value.trim() || "📄"; });

    $("#c-name").focus();
    $("#m-cancel").onclick = closeModal;
    $("#m-save").onclick = () => {
      const name = $("#c-name").value.trim() || "Untitled";
      const icon = emojiInput.value.trim() || chosen.icon || "📄";
      if (creating) vault.categories.push({ id: V.uid(), name, icon, color: chosen.color, fields: [] });
      else { cat.name = name; cat.icon = icon; cat.color = chosen.color; }
      closeModal(); saveNow().then(render);
    };
    $("#c-name").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#m-save").click(); });
  }

  function addAccount() {
    vault.accounts.unshift({ id: V.uid(), label: "New account", url: "", username: "", password: "" });
    saveNow().then(() => { render(); const first = content.querySelector(".account-name"); if (first) { first.focus(); first.select(); } });
  }

  // ----------------------------------------------------------------- top controls
  $("#search").addEventListener("input", (e) => { search = e.target.value.trim().toLowerCase(); render(); });

  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active"); view = t.dataset.view; render();
  }));

  $("#primary-add").addEventListener("click", () => { view === "profile" ? openCategoryModal(null) : addAccount(); });

  $("#theme-toggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    applyTheme(next); vault.settings.theme = next; scheduleSave();
  });
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    $("#theme-toggle").textContent = t === "dark" ? "☀️" : "🌙";
  }

  // settings menu
  const settingsMenu = $("#settings-menu");
  $("#settings-btn").addEventListener("click", (e) => { e.stopPropagation(); settingsMenu.classList.toggle("hidden"); });
  document.addEventListener("click", () => settingsMenu.classList.add("hidden"));
  settingsMenu.addEventListener("click", (e) => e.stopPropagation());
  settingsMenu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]"); if (!b) return;
    const a = b.dataset.action;
    if (a === "export") exportVault();
    if (a === "import") $("#import-file").click();
    if (a === "reset") confirmModal("Reset everything?", "All categories, fields and accounts will be wiped and restored to defaults.", () => {
      vault = V.defaultVault(); saveNow().then(render);
    });
    settingsMenu.classList.add("hidden");
  });
  $("#toast-toggle").addEventListener("change", (e) => { vault.settings.autofillToast = e.target.checked; scheduleSave(); });

  function exportVault() {
    const blob = new Blob([JSON.stringify(vault, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `autofill-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast("Backup downloaded", "ok");
  }
  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.categories || !Array.isArray(data.categories)) throw new Error("bad");
        data.settings = data.settings || { theme: "light", autofillToast: true };
        data.accounts = data.accounts || [];
        vault = data; saveNow().then(() => { applyTheme(vault.settings.theme || "light"); render(); toast("Backup imported", "ok"); });
      } catch (err) { toast("That file isn’t a valid backup"); }
    };
    reader.readAsText(file); e.target.value = "";
  });

  // ----------------------------------------------------------------- toast
  let toastEl;
  function toast(msg, kind) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.id = "dash-toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.className = kind === "ok" ? "ok show" : "show";
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 1600);
  }

  // ----------------------------------------------------------------- boot
  V.getVault().then((data) => {
    vault = data;
    if (!vault.settings) vault.settings = { theme: "light", autofillToast: true };
    applyTheme(vault.settings.theme || "light");
    $("#toast-toggle").checked = vault.settings.autofillToast !== false;
    setGreeting();
    render();
  });
})();
