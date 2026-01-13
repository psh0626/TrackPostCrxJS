import { COMMANDS, Msg } from "../lib/Message";
import CreateNotification, { GetStorageItems } from "../lib/Notification";
import PopupTrack from "../lib/PopupTrack";
import "../lib/TimespanExtension";
import { GcssItem, WorkflowItem } from "./GetUnreadReplies/DataWrapper";
import { ServiceTypes } from "./GetUnreadReplies/GcssReplies";
import ProcessMessage from "./MessageHub/MessageHub";

//chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
void chrome.action.setBadgeBackgroundColor({ color: "#424242" });
void chrome.action.setBadgeTextColor({ color: "white" });

// const GCSS_URL = "https://gcss.ipc.be";
const ICARE_URL = "https://icare.post";
console.log("BackgroundWorker has been initiated.");

const MsgPort: { [key: number]: chrome.runtime.Port } = {};
export const PopupTracker = new PopupTrack();

main();

function main() {
    let count = 0;
    const GLOBAL_INTERVAL = "30".toSeconds();
    const MAIL_TAB_INTERVAL = "20".toMinutes();

    setInterval(() => {
        void APICalls(count++);
    }, GLOBAL_INTERVAL);
    console.log(new Date().toLocaleTimeString() + " Global Timer has been started. Interval: ", GLOBAL_INTERVAL);

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
        MAIL_TAB_INTERVAL
    );
}
async function APICalls(count: number, final = false) {
    const today = new Date();
    console.log(`${today.toLocaleTimeString("ko-KR")}: Ticking Global Timer: `, count, " times");
    if (count % 6 === 0) {
        const services = [
            COMMANDS.GCSS_UNREAD_REPLIES,
            COMMANDS.GCSS_UNREAD_REQUESTS,
            COMMANDS.ICARE_UNREAD_REPLIES,
            COMMANDS.ICARE_UNREAD_REQUESTS,
        ];
        let hasImportantUnread = false;
        for (const e of services) {
            let itemList = await GetStorageItems<GcssItem | WorkflowItem>(e);
            if (e === COMMANDS.GCSS_UNREAD_REQUESTS && itemList.length > 0) {
                itemList = itemList.filter((i) => (i as GcssItem).ServiceType === ServiceTypes.EMS);
            }
            if (itemList.length > 0) {
                hasImportantUnread = true;
                break;
            }
        }

        if (hasImportantUnread || count % 120 === 0) {
            console.log("There are important unread items. Forcing notification update.");
            await CreateNotification(true);
        }
    }
    const work_tabs = await chrome.tabs.query({
        url: ["https://icare.post/*", "https://gcss.ipc.be/*"],
        status: "complete",
    });
    if (!work_tabs) {
        return;
    }
    console.log("WORK TABS: ", work_tabs);
    if (Array.isArray(work_tabs)) {
        const icare_tab = work_tabs.filter((item: chrome.tabs.Tab) =>
            item.url!.includes("icare.post")
        )[0] as chrome.tabs.Tab;
        const gcss_tab = work_tabs.filter((item: chrome.tabs.Tab) =>
            item.url!.includes("gcss.ipc.be")
        )[0] as chrome.tabs.Tab;

        if (!icare_tab && !gcss_tab) {
            if (final) {
                await chrome.action.setBadgeText({ text: "?" });
            } else {
                setTimeout(async () => {
                    console.log("Global timer could not find icare or gcss tab. Retrying in 2 seconds..");
                    await APICalls(count, true);
                }, "2".toSeconds());
            }
            return;
        }

        if (icare_tab) {
            await chrome.tabs.sendMessage(icare_tab.id!, new Msg(COMMANDS.ICARE_UNREAD_REPLIES));
            console.log(new Date().toLocaleTimeString(), "icare ticked");
        }
        if (gcss_tab) {
            await chrome.tabs.sendMessage(gcss_tab.id!, new Msg(COMMANDS.GCSS_UNREAD_REPLIES));
            console.log(new Date().toLocaleTimeString(), "gcss ticked");
        }
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
                    chrome.tabs.sendMessage(tab.id!, new Msg(COMMANDS.WEB_REQUEST_COMPLETE));
                    console.log("Message Sent to content script in: ", tab);
                });
                isTime = false;
                setTimeout(() => {
                    isTime = true;
                    console.log("Cooltime is over. Messages can be sent to content script now.");
                }, 1000);
            })();
        }
    },
    { urls: ["https://kmmbox.korea.kr/*"] }
);

chrome.webRequest.onCompleted.addListener(
    function (details) {
        if (details.url.includes("https://github.com/shawnpark9494/TrackPostExtZip/commits/main/")) {
            console.log("[Git onCompleted] github commits page requested, extention reload begins..", details);
            chrome.runtime.reload();
        }
    },
    {
        urls: ["https://github.com/shawnpark9494/TrackPostExtZip/commits/main/"],
    }
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
                        MsgPort[details.tabId].postMessage(new Msg(COMMANDS.WEB_REQUEST_COMPLETE));
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
                    MsgPort[details.tabId].postMessage(new Msg(COMMANDS.WEB_REQUEST_COMPLETE));
                    console.log("Message Sent to content script in: ", tab.title);
                    return true;
                })();
                return false;
            }
        }
    },
    { urls: ["*://icare.post/*"] }
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
                    tab.id ? chrome.tabs.sendMessage(tab.id, "GCSS_SUM_AJAX_COMPLETE") : Promise.resolve()
                );
                await Promise.all(msgPromises);
            })();
        }
    },
    { urls: GCSS_SUM_AJAX_URLS }
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
            port
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
                port === p
            );
        });
    }
});

chrome.runtime.onMessage.addListener(ProcessMessage);

chrome.notifications.onClicked.addListener((id) => {
    if (id === COMMANDS.ICARE_UNREAD_REPLIES) {
        chrome.notifications.clear(id);
    }
});

chrome.notifications.onButtonClicked.addListener((noti_id) => {
    if (noti_id === COMMANDS.ICARE_UNREAD_REPLIES) {
        chrome.tabs.getCurrent((tab) => {
            if (tab) chrome.windows.update(tab.windowId, { focused: true }, () => chrome.action.openPopup());
        });
    }
});

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
