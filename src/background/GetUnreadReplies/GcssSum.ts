
// Global map to store authors as they are retrieved
const authorMap: Record<string, string | undefined> = {};

async function getQuery(itemId: string) {
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
        authorMap[itemId] = author;
        return author;
    } catch (e) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, 1000));
            return getQueryWithRetry(itemId, retries - 1);
        } else {
            authorMap[itemId] = undefined;
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
    childIndex
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
    } else if (parentSelector && typeof childIndex === 'number') {
        const parent = document.querySelector(parentSelector);
        if (parent && parent.children[childIndex]) parent.insertBefore(clone, parent.children[childIndex]);
    }
    return clone;
}

export default async function insertAuthorColumn() {
    if(document.querySelector("th[data-property='lastAuthor']")) return;
    const tbodyRows = [...document.querySelector("tbody")!.children];
    const displayItemIds = tbodyRows.map((td) => (td.children[0] as HTMLElement).innerText);
    // For each item, try to get the author, retrying once if failed, and update the global map as we go
    await Promise.all(displayItemIds.map((el) => getQueryWithRetry(el, 1)));

    cloneAndInsertBefore({
        selector: "th[data-property='workflowType']",
        attr: ["data-property", "lastAuthor"],
        text: "last req.author",
        parentSelector: "tr.header",
        beforeSelector: "th[data-property='workflowType']"
    });

    cloneAndInsertBefore({
        selector: "tr.filter > *:first-child",
        parentSelector: "tr.filter",
        childIndex: 0
    });

    tbodyRows.forEach((td) => {
        const itemId = (td.children[0] as HTMLElement).innerText;
        const newTd = document.createElement("td");
        newTd.textContent = authorMap[itemId] ?? "";
        td.insertBefore(newTd, td.children[1]);
    });
}
