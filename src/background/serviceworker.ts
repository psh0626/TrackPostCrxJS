export default function background() { }


const GCSS_URL = "https://gcss.ipc.be";
const ICARE_URL = "https://icare.post";
console.log("BackgroundWorker has been initiated.");

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, changed, tab) => {
  if (tab.url == null) {
    return;
  }

  const url = new URL(tab.url);

  if (url.origin == GCSS_URL) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
    console.log(`sidepanel enabled for ${url.toString()}`);
    if (url.pathname.includes("/create/")) {
      chrome.tabs.sendMessage(tabId, {
        type: "GCSS_CREATE_REQUEST",
      });
    }
  } else if (url.origin == ICARE_URL) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
    console.log(`sidepanel enabled for ${url.toString()}`);
    const queryParams = url.searchParams;
    if (queryParams.has("action") && queryParams.get("action") === "view") {
      chrome.tabs.sendMessage(tabId, {
        type: "ICARE_VIEW_REQUEST",
      });
    }
  }
});
