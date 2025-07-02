// Global map to store authors as they are retrieved
const authorCellMap: Record<string, HTMLElement | undefined> = {};
let isInserting = false;

console.log("Initial call to insertAuthorColumn after script load.");
insertAuthorColumn();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === "GCSS_SUM_AJAX_COMPLETE") {
        setTimeout(() => {
            console.log("Received GCSS_SUM_AJAX_COMPLETE message, calling insertAuthorColumn.");
            insertAuthorColumn();
        }, 500);
    }
    return false; // No response needed for other messages
});

async function getQuery(itemId: string): Promise<string> {
    const response = await fetch("https://gcss.ipc.be/CSS/gcss/query", {
        headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
        },
        referrer: "https://gcss.ipc.be/CSS/gcss/product-view/EMS",
        body: '{"products":["EMS"],"itemId":"' + itemId + '"}',
        method: "POST",
        mode: "cors",
        credentials: "include",
    });
    const result = await response.json();
    const [Qs] = result
        .filter((el: { workflowType: string }) => el.workflowType.includes("Q"))
        .map((el: { author: string }) => el.author);
    return Qs;
}

async function getQueryWithRetry(itemId: string, retries = 1): Promise<string | undefined> {
    try {
        const author = await getQuery(itemId);
        if (authorCellMap[itemId] && authorCellMap[itemId] instanceof HTMLElement) {
            authorCellMap[itemId].textContent = author;
        }
        return author;
    } catch (e) {
        if (retries > 0) {
            await new Promise((res) => setTimeout(res, 50));
            return getQueryWithRetry(itemId, retries - 1);
        } else {
            if (authorCellMap[itemId] && authorCellMap[itemId] instanceof HTMLElement)
                authorCellMap[itemId].textContent = "error";
            return undefined;
        }
    }
}

function cloneAndInsertBefore({
    selector,
    attr,
    text,
    parentSelector,
    beforeSelector,
    childIndex,
}: {
    selector: string;
    attr?: [string, string];
    text?: string;
    parentSelector?: string;
    beforeSelector?: string;
    childIndex?: number;
}) {
    const node = document.querySelector(selector);
    if (!node) return;
    const clone = node.cloneNode(true) as HTMLElement;
    if (attr) clone.setAttribute(attr[0], attr[1]);
    if (text) clone.textContent = text;
    if (parentSelector && beforeSelector) {
        const parent = document.querySelector(parentSelector);
        const before = document.querySelector(beforeSelector);
        if (parent && before) parent.insertBefore(clone, before);
    } else if (parentSelector && typeof childIndex === "number") {
        const parent = document.querySelector(parentSelector);
        if (parent && parent.children[childIndex]) {
            parent.insertBefore(clone, parent.children[childIndex]);
        }
    }
    return clone;
}

export default async function insertAuthorColumn() {
    let beforeTime = performance.now();
    if (document.querySelector("th[data-property='lastAuthor']")) {
        console.log("Author column already exists, skipping insertion.");
        return;
    }
    if (isInserting) {
        console.log("Insertion already in progress, skipping this call.");
        return;
    }
    isInserting = true;
    const maxAttempts = 20;
    const waitTime = 50; // ms
    for (let i = 0; i < maxAttempts; i++) {
        if (document.querySelector("tbody")) {
            console.log(
                `Document ready at ${i + 1} attempts (${Math.round(performance.now() - beforeTime)} ms), proceeding with insertion.`
            );
            break;
        } else if (i === 9) {
            console.log("document not ready after 10 attempts, aborting insertion.");
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    const tbodyRows = [...document.querySelector("tbody")!.children];

    // Create all new <td> elements first
    tbodyRows.forEach((td) => {
        const itemId = (td.children[0] as HTMLElement).innerText;
        const newTd = document.createElement("td");
        newTd.textContent = "loading...";
        td.insertBefore(newTd, td.children[1]);
        authorCellMap[itemId] = newTd;
    });

    cloneAndInsertBefore({
        selector: "th[data-property='workflowType']",
        attr: ["data-property", "lastAuthor"],
        text: "last req.author",
        parentSelector: "tr.header",
        beforeSelector: "th[data-property='workflowType']",
    });

    cloneAndInsertBefore({
        selector: "tr.filter > *:last-child",
        parentSelector: "tr.filter",
        childIndex: 1,
    });

    const displayItemIds = tbodyRows.map((td) => (td.children[0] as HTMLElement).innerText);
    isInserting = false;
    console.log("Author column inserted successfully.");
    // For each item, try to get the author, retrying once if failed, and update the global map as we go
    beforeTime = performance.now();
    await Promise.all(displayItemIds.map((el) => getQueryWithRetry(el, 1)));
    console.log(`Author retrieval completed in ${Math.round(performance.now() - beforeTime)} ms.`);
}
