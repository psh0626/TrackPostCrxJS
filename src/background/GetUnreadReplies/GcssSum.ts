
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

async function addAuthorColumn() {
    const table = document.querySelector("table");
    const test = table ? [...table.rows].map((el) => el.cells[0].innerText).filter((el) => el.includes("E")) : []; // TODO: change this to collect IDs from rows.   
    const promiseAllQueries = test.map((el) => getQuery(el));
    const result = await Promise.all(promiseAllQueries); // TODO: use allSettled for error handling
    console.log(result);

    let beforeNode = document.querySelector("th[data-property='workflowType']")!;
    const newThHeader = beforeNode.cloneNode(true) as HTMLElement;
    newThHeader.setAttribute("data-property", "lastAuthor");
    newThHeader.textContent = "last req. author";
    document.querySelector("tr.header")!.insertBefore(newThHeader, beforeNode);

    beforeNode = document.querySelector("tr.filter")!.children[0];
    const newThFilter = beforeNode.cloneNode(true);
    document.querySelector("tr.filter")!.insertBefore(newThFilter, beforeNode);

    [...document.querySelector("tbody")!.children].forEach((tr, i)=>{
        const newTd = document.createElement("td");
        newTd.textContent = result[i];
        tr.insertBefore(newTd, tr.children[1]);
    });
}

export {};
