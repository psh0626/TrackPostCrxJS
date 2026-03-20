import { COMMANDS, MSG } from "./Message";

export function getAllTabs() {
    return chrome.tabs.query({
        url: ["https://icare.post/*", "https://gcss.ipc.be/*", "https://gcss-uat.ipc.be/*"],
    });
}
export async function findActive(tabs: chrome.tabs.Tab[]) {
    if (!tabs || tabs.length === 0) {
        return null;
    }

    const activeTab = tabs.find((tab) => tab.frozen === false && tab.discarded === false);

    if (activeTab) {
        return activeTab;
    }

    chrome.tabs.reload(tabs[0].id!);
    return tabs[0];
}

export async function requestFetch() {
    const workTabs = await getAllTabs();

    if (!workTabs) {
        return [undefined, undefined, undefined];
    }
    console.log("WORK TABS: ", workTabs);

    const iCareTabs = workTabs.filter((tab) => tab.url!.includes("icare.post"));
    const oldGcssTabs = workTabs.filter((tab) => tab.url!.includes("gcss.ipc.be"));
    const newGcssTabs = workTabs.filter((tab) => tab.url!.includes("gcss-uat.ipc.be"));

    const findActiveTabs = [findActive(iCareTabs), findActive(oldGcssTabs), findActive(newGcssTabs)];

    const activeTabs = await Promise.all(findActiveTabs);

    activeTabs.forEach((tab) => {
        if (tab && tab.id) {
            console.log("Active tab found and requesting fetch: ", tab);
            chrome.tabs.sendMessage(tab.id, new MSG(COMMANDS.FETCH_REQUEST));
        }
    });

    return activeTabs;
}
