const table = document.querySelector("table");
const test = table ? [...table.rows].map((el) => el.cells[0].innerText).filter((el) => el.includes("E")) : [];
const getQuery = async (itemId: string) => {
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
};
const promiseAllQueries = test.map((el) => getQuery(el));
const result = await Promise.all(promiseAllQueries);
console.trace("DONE", result);

const newHeader = document.createElement("th");
newHeader.textContent = "last author";
const beforeNode = document.querySelector("th[data-property='workflowType'");

const headerRow = document.querySelector("tr.header");
if (headerRow) {
    headerRow.insertBefore(newHeader, beforeNode);
}
export {};
