import { CMD, MSG } from "./message-hub/Message";

const SERVICES = {
    iCare: {
        queryPattern: "https://icare.post/*",
        hostMatch: "icare.post",
    },
    oldGcss: {
        queryPattern: "https://gcss.ipc.be/*",
        hostMatch: "gcss.ipc.be",
    },
    newGcss: {
        queryPattern: "https://gcss-uat.ipc.be/*",
        hostMatch: "gcss-uat.ipc.be",
    },
} as const;

type ServiceKey = keyof typeof SERVICES;

function groupTabsByService(tabs: chrome.tabs.Tab[]): Record<ServiceKey, chrome.tabs.Tab[]> {
    return {
        iCare: tabs.filter((tab) => tab.url?.includes(SERVICES.iCare.hostMatch)),
        oldGcss: tabs.filter((tab) => tab.url?.includes(SERVICES.oldGcss.hostMatch)),
        newGcss: tabs.filter((tab) => tab.url?.includes(SERVICES.newGcss.hostMatch)),
    };
}

export async function getAllServiceTabs(shouldAwaken: boolean) {
    const allTabs = await chrome.tabs.query({
        url: Object.values(SERVICES).map((service) => service.queryPattern),
    });

    console.log("[getAllServiceTabs] Found Tabs: ", allTabs);

    if (shouldAwaken) {
        const groupedTabs = groupTabsByService(allTabs);
        await Promise.all(Object.values(groupedTabs).map((tabs) => findActive(tabs)));
    }

    return allTabs;
}

function getBestAvailableTab(tabs: chrome.tabs.Tab[]): chrome.tabs.Tab | undefined {
    if (!tabs || tabs.length === 0) {
        return undefined;
    }
    return tabs.find((tab) => tab.frozen === false && tab.discarded === false) ?? tabs[0];
}

export async function findActive(tabs: chrome.tabs.Tab[]) {
    const activeTab = getBestAvailableTab(tabs);

    if (!activeTab) return undefined;

    if (activeTab.frozen === false && activeTab.discarded === false) return activeTab;

    console.log("[findActive] No active tab found, reloading first tab: ", activeTab);
    if (activeTab.id) {
        await chrome.tabs.update(activeTab.id, { autoDiscardable: false });
        await chrome.tabs.reload(activeTab.id);
    }
    return activeTab;
}

export async function findFirstTabsForEachService() {
    const workTabs = await getAllServiceTabs(false);

    if (!workTabs || workTabs.length === 0) {
        return workTabs;
    }

    const groupedTabs = groupTabsByService(workTabs);

    const findActiveTabs = Object.values(groupedTabs).map((tabs) => findActive(tabs));
    const activeTabs = await Promise.all(findActiveTabs);

    return activeTabs.map((tab) => tab).filter((tab): tab is chrome.tabs.Tab => tab !== undefined);
}

export async function requestFetch() {
    const tabs = await findFirstTabsForEachService();

    if (!tabs || tabs.length === 0) {
        console.log("[requestFetch] No tabs to request fetch");
        return;
    }

    tabs.forEach((tab) => {
        if (tab && tab.id) {
            console.log("[requestFetch] Requesting fetch to tab ", tab);
            new MSG(CMD.FETCH_REQUEST).fromService.toTab(tab);
        }
    });

    return tabs;
}

export async function reloadAllServiceTabs() {
    const tabs = await getAllServiceTabs(false);
    const reloads = tabs
        .map((tab) => {
            if (!tab.id) return null;
            return chrome.tabs.reload(tab.id);
        })
        .filter((p) => p !== null);
    await Promise.all([...reloads]);
}