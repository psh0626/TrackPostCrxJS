import "./serviceAwakener";
// Global map to store authors as they are retrieved
const authorCellMap: Record<string, HTMLElement[] | undefined> = {};
const fetchedItemsAuthors: Record<string, string> = {};
let isInserting = false;

console.log("Initial call to insertAuthorColumn after script load.");
setTimeout(insertAuthorColumn, 1);

chrome.runtime.onMessage.addListener((message) => {
    if (message === "GCSS_SUM_AJAX_COMPLETE") {
        setTimeout(() => {
            console.log("Received GCSS_SUM_AJAX_COMPLETE message, calling insertAuthorColumn.");
            insertAuthorColumn();
        }, 1);
    }
    return false; // No response needed for other messages
});

export async function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getQuery(itemId: string): Promise<string> {
    const servieType = itemId[0] === "C" ? "UPU" : itemId[0] === "L" ? "EXPRES" : itemId[0] === "R" ? "REG" : "EMS";
    if (fetchedItemsAuthors[itemId]) {
        console.log(`Item ID ${itemId} already fetched, skipping.`);
        return fetchedItemsAuthors[itemId];
    }
    const response = await fetch("https://gcss.ipc.be/CSS/gcss/query", {
        headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
        },
        referrer: "https://gcss.ipc.be/CSS/gcss/product-view/EMS",
        body: `{"products":["${servieType}"],"itemId":"${itemId}"}`,
        method: "POST",
        mode: "cors",
        credentials: "include",
    });
    const result = await response.json();
    const [item] = result
        .filter(
            (el: { workflowType: string; originCountry: string }) =>
                el.originCountry === "KR" && el.workflowType.includes("Q"),
        )
        .map((el: { workflowType: string; author: string }) => ({
            author: el.author,
            workflowType: el.workflowType,
        }));
    fetchedItemsAuthors[itemId] = item.author;
    console.log("getQuery result for itemId:", itemId, "->", item.author, item.workflowType);
    return item.author;
}

async function getQueryWithRetry(itemId: string, retries = 1): Promise<string | undefined> {
    try {
        if (authorCellMap[itemId]?.[0] instanceof HTMLElement) {
            const author = await getQuery(itemId);
            authorCellMap[itemId].forEach((td) => {
                td.textContent = author;
            });
            return author;
        }
        return undefined; // If the itemId is not in the map, return undefined
    } catch (e) {
        if (retries > 0) {
            await new Promise((res) => setTimeout(res, 500));
            return getQueryWithRetry(itemId, retries - 1);
        } else {
            if (authorCellMap[itemId]?.[0] instanceof HTMLElement) {
                authorCellMap[itemId].forEach((td) => {
                    td.textContent = "error";
                });
                return undefined;
            }
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
    const maxAttempts = 30;
    const waitTime = 50; // ms
    for (let i = 0; i < maxAttempts; i++) {
        if (document.querySelector("tbody")) {
            console.log(
                `Document ready at ${i + 1} attempts (${Math.round(performance.now() - beforeTime)} ms), proceeding with insertion.`,
            );
            break;
        } else if (i === maxAttempts - 1) {
            console.log(
                `document not ready after ${maxAttempts} attempts (${Math.round(performance.now() - beforeTime)} ms), aborting insertion.`,
            );
            return;
        }
        await wait(waitTime);
    }

    const tbodyRows = [...document.querySelector("tbody")!.children];

    // Create all new <td> elements first
    tbodyRows.forEach((td) => {
        const itemId = (td.children[0] as HTMLElement).innerText;
        const newTd = document.createElement("td");
        newTd.textContent = "loading...";
        td.insertBefore(newTd, td.children[1]);
        if (!authorCellMap[itemId]) {
            authorCellMap[itemId] = [newTd];
        } else {
            authorCellMap[itemId].push(newTd);
        }
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
    console.log("Author column inserted successfully.");
    isInserting = false;

    const displayItemIds = [...new Set(tbodyRows.map((td) => (td.children[0] as HTMLElement).innerText))];
    console.log(`Filling author column for ${displayItemIds.length} items.`, displayItemIds);
    beforeTime = performance.now();
    await Promise.all(displayItemIds.map((el) => getQueryWithRetry(el, 1)));
    console.log(`Author retrieval completed in ${Math.round(performance.now() - beforeTime)} ms.`);
}
