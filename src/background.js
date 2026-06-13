/*
 * background.js — service worker. Connects the keyboard shortcut and the
 * right-click menu to the content script, and seeds storage on install.
 */
importScripts("common.js");

const V = self.Vault;

chrome.runtime.onInstalled.addListener(() => {
  // Make sure a vault exists.
  V.getVault();

  chrome.contextMenus.create({
    id: "afv-fill-page",
    title: "Autofill this page",
    contexts: ["page", "editable"]
  });
  chrome.contextMenus.create({
    id: "afv-open-dashboard",
    title: "Open Autofill Vault",
    contexts: ["action"]
  });
});

function fillActiveTab(tab) {
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "FILL_PERSONAL" }, () => void chrome.runtime.lastError);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "afv-fill-page") fillActiveTab(tab);
  if (info.menuItemId === "afv-open-dashboard") chrome.runtime.openOptionsPage();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "fill-page") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => fillActiveTab(tabs[0]));
  }
});
