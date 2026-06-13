/*
 * common.js — shared between the dashboard, popup and the content script.
 * Loaded as a classic script (no modules) so it works everywhere.
 * It defines a single global: globalThis.Vault (works in pages, content scripts and the SW)
 */
(function () {
  "use strict";

  const STORAGE_KEY = "autofill_vault";

  // ---------------------------------------------------------------------------
  // Field types: the brain behind autofill.
  // `synonyms` are matched against a form field's name/id/label/placeholder.
  // `autocomplete` lists the HTML autocomplete tokens that map to this type.
  // `inputType` is a strong hint (e.g. an <input type="email"> is an email).
  // ---------------------------------------------------------------------------
  const FIELD_TYPES = [
    { value: "custom",       label: "Custom / Other",      synonyms: [],                                                            autocomplete: [] },
    { value: "fullName",     label: "Full name",           synonyms: ["full name", "name", "your name", "applicant name"],          autocomplete: ["name"] },
    { value: "firstName",    label: "First name",          synonyms: ["first name", "given name", "fname", "forename", "first"],    autocomplete: ["given-name"] },
    { value: "lastName",     label: "Last name",           synonyms: ["last name", "surname", "family name", "lname", "last"],      autocomplete: ["family-name"] },
    { value: "middleName",   label: "Middle name",         synonyms: ["middle name", "middle initial", "middle"],                   autocomplete: ["additional-name"] },
    { value: "email",        label: "Email",               synonyms: ["email", "e-mail", "email address", "mail"],                  autocomplete: ["email"], inputType: "email" },
    { value: "phone",        label: "Phone",               synonyms: ["phone", "mobile", "telephone", "phone number", "contact number", "cell", "mobile number"], autocomplete: ["tel"], inputType: "tel" },
    { value: "dob",          label: "Date of birth",       synonyms: ["date of birth", "dob", "birth date", "birthday"],            autocomplete: ["bday"] },
    { value: "age",          label: "Age",                 synonyms: ["age"],                                                       autocomplete: [] },
    { value: "gender",       label: "Gender",              synonyms: ["gender", "sex"],                                             autocomplete: ["sex"] },
    { value: "addressLine1", label: "Address line 1",      synonyms: ["address", "street address", "address line 1", "address 1", "street", "house"], autocomplete: ["address-line1", "street-address"] },
    { value: "addressLine2", label: "Address line 2",      synonyms: ["address line 2", "address 2", "apartment", "suite", "unit", "apt"], autocomplete: ["address-line2"] },
    { value: "city",         label: "City",                synonyms: ["city", "town", "suburb"],                                    autocomplete: ["address-level2"] },
    { value: "state",        label: "State / Province",    synonyms: ["state", "province", "region", "county"],                     autocomplete: ["address-level1"] },
    { value: "zip",          label: "ZIP / Postal code",   synonyms: ["zip", "zip code", "postal code", "postcode", "pincode", "pin code", "post code"], autocomplete: ["postal-code"] },
    { value: "country",      label: "Country",             synonyms: ["country", "nation"],                                         autocomplete: ["country", "country-name"] },
    { value: "company",      label: "Company",             synonyms: ["company", "organization", "organisation", "employer"],       autocomplete: ["organization"] },
    { value: "jobTitle",     label: "Job title",           synonyms: ["job title", "designation", "position", "role", "title"],     autocomplete: ["organization-title"] },
    { value: "website",      label: "Website / Portfolio", synonyms: ["website", "portfolio", "personal website", "url", "web"],    autocomplete: ["url"] },
    { value: "linkedin",     label: "LinkedIn",            synonyms: ["linkedin", "linkedin profile", "linkedin url"],              autocomplete: [] },
    { value: "github",       label: "GitHub",              synonyms: ["github", "github profile", "github url"],                    autocomplete: [] },
    { value: "username",     label: "Username",            synonyms: ["username", "user name", "login", "user id", "userid"],       autocomplete: ["username"] }
  ];

  const FIELD_TYPE_MAP = FIELD_TYPES.reduce((m, t) => { m[t.value] = t; return m; }, {});

  // A pleasant palette + emoji set offered when creating categories.
  const CATEGORY_PRESETS = [
    { icon: "👤", color: "#6366f1" },
    { icon: "🏠", color: "#0ea5e9" },
    { icon: "🎓", color: "#f59e0b" },
    { icon: "💼", color: "#10b981" },
    { icon: "🌐", color: "#ec4899" },
    { icon: "📄", color: "#8b5cf6" },
    { icon: "💳", color: "#ef4444" },
    { icon: "⭐", color: "#14b8a6" }
  ];

  // ---------------------------------------------------------------------------
  // Default vault — what a brand new user sees. Values are blank; the structure
  // shows how things are organised so it's obvious where to type.
  // ---------------------------------------------------------------------------
  function defaultVault() {
    return {
      version: 1,
      settings: { theme: "light", autofillToast: true },
      categories: [
        {
          id: uid(), name: "Personal", icon: "👤", color: "#6366f1",
          fields: [
            { id: uid(), label: "First name", type: "firstName", value: "", keywords: "" },
            { id: uid(), label: "Last name",  type: "lastName",  value: "", keywords: "" },
            { id: uid(), label: "Full name",  type: "fullName",  value: "", keywords: "" },
            { id: uid(), label: "Email",      type: "email",     value: "", keywords: "" },
            { id: uid(), label: "Phone",      type: "phone",     value: "", keywords: "" },
            { id: uid(), label: "Date of birth", type: "dob",    value: "", keywords: "" },
            { id: uid(), label: "Age",        type: "age",       value: "", keywords: "" }
          ]
        },
        {
          id: uid(), name: "Address", icon: "🏠", color: "#0ea5e9",
          fields: [
            { id: uid(), label: "Address line 1", type: "addressLine1", value: "", keywords: "" },
            { id: uid(), label: "Address line 2", type: "addressLine2", value: "", keywords: "" },
            { id: uid(), label: "City",    type: "city",    value: "", keywords: "" },
            { id: uid(), label: "State",   type: "state",   value: "", keywords: "" },
            { id: uid(), label: "ZIP code", type: "zip",    value: "", keywords: "" },
            { id: uid(), label: "Country", type: "country", value: "", keywords: "" }
          ]
        },
        {
          id: uid(), name: "Education", icon: "🎓", color: "#f59e0b",
          fields: [
            { id: uid(), label: "10th / SSC",          type: "custom", value: "", keywords: "percentage,marks,school" },
            { id: uid(), label: "Intermediate / 12th", type: "custom", value: "", keywords: "percentage,marks,college" },
            { id: uid(), label: "BTEC",                type: "custom", value: "", keywords: "btec,grade" },
            { id: uid(), label: "Degree / University", type: "custom", value: "", keywords: "degree,university,graduation" }
          ]
        },
        {
          id: uid(), name: "Professional", icon: "💼", color: "#10b981",
          fields: [
            { id: uid(), label: "Job title", type: "jobTitle", value: "", keywords: "" },
            { id: uid(), label: "Company",   type: "company",  value: "", keywords: "" },
            { id: uid(), label: "LinkedIn",  type: "linkedin", value: "", keywords: "" },
            { id: uid(), label: "GitHub",    type: "github",   value: "", keywords: "" },
            { id: uid(), label: "Portfolio", type: "website",  value: "", keywords: "" }
          ]
        }
      ],
      accounts: []
    };
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function uid() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function normalize(str) {
    return (str || "").toString().toLowerCase().replace(/[_\-\s]+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
  }

  // ---------------------------------------------------------------------------
  // Storage helpers (Promise based)
  // ---------------------------------------------------------------------------
  function getVault() {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (res) => {
        const data = res && res[STORAGE_KEY];
        if (!data || !data.categories) {
          const fresh = defaultVault();
          chrome.storage.local.set({ [STORAGE_KEY]: fresh }, () => resolve(fresh));
        } else {
          resolve(data);
        }
      });
    });
  }

  function saveVault(vault) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: vault }, () => resolve(vault));
    });
  }

  function onVaultChanged(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[STORAGE_KEY]) {
        callback(changes[STORAGE_KEY].newValue);
      }
    });
  }

  // Flatten every field across categories into a simple list — used by autofill.
  function allFields(vault) {
    const out = [];
    (vault.categories || []).forEach((cat) => {
      (cat.fields || []).forEach((f) => {
        out.push({ ...f, categoryName: cat.name, categoryIcon: cat.icon, categoryColor: cat.color });
      });
    });
    return out;
  }

  globalThis.Vault = {
    STORAGE_KEY,
    FIELD_TYPES,
    FIELD_TYPE_MAP,
    CATEGORY_PRESETS,
    defaultVault,
    uid,
    normalize,
    getVault,
    saveVault,
    onVaultChanged,
    allFields
  };
})();
