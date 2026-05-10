import { wait } from "@/common/utils";
import { GCSS_API_BASE_URL } from "../pending-replies/newGcssWrapper";

// Global map to store authors as they are retrieved
const authorCellMap: Record<string, HTMLElement[] | undefined> = {};
const fetchedItemsAuthors: Record<string, string> = {};
const baseUrl = GCSS_API_BASE_URL;
let isInserting = false;
async function getQuery(itemId: string): Promise<string> {
    if (fetchedItemsAuthors[itemId]) {
        console.log(`Item ID ${itemId} already fetched, skipping.`);
        return fetchedItemsAuthors[itemId];
    }
    const baseData = await fetch(`${baseUrl}/workflows/item/${itemId}/check`).then((res) => res.json());
    let workflowId = baseData?.workflowId;
    if (!workflowId) {
        console.log(`No workflowId found for itemId ${itemId}, now checking closed workflows.`);
        const itemQualification = await fetch(`${baseUrl}/item-qualifications/${itemId}`).then((res) => res.json());
        const product = itemQualification?.qualification?.product;
        if (!product) {
            console.log(`No product found for itemId ${itemId}, cannot check closed workflows.`);
            return "";
        }
        const closedData = await fetch(`${baseUrl}/workflows/${itemId}/${product}/closed`).then((res) => res.json());
        workflowId = closedData?.workflowId;
        if (!workflowId) {
            console.log(`No workflowId found in closed workflows for itemId ${itemId}, returning unknown.`);
            return "";
        }
    }
    
    const history = await fetch(`${baseUrl}/workflows/${workflowId}/history`).then((res) => res.json());
    const inquiries = (history?.messages as Array<any>)
        .filter((msg) => msg.sendingCountryCode === "KR")
        .map((msg) => msg.authorName);
    const lastAuthor = inquiries.length > 0 ? inquiries[inquiries.length - 1] : "";

    fetchedItemsAuthors[itemId] = lastAuthor;
    console.log("getQuery result for itemId:", itemId, "->", lastAuthor);
    return lastAuthor;
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
    selectorForClone,
    attr,
    text,
    parentSelector,
    beforeSelector,
    childIndex,
}: {
    selectorForClone: string;
    attr?: [string, string];
    text?: string;
    parentSelector?: string;
    beforeSelector?: string;
    childIndex?: number;
}) {
    const node = document.querySelector(selectorForClone);
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

export default async function newGcssInsertAuthorColumn(url: URL) {
    let beforeTime = performance.now();
    if (isInserting) {
        console.log("Insertion already in progress, skipping this call.");
        return;
    }
    isInserting = true;

    const maxAttempts = 30;
    const waitTime = 500; // ms
    for (let i = 0; i < maxAttempts; i++) {
        if (document.readyState === "complete" && document.querySelector("tbody")) {
            console.log(
                `Document ready at ${i + 1} attempts (${Math.round(performance.now() - beforeTime)} ms), proceeding with insertion.`,
            );
            [...document.querySelector("tbody")!.children].forEach((_, idx) => {
                const existingCell = document.querySelector(`#author-row-${idx}`);
                if (existingCell) {
                    existingCell.textContent = "loading...";
                }
            });
            await wait(waitTime);
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
    tbodyRows.forEach((tr, idx) => {
        const itemId = (tr.children[0] as HTMLElement).innerText;
        const existingCell = document.querySelector(`#author-row-${idx}`);
        if (!existingCell) {
            const newTd = document.createElement("td");
            newTd.id = `author-row-${idx}`;
            newTd.style.cssText = `box-sizing: border-box; flex: 80 0 auto; min-width: 50px; width: 80px;`;
            tr.insertBefore(newTd, tr.children[1]);
        }
        const cell = document.querySelector(`#author-row-${idx}`) as HTMLElement;
        cell.textContent = "loading...";

        if (!authorCellMap[itemId]) {
            authorCellMap[itemId] = [cell];
        } else {
            authorCellMap[itemId].push(cell);
        }
    });

    if (!document.querySelector(`th[data-inserted='${url.pathname}']`)) {
        console.log("Author column does not exist, proceeding with insertion.");
        cloneAndInsertBefore({
            selectorForClone: "thead > tr:nth-child(1) > th:nth-child(2)",
            attr: ["data-inserted", url.pathname],
            text: "Last Author",
            parentSelector: "thead > tr:nth-child(1)",
            childIndex: 1,
        });

        cloneAndInsertBefore({
            selectorForClone: "thead > tr.filters > *:last-child",
            parentSelector: "thead > tr.filters",
            attr: [
                "style",
                "position: relative; box-sizing: border-box; flex: 130 0 auto; min-width: 20px; width: 30px;",
            ],
            text: "",
            childIndex: 1,
        });
    }
    console.log("Author column inserted successfully.");
    isInserting = false;

    const displayItemIds = [...new Set(tbodyRows.map((td) => (td.children[0] as HTMLElement).innerText))];
    console.log(`Filling author column for ${displayItemIds.length} items.`, displayItemIds);
    beforeTime = performance.now();
    await Promise.all(displayItemIds.map((el) => getQueryWithRetry(el, 1)));
    console.log(`Author retrieval completed in ${Math.round(performance.now() - beforeTime)} ms.`);
}
