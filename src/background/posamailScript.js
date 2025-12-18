const updateTitle = (ms = 1000) => {
    setTimeout(() => {
        const unreadCount = document.querySelector("#li_INBOX")?.querySelector("strong")?.textContent;

        const unreadText = unreadCount === "" ? "" : `(${unreadCount}) `;

        document.title = unreadText + "POSA WEBMAIL";
    }, ms);
};

updateTitle();

setInterval(() => {
    updateTitle(10);
}, 1000 * 3);

setInterval(
    () => {
        ["forward", "write"].some((el) => {
            const currentURL = new URL(location.href);

            if (!currentURL.hash.includes(el)) {
                batchProcess?.modifyReloadMail();
                updateTitle();
                console.log("Unread mail updated");
            }
        });
    },
    1000 * 60 * 5
);

console.log("POSA mail script loaded.");
