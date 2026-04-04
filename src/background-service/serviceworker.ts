import { reloadAllServiceTabs, requestFetch } from "@/common/findTabs";
import { CMD, MSG } from "@/common/message-hub/Message";
import processMessage from "@/common/message-hub/MessageHub";
import { ms } from "@/common/TimespanExtension";
import { wait } from "@/common/utils";
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

const MAIL_TAB_INTERVAL = ms(20).toMinutes();

let currentVersion = chrome.runtime.getVersion();

main();

async function main() {
    const lastVersion = (await chrome.storage.local.get("IMIC_EXTENSION_VERSION"))?.IMIC_EXTENSION_VERSION as
        | string
        | undefined;
    if (lastVersion && lastVersion !== currentVersion) {
        console.log(`[Main] Extension updated from version ${lastVersion} to ${currentVersion}.`);
        await chrome.storage.local.set({ IMIC_EXTENSION_VERSION: currentVersion });
        await whenExtensionInstalled({ reason: "update", previousVersion: lastVersion, id: chrome.runtime.id });
    }

    await updateExtension();

    setInterval(() => {
        updateExtension();
    }, ms(3).toHours());

    let count = 0;

    setInterval(() => {
        if (count > MAXIMUM_TICK) count = 0;
        void APICalls(++count);
    }, GLOBAL_INTERVAL);

    console.log("Global Timer has been started. Interval: ", ms(GLOBAL_INTERVAL).toSecondsString());

    const mailTabFunc = async () => {
        const [ext_mail_tab] = await chrome.tabs.query({
            url: "https://kmmbox.korea.kr/mail/*",
            active: false,
        });
        if (ext_mail_tab) {
            chrome.tabs.reload(ext_mail_tab.id!);
            console.log(new Date().toLocaleTimeString() + " [Interval] Mail tab has been reloaded.", ext_mail_tab);
            return;
        }
        console.log(new Date().toLocaleTimeString() + " [Interval] Inactive mail tab has not been found.");
    };

    void mailTabFunc();

    setInterval(() => {
        void mailTabFunc();
    }, MAIL_TAB_INTERVAL);
    console.log(
        new Date().toLocaleTimeString() + " Mail tab reloading timer has been started. Interval: ",
        ms(MAIL_TAB_INTERVAL).toMinutesString(),
    );
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
export async function updateExtension() {
    const updateStatus = await chrome.runtime.requestUpdateCheck();
    console.log("[updateExtension] Update check result: ", { currentVersion: currentVersion, ...updateStatus });
    switch (updateStatus.status) {
        case "update_available":
            console.log("[updateExtension] An update is available. Reloading to update...");
            await chrome.storage.local.set({ IMIC_EXTENSION_VERSION: currentVersion });
            chrome.runtime.reload();
            break;
        case "no_update":
            console.log("[updateExtension] No update available. Current version is up to date.");
            break;
        case "throttled":
            console.warn("[updateExtension] Update check throttled. Please try again later.");
            break;
    }
}

chrome.runtime.onUpdateAvailable.addListener(async ({ version }) => {
    console.log(`[updateExtension] A new version (${version}) of the extension is available. Reloading to update...`);
    await chrome.storage.local.set({ IMIC_EXTENSION_VERSION: currentVersion });
    chrome.runtime.reload();
});

chrome.runtime.onInstalled.addListener(async (details) => {
    await whenExtensionInstalled(details);
});

async function whenExtensionInstalled(details: chrome.runtime.InstalledDetails) {
    console.log("[whenExtensionInstalled] Extension installed/updated with details: ", {
        currentVersion: currentVersion,
        ...details,
    });

    const openedWindows = await chrome.windows.getAll({ populate: true });
    if (openedWindows.length === 0 || ["chrome_update", "shared_module_update"].includes(details.reason)) {
        return;
    }

    const waitTime = ms(3).toSeconds();
    const openNewTab = (url: string) => chrome.tabs.create({ url: url, active: true });
    const showNotificationAndOpenTab = async (url: string) => {
        await new NotificationItem({
            title: "IMIC TrackPost",
            message: `확장 프로그램이 ${details.reason === "install" ? "설치" : "업데이트"} 되었습니다.`,
        }).show();
        await wait(waitTime);
        await openNewTab(url);
    };

    await Promise.all([reloadAllServiceTabs(), clearAllNotifications()]);

    if (details.reason === "install") {
        console.log("[whenExtensionInstalled] Extension installed with version", currentVersion);
        await showNotificationAndOpenTab("https://github.com/psh0626/TrackPostExtZip/");
    } else if (details.previousVersion !== currentVersion) {
        console.log(
            "[whenExtensionInstalled] Extension updated to version from",
            details.previousVersion,
            "to",
            currentVersion,
        );
        await showNotificationAndOpenTab("https://github.com/psh0626/TrackPostExtZip/releases");
    }
}

let isTime = true;
chrome.webRequest.onCompleted.addListener(
    (details) => {
        if (
            details.url.includes("https://kmmbox.korea.kr/history/maillist/") ||
            details.url.includes("https://kmmbox.korea.kr/mail24read/") ||
            details.url.includes("https://kmmbox.korea.kr/mail/list/mailbox.json") ||
            details.url.includes("https://kmmbox.korea.kr/mail/manage/seen.json")
        ) {
            if (!isTime) {
                console.log("API " + details.method + " request completed: ", details.url);
                console.log("Cooltime is not yet reached.");
                return;
            }

            console.log("API " + details.method + " request completed: ", details.url);
            void (async () => {
                const mailTabs = await chrome.tabs.query({ url: "https://kmmbox.korea.kr/*" });
                if (!mailTabs) {
                    console.log("No mail tabs found.");
                    return;
                }
                mailTabs.forEach((tab) => {
                    new MSG(CMD.WEB_REQUEST_COMPLETE).fromService.toTab(tab);
                    console.log("Message Sent to content script in: ", tab);
                });
                isTime = false;
                setTimeout(() => {
                    isTime = true;
                    console.log("Cooltime is over. Messages can be sent to content script now.");
                }, ms("1").toSeconds());
            })();
        }
    },
    { urls: ["https://kmmbox.korea.kr/*"] },
);
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
