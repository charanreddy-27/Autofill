/* Autofill Vault — showcase site interactions. Plain JS, no dependencies. */
(function () {
  "use strict";

  // -------------------------------------------------------------------------
  // Theme: default to the user's system preference, remember their choice.
  // -------------------------------------------------------------------------
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem("afv-site-theme"); } catch (e) {}
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(stored || (prefersDark ? "dark" : "light"));

  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("afv-site-theme", t); } catch (e) {}
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.textContent = t === "dark" ? "☀️" : "🌙";
      b.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    });
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  });

  // -------------------------------------------------------------------------
  // Mobile nav
  // -------------------------------------------------------------------------
  var nav = document.querySelector(".nav");
  var burger = document.querySelector(".nav-burger");
  if (burger && nav) {
    burger.addEventListener("click", function () { nav.classList.toggle("open"); });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  // -------------------------------------------------------------------------
  // Scroll reveal
  // -------------------------------------------------------------------------
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // -------------------------------------------------------------------------
  // Tiny toast
  // -------------------------------------------------------------------------
  function toast(msg, ok) {
    var el = document.createElement("div");
    el.className = "site-toast" + (ok ? " ok" : "");
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () { el.classList.remove("show"); setTimeout(function () { el.remove(); }, 300); }, 2200);
  }

  // -------------------------------------------------------------------------
  // Hero demo: clicking "Fill this page" animates the faux form filling in.
  // -------------------------------------------------------------------------
  var fillBtn = document.querySelector("[data-demo-fill]");
  if (fillBtn) {
    fillBtn.addEventListener("click", function () {
      var slots = document.querySelectorAll("[data-fill]");
      slots.forEach(function (slot, i) {
        setTimeout(function () {
          slot.textContent = slot.getAttribute("data-fill");
          slot.classList.remove("empty");
          slot.classList.add("filled");
        }, 90 * i);
      });
      setTimeout(function () { toast("Filled " + slots.length + " fields ⚡", true); }, 90 * slots.length);
    });
  }

  // -------------------------------------------------------------------------
  // Contact form -> opens a pre-filled email (no backend required).
  // -------------------------------------------------------------------------
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector("[name=name]") || {}).value || "";
      var email = (form.querySelector("[name=email]") || {}).value || "";
      var message = (form.querySelector("[name=message]") || {}).value || "";
      var to = form.getAttribute("data-to") || "charanreddychanda@gmail.com";
      var subject = encodeURIComponent("Hello from " + (name || "your site"));
      var body = encodeURIComponent(message + "\n\n— " + name + (email ? " (" + email + ")" : ""));
      window.location.href = "mailto:" + to + "?subject=" + subject + "&body=" + body;
      toast("Opening your email client…", true);
    });
  }

  // -------------------------------------------------------------------------
  // Footer year
  // -------------------------------------------------------------------------
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // -------------------------------------------------------------------------
  // Scroll progress bar + nav "scrolled" weight
  // -------------------------------------------------------------------------
  var bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);

  var ticking = false;
  function onScroll() {
    var st = window.scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    if (nav) nav.classList.toggle("scrolled", st > 8);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  // -------------------------------------------------------------------------
  // Cursor-following spotlight on cards (skips touch / reduced-motion)
  // -------------------------------------------------------------------------
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && !reduce) {
    document.querySelectorAll(".feature, .stack-card, .learn, .step, .link-btn").forEach(function (card) {
      card.classList.add("spotlight");
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }
})();
