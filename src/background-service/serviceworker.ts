import { reloadAllServiceTabs, requestFetch } from "@/common/findTabs";
import { CMD, MSG } from "@/common/message-hub/Message";
import processMessage from "@/common/message-hub/MessageHub";
import StorageKey from "@/common/StorageKey";
import { ms } from "@/common/TimespanExtension";
import { wait } from "@/common/utils";
import { parseStringPromise } from "xml2js";
import { GcssItem, isGcssItem, WorkflowItem } from "../content-scripts/pending-replies/dataWrapper";
import { ServiceTypes } from "../content-scripts/pending-replies/gcssReplies";
import { GCSSMessage } from "../content-scripts/pending-replies/newGcssWrapper";
import createNotification, { clearAllNotifications, getStorageItems } from "./lib/notification";
import NotificationItem from "./lib/NotificationItem";

//chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
void chrome.action.setBadgeBackgroundColor({ color: "#424242" });
void chrome.action.setBadgeTextColor({ color: "white" });

// const GCSS_URL = "https://gcss.ipc.be";
const ICARE_URL = "https://icare.post";
console.log("BackgroundWorker has been initiated.");

const MsgPort: { [key: number]: chrome.runtime.Port } = {};

const GLOBAL_INTERVAL = ms(30).toSeconds();
const UPDATE_CHECK_TICK = 6; // Every 3 minutes (6 * 30 seconds)
const MAXIMUM_TICK = 120;

const EXTENSION_UPDATE_LOG_KEY = "IMIC_EXTENSION_UPDATE_LOG";
const EXTENSION_VERSION_KEY = "IMIC_EXTENSION_VERSION";
const INSTALL_PAGE_URL = "https://github.com/psh0626/TrackPostExtZip/";
const RELEASES_PAGE_URL = "https://github.com/psh0626/TrackPostExtZip/releases";

const INSTALL_OPEN_PAGE_DELAY = ms(3).toSeconds();

const currentVersion = chrome.runtime.getVersion();

let isInstallationFlowRunning = false;

main();

async function main() {
    await checkUpdate();

    setInterval(() => {
        checkUpdate();
    }, ms(1).toHours());

    let count = 0;

    setInterval(() => {
        if (count > MAXIMUM_TICK) count = 0;
        void APICalls(++count);
    }, GLOBAL_INTERVAL);

    console.log("Global Timer has been started. Interval: ", ms(GLOBAL_INTERVAL).toSecondsString());
}
async function APICalls(count: number, final = false) {
    console.log(`[APICalls] Ticking Global Timer: `, count, " times");
    if (count % UPDATE_CHECK_TICK === 0) {
        const services = [
            CMD.GCSS_UNREAD_REPLIES,
            CMD.GCSS_UNREAD_REQUESTS,
            CMD.ICARE_UNREAD_REPLIES,
            CMD.ICARE_UNREAD_REQUESTS,
            CMD.NEW_GCSS_UNREAD_REPLIES,
            CMD.NEW_GCSS_UNREAD_REQUESTS,
        ];
        let hasImportantUnread = false;
        for (const e of services) {
            const itemList = await getStorageItems<GcssItem | WorkflowItem | GCSSMessage>(e);
            if (itemList.length > 0) {
                hasImportantUnread = itemList.some((i) => {
                    if (isGcssItem(i)) {
                        return i.serviceType === ServiceTypes.EMS;
                    } else {
                        return i.isNotification === false;
                    }
                });
                if (hasImportantUnread) break;
            }
        }

        if (hasImportantUnread || count % MAXIMUM_TICK === 0) {
            console.log("[APICalls] There are important unread items. Forcing notification update.");
            await createNotification(true);
        }
    }
    const activeTabs = await requestFetch();
    if (!activeTabs || activeTabs.length === 0) {
        if (final) {
            await chrome.action.setBadgeText({ text: "?" });
        } else {
            setTimeout(async () => {
                console.log("[APICalls] Global timer could not find icare or gcss tab. Retrying in 2 seconds..");
                await APICalls(count, true);
            }, ms("2").toSeconds());
        }
        return;
    }
}
export async function checkUpdate() {
    const storedVersion = await new StorageKey(EXTENSION_VERSION_KEY).fromLocal.get<string>();
    if (storedVersion && storedVersion !== currentVersion) {
        console.log(
            `[checkUpdate] Detected version discrepancy between stored version ${storedVersion} and current version ${currentVersion}. Triggering installation flow...`,
        );
        await whenExtensionInstalled({ reason: "update", previousVersion: storedVersion });
        return { status: "update_available", version: currentVersion };
    }

    const updateUrl = await chrome.management.getSelf().then((info) => info.updateUrl);
    if (!updateUrl) {
        console.error("[checkUpdate] No update URL found for the extension.");
        return { status: "no_update" };
    }
    const response = await fetch(updateUrl);
    const data = await response.text();
    const xml = await parseStringPromise(data, {
        explicitArray: false,
        trim: true,
    });
    const latestVersion = xml.gupdate.app.updatecheck.$.version as string | undefined;
    if (!latestVersion) {
        console.error("[checkUpdate] Failed to fetch the latest version from updateManifest.xml");
        return { status: "no_update" };
    }
    console.log("[checkUpdate] Fetched version: ", latestVersion);

    if (latestVersion === currentVersion) {
        console.log(`[checkUpdate] Current version ${currentVersion} is up to date.`);
        return { status: "no_update" };
    } else {
        console.log(`[checkUpdate] A new version (${latestVersion}) is available! Current version: ${currentVersion}`);
        const checkResult = await chrome.runtime.requestUpdateCheck();
        if (checkResult.status !== "update_available") {
            new NotificationItem({
                title: `IMIC TrackPost (v${currentVersion} → v${latestVersion})`,
                message: "새로운 업데이트가 있습니다. 인터넷 브라우저를 재시작하면 적용됩니다.",
                priority: 2,
                requireInteraction: true,
            }).show(true);
        }
        return { status: "update_available", version: latestVersion };
    }
}

chrome.runtime.onUpdateAvailable.addListener(async ({ version }) => {
    const logMessage = `[onUpdateAvailable] A new version (${version}) of the extension is available. Reloading to update...`;
    console.log(logMessage);
    await appendExtensionUpdateLog(logMessage);
    chrome.runtime.reload();
});

chrome.runtime.onInstalled.addListener(whenExtensionInstalled);

async function appendExtensionUpdateLog(message: string) {
    const key = new StorageKey(EXTENSION_UPDATE_LOG_KEY);
    const currentLog = await key.fromLocal.get<string>();
    let updatedLog = "";
    if (currentLog) {
        const logEntries = currentLog.split("\n");
        const entriesToday = logEntries.filter((entry) => entry.includes(new Date().toLocaleDateString()));
        updatedLog = `${entriesToday.join("\n")}\n${new Date().toLocaleString()} - ${message}`;
    } else {
        updatedLog = `${new Date().toLocaleString()} - ${message}`;
    }
    await key.fromLocal.set(updatedLog);
}

function waitForOpenBrowserWindow(timeoutMins = 60) {
    const timeoutMs = ms(timeoutMins).toMinutes();
    let timeoutId: NodeJS.Timeout;
    let callback: () => void;

    const timeoutPromise = new Promise<boolean>((res) => {
        timeoutId = setTimeout(() => {
            chrome.windows.onCreated.removeListener(callback);
            res(false);
        }, timeoutMs);
    });

    const eventPromise = new Promise<boolean>((res) => {
        callback = () => {
            clearTimeout(timeoutId);
            chrome.windows.onCreated.removeListener(callback!!);
            res(true);
        };
        chrome.windows.onCreated.addListener(callback, { windowTypes: ["normal"] });
    });

    return Promise.race([eventPromise, timeoutPromise]);
}

async function notifyInstallationResult(reason: "install" | "update", previousVersion: string, targetUrl: string) {
    const isInstall = reason === "install";
    const versionText = isInstall || previousVersion==="unknown" ? `v${currentVersion}` : `v${previousVersion} → v${currentVersion}`;

    await new NotificationItem({
        priority: 2,
        title: `IMIC TrackPost`,
        contextMessage: `${versionText}`,
        requireInteraction: true,
        message: `확장 프로그램이 ${isInstall ? "설치" : "업데이트"} 되었습니다.`,
    }).show();

    await wait(INSTALL_OPEN_PAGE_DELAY);
    const [openedTab] = await chrome.tabs.query({ url: targetUrl });
    if (openedTab && openedTab.id) {
        await Promise.all([chrome.tabs.update(openedTab.id, { active: true }), chrome.tabs.reload(openedTab.id)]);
        return;
    }

    await chrome.tabs.create({ url: targetUrl, active: true });
}

async function whenExtensionInstalled(details: chrome.runtime.InstalledDetails) {
    const newDetails = { currentVersion: currentVersion, ...details };
    console.log("[whenExtensionInstalled] Extension installed/updated with details: ", newDetails);

    if (["chrome_update", "shared_module_update"].includes(details.reason)) {
        console.log(
            "[whenExtensionInstalled] Extension update detected due to browser or shared module update. No user notification will be shown.",
        );
        return;
    }

    if (isInstallationFlowRunning) {
        console.trace(
            `[whenExtensionInstalled] Installation flow is already running. Skipping duplicate execution. Current trigger details:`,
        );
        return;
    }

    // Set the flag to indicate that the installation flow is running (prevents duplicate execution)
    isInstallationFlowRunning = true;
    const versionKey = new StorageKey(EXTENSION_VERSION_KEY);
    const previousVersion = (await versionKey.fromLocal.get<string>()) || "unknown";
    console.log(
        `[whenExtensionInstalled] Previous version in storage: ${previousVersion}, Current version: ${currentVersion}`,
    );

    // Check if there are any open browser windows. If not, wait for a window to open before proceeding with the installation flow.
    // This is to prevent notifications from showing up without an open window, which could lead to users dismissing the notification about the update.
    const openWindows = await chrome.windows.getAll({ windowTypes: ["normal"], populate: true });
    console.log("[whenExtensionInstalled] Currently open browser windows: ", openWindows);

    if (openWindows.length === 0) {
        const logMessage = `[waitForOpenBrowserWindow] Extension installed/updated with details: ${JSON.stringify(newDetails)}. However, no browser windows are currently open. Waiting for a window to open...`;
        console.log(logMessage);
        await appendExtensionUpdateLog(logMessage);
        const hasOpenWindow = await waitForOpenBrowserWindow();
        if (!hasOpenWindow) {
            const timeoutMessage = `[waitForOpenBrowserWindow] No browser window was opened within the timeout period after installation/update. Installation flow has been canceled.`;
            console.log(timeoutMessage);
            await appendExtensionUpdateLog(timeoutMessage);
            isInstallationFlowRunning = false;
            return;
        }
    }
    // Window is open, proceed with the rest of the installation flow

    const reloadOtherTabs = async () => {
        const tabs = await chrome.tabs.query({
            url: ["https://kmmbox.korea.kr/*", "https://mail.korea.kr/*", "https://mail.posa.or.kr/*"],
        });
        return Promise.all(tabs.map((t) => t.id && chrome.tabs.reload(t.id)));
    };
    await Promise.all([reloadAllServiceTabs(), reloadOtherTabs(), clearAllNotifications()]);

    // Update the stored version to the current version after successful notification
    // This is to ensure the user gets the notification.
    if (details.reason === "install") {
        console.log("[whenExtensionInstalled] Extension installed with version", currentVersion);
        await notifyInstallationResult(details.reason, previousVersion, INSTALL_PAGE_URL);
        await versionKey.fromLocal.set(currentVersion);
    } else if (details.reason === "update" && previousVersion !== currentVersion) {
        console.log("[whenExtensionInstalled] Extension updated from", previousVersion, "to", currentVersion);
        await notifyInstallationResult(details.reason, previousVersion, RELEASES_PAGE_URL);
        await versionKey.fromLocal.set(currentVersion);
    }
    isInstallationFlowRunning = false;
}

chrome.webRequest.onCompleted.addListener(
    async function (details) {
        if (details.statusCode === 200) {
            const tabs = await chrome.tabs.query({ url: "https://github.com/psh0626/TrackPostExtZip/*" });
            tabs.forEach(async (tab) => {
                if (!tab.id || !tab.url) return;

                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    world: "MAIN",
                    func: () => {
                        document.querySelector("div[itemtype*='abstract']")?.scrollIntoView({ behavior: "smooth" });
                    },
                });
                const reload = new URL(tab.url).searchParams.get("reload");
                if (reload === "true") {
                    console.log(
                        "[Github onCompleted] Github page extension reload requested, extension reloads..",
                        details,
                    );
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        world: "MAIN",
                        func: () => {
                            console.log(
                                "[Github onCompleted] Github page extension reload requested, extension reloads..",
                            );
                            window.history.replaceState(null, "", window.location.pathname);
                        },
                    });
                    chrome.runtime.reload();
                }
            });
        }
    },
    {
        urls: ["https://github.com/psh0626/TrackPostExtZip/*"],
    },
);

chrome.webRequest.onCompleted.addListener(
    function (details) {
        if (details.method === "GET") {
            if (details.url.includes("icare.post/?module=workflow&action=requestFields")) {
                console.log("API GET request completed: ", details.url);
                void (async () => {
                    const [tab] = await chrome.tabs.query({ url: ICARE_URL + "/*" });
                    if (tab) {
                        if (!MsgPort) {
                            console.log("Message port is not open. Unable to send a message to the content script");
                            return;
                        }
                        MsgPort[details.tabId].postMessage(new MSG(CMD.WEB_REQUEST_COMPLETE));
                        console.log("Message Sent to content script in: ", tab.title);
                        return true;
                    }
                    return false;
                })();
                return false;
            } else if (details.url.includes("icare.post/?module=workflow&action=replyFields")) {
                console.log("API GET request completed: ", details.url);
                void (async () => {
                    const [tab] = await chrome.tabs.query({ url: ICARE_URL + "/*" });
                    if (!tab) {
                        return false;
                    }
                    if (!MsgPort) {
                        console.log("Message port is not open. Unable to send a message to the content script");
                        return;
                    }
                    MsgPort[details.tabId].postMessage(new MSG(CMD.WEB_REQUEST_COMPLETE));
                    console.log("Message Sent to content script in: ", tab.title);
                    return true;
                })();
                return false;
            }
        }
    },
    { urls: ["*://icare.post/*"] },
);

const GCSS_SUM_AJAX_URLS = [
    "https://gcss.ipc.be/CSS/gcss/ajax/*/alerts/show/SUM_REPLY",
    "https://gcss.ipc.be/CSS/gcss/ajax/*/alerts/show/SUM_REQ",
    "https://gcss.ipc.be/CSS/gcss/ajax/*/alerts/show/QUM_REQ",
];
const GCSS_SUM_PAGE_URLS = [
    "https://gcss.ipc.be/CSS/gcss/*/alerts/show/SUM_REPLY",
    "https://gcss.ipc.be/CSS/gcss/*/alerts/show/SUM_REQ",
    "https://gcss.ipc.be/CSS/gcss/*/alerts/show/QUM_REQ",
];

chrome.webRequest.onCompleted.addListener(
    (details) => {
        console.log("WebRequest onCompleted: ", details, "for URL: ", GCSS_SUM_AJAX_URLS);
        if (!details.url || !details.method) {
            return;
        }
        if (details.method === "POST") {
            void (async () => {
                const foundTabs = await chrome.tabs.query({ url: GCSS_SUM_PAGE_URLS });
                console.log("WebRequest onCompleted found tabs: ", foundTabs);
                const msgPromises = foundTabs.map((tab) =>
                    tab.id ? chrome.tabs.sendMessage(tab.id, "GCSS_SUM_AJAX_COMPLETE") : Promise.resolve(),
                );
                await Promise.all(msgPromises);
            })();
        }
    },
    { urls: GCSS_SUM_AJAX_URLS },
);

chrome.runtime.onConnect.addListener((port) => {
    if (!port.sender || !port.sender.url || !port.sender.tab || !port.sender.tab.id) {
        return;
    }
    const port_url = port.sender.url;
    const port_tab_id = port.sender.tab.id;
    if (port_url.includes("icare.post")) {
        MsgPort[port_tab_id] = port;
        console.log(
            `${new Date().toLocaleString("ko-KR")} - MsgPort established with new connection.`,
            MsgPort,
            "background: ",
            port,
        );
        port.onDisconnect.addListener((p) => {
            if (!p.sender || !p.sender.tab || !p.sender.tab.id) {
                return;
            }
            const tab_id = p.sender.tab.id;
            delete MsgPort[tab_id];
            console.log(
                `${new Date().toLocaleString("ko-KR")} - MsgPort deleted since the connection is lost.`,
                MsgPort,
                "background: ",
                port,
                port === p,
            );
        });
    }
});

chrome.runtime.onMessage.addListener(processMessage);

// chrome.tabs.onUpdated.addListener((tabId, changed, tab: chrome.tabs.Tab) => {
//   if (tab.url == null) {
//     return;
//   }

//   const url = new URL(tab.url);

//   if (url.origin == GCSS_URL) {
//     chrome.sidePanel.setOptions({
//       tabId,
//       path: "sidepanel.html",
//       enabled: true,
//     });
//     //console.log(`sidepanel enabled for ${url.toString()}`);

//     if (url.pathname.includes("/create/")) {
//     }
//   } else if (url.origin == ICARE_URL) {
//     chrome.sidePanel.setOptions({
//       tabId,
//       path: "sidepanel.html",
//       enabled: true,
//     });
//     console.log(`sidepanel enabled for ${url.toString()}`);

//     const queryParams = url.searchParams;
//     if (queryParams.has("action") && queryParams.get("action") === "view") {
//     }
//   }
// });
