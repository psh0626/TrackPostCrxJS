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

let currentVersion = chrome.runtime.getVersion();

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
    const updateUrl = "https://raw.githubusercontent.com/psh0626/TrackPostExtZip/main/updateManifest.xml";
    const response = await fetch(updateUrl);
    const data = await response.text();
    const xml = await parseStringPromise(data, {
        explicitArray: false,
        trim: true,
    });
    const latestVersion = xml.gupdate.app.updatecheck.$.version as string | undefined;
    console.log("[checkUpdate] Fetched version: ", latestVersion);
    if (!latestVersion) {
        console.error("[checkUpdate] Failed to fetch the latest version from updateManifest.xml");
        return { status: "no_update" };
    }

    if (latestVersion !== currentVersion) {
        console.log(`[checkUpdate] A new version (${latestVersion}) is available! Current version: ${currentVersion}`);
        const checkResult = await chrome.runtime.requestUpdateCheck();
        if (checkResult.status !== "update_available") {
            new NotificationItem({
                title: `IMIC TrackPost (v${currentVersion} → v${latestVersion})`,
                message: "새로운 업데이트가 있습니다. 인터넷 브라우저를 재시작하면 적용됩니다.",
                requireInteraction: true,
            }).show(true);
        }
        return { status: "update_available", version: latestVersion };
    }
    return { status: "no_update" };
}

chrome.runtime.onUpdateAvailable.addListener(async ({ version }) => {
    console.log(`[onUpdateAvailable] A new version (${version}) of the extension is available. Reloading to update...`);
    const key = new StorageKey("IMIC_EXTENSION_UPDATE_LOG");
    const logMessage = `${new Date().toLocaleString()} - [onUpdateAvailable] A new version (${version}) of the extension is available. Reloading to update...`;
    const currentLog = await key.fromLocal.get<string>();
    const updatedLog = currentLog ? `${currentLog}\n${logMessage}` : logMessage;
    await key.fromLocal.set(updatedLog);
    chrome.runtime.reload();
});

chrome.runtime.onInstalled.addListener(whenExtensionInstalled);

async function whenExtensionInstalled(details: chrome.runtime.InstalledDetails) {
    const newDetails = { currentVersion: currentVersion, ...details };
    console.log("[whenExtensionInstalled] Extension installed/updated with details: ", newDetails);

    const openedWindows = await chrome.windows.getAll({ populate: true });

    if (openedWindows.length === 0 || ["chrome_update", "shared_module_update"].includes(details.reason)) {
        const key = new StorageKey("IMIC_EXTENSION_UPDATE_LOG");
        const logMessage = `${new Date().toLocaleString()} - [whenExtensionInstalled] Extension installed/updated with details: ${JSON.stringify(newDetails)}`;
        const currentLog = await key.fromLocal.get<string>();
        const updatedLog = currentLog ? `${currentLog}\n${logMessage}` : logMessage;
        await key.fromLocal.set(updatedLog);
        console.log(logMessage);
        return;
    }

    const versionKey = new StorageKey("IMIC_EXTENSION_VERSION");
    const previousVersion = (await versionKey.fromLocal.get<string>()) || "";
    console.log(
        `[whenExtensionInstalled] Previous version in storage: ${previousVersion}, Current version: ${currentVersion}`,
    );

    const waitTime = ms(3).toSeconds();
    const openNewTab = (url: string) => chrome.tabs.create({ url: url, active: true });
    const showNotificationAndOpenTab = async (url: string) => {
        await new NotificationItem({
            title: `IMIC TrackPost v${currentVersion}`,
            message: `확장 프로그램이 ${details.reason === "install" ? "설치" : "업데이트"} 되었습니다.`,
        }).show();
        await wait(waitTime);
        await openNewTab(url);
    };

    await Promise.all([reloadAllServiceTabs(), clearAllNotifications()]);

    if (details.reason === "install") {
        console.log("[whenExtensionInstalled] Extension installed with version", currentVersion);
        await showNotificationAndOpenTab("https://github.com/psh0626/TrackPostExtZip/");
    } else if (previousVersion !== currentVersion) {
        console.log("[whenExtensionInstalled] Extension updated from", previousVersion, "to", currentVersion);
        await showNotificationAndOpenTab("https://github.com/psh0626/TrackPostExtZip/releases");
        await versionKey.fromLocal.set(currentVersion);
    }
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
