import { COMMANDS, Msg } from "../lib/Message";
import "../lib/TimespanExtension";
void (() => {
    let isTime = true;
    const originalTitle = document.title;

    let folderId = getFolderId();
    if (!folderId) {
        console.log("Folder ID not found, will try again in 5 seconds");
        setTimeout(() => {
            folderId = getFolderId();
            console.log("New Folder ID: ", folderId);
        }, "5".toSeconds());
    }

    const elmCount = getUnreadCountByElement2();

    updateTitle(elmCount);

    setLazyInterval(() => {
        (async () => {
            const unreadCount = await getUnreadCountByFetch();
            updateTitle(unreadCount);
            isTime = false;
            console.log("[LazyInterval] item fetched", document.title);
        })();
    }, "3".toMinutes());

    function setLazyInterval(callback: () => void, delay: number, immediate: boolean = false) {
        if (immediate) {
            callback();
        }
        setTimeout(() => {
            callback();
            setLazyInterval(callback, delay, false);
        }, delay);
    }

    function getUnreadCountByElement2() {
        const unreadElm: HTMLLIElement | null | undefined = document
            .querySelector("tr.x-tree-action-id-1")
            ?.querySelector("li.badge-m");
        if (!unreadElm) {
            console.log("Unread element not found");
            return getUnreadCountByElement();
        }

        const unreadCount = parseInt(unreadElm.innerText || "0");
        if (isNaN(unreadCount)) {
            console.log("Unread count is NaN", unreadCount);
            return getUnreadCountByElement();
        }

        return unreadCount;
    }
    function getUnreadCountByElement() {
        const unreadElm: HTMLLIElement | null = document.querySelector("li#r3-maill-unseen-cnt");
        if (!unreadElm) {
            console.log("Unread element not found");
            return 0;
        }

        const unreadCount = unreadElm.innerText === "" ? 0 : parseInt(unreadElm.innerText);
        if (isNaN(unreadCount)) {
            console.log("Unread count is NaN", unreadCount);
            return 0;
        }

        return unreadCount;
    }
    function updateTitle(unreadCount: number) {
        if (!isTime) {
            setTimeout(() => {
                isTime = true;
            }, "2".toSeconds());
            return;
        }
        if (unreadCount === 0) {
            document.title = `${originalTitle}`;
        } else {
            document.title = `(${unreadCount}) ${originalTitle}`;
        }
        console.log("Title updated to: ", document.title);
    }
    function getFolderId() {
        const idElm = document.querySelector("tr.x-tree-action-id-1");
        if (!idElm) {
            console.log("ID element not found");
            return null;
        }
        const id = idElm.getAttribute("ext:tree-node-id");
        if (!id) {
            console.log("ID not found");
            return null;
        }
        return id;
    }
    async function getUnreadCountByFetch() {
        const fetch = await fetchInbox();
        if (!fetch) {
            console.log("Fetch failed");
            return 0;
        }

        const unreadCount = fetch.resultUnseenMailCnt;

        if (unreadCount === 0) {
            if (!document.querySelector("#r3-maill-unseen-cnt-td")?.classList.contains("x-hidden")) {
                document.querySelector("#r3-maill-unseen-cnt-td")?.classList.add("x-hidden");
            }
        } else {
            if (document.querySelector("#r3-maill-unseen-cnt-td")?.classList.contains("x-hidden")) {
                document.querySelector("#r3-maill-unseen-cnt-td")?.classList.remove("x-hidden");
            }
            const unreadCountElement = document.getElementById("r3-maill-unseen-cnt");
            if (unreadCountElement) {
                unreadCountElement.innerHTML = unreadCount.toString();
            }
        }

        console.log("Unread count: ", unreadCount);
        return unreadCount;
    }
    async function fetchInbox() {
        if (!folderId) {
            console.log("Folder ID not found, trying to get it again");
            folderId = getFolderId();
            console.log("New Folder ID: ", folderId);
            if (!folderId) {
                console.log("Folder ID not found, fetch failed");
                return;
            }
        }

        const request = await fetch("https://kmmbox.korea.kr/mail/list/mailbox.json", {
            headers: {
                accept: "*/*",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "powered-by": "Crinity",
            },
            body: `start=0&limit=20&sort=timeMillis&dir=DESC&method=mailbox&allFolder=false&folderUid=${folderId}&folderType=0&filterField=&filterKey=&searchField=&searchWord=&periodStart=0&periodLimit=0&searchContent=&searchAdrTo=&searchAdrFrom=&searchAttachName=&searchSubjectWord=`,
            method: "POST",
            mode: "cors",
            credentials: "include",
        });
        if (!request.ok) {
            console.log("Request failed", request.statusText);
            return null;
        }
        const result = await request.json();
        if (!result) {
            console.log("Result not found");
            return null;
        }
        return result as inboxFetchResult;
    }

    chrome.runtime.onMessage.addListener((message: Msg, sender, sendResponse) => {
        if (message.Command === COMMANDS.WEB_REQUEST_COMPLETE) {
            const unreadCount = getUnreadCountByElement2();
            updateTitle(unreadCount);
            console.log("Message Received. Title updated to: ", document.title);
        }
    });
    interface mailUnit {
        folderUid: number;
        mailUid: number;
        isAnswered: number;
        isForwarded: number;
        isDeleted: number;
        isFlagged: number;
        isSeen: number;
        flagAttach: number;
        flagPriority: number;
        adrFrom: string;
        adrTo: string;
        adrFromTooltip: string;
        adrToTooltip: string;
        subject: string;
        msgSize: number;
        timeMillis: number;
        folderName: string | null;
        rcptReadCount: number;
        rcptTotalCount: number;
        timeRead: number;
        countryCode: string;
        countryName: string;
        countryEx: string;
        rnum: number;
        koreaMail: string;
        displaySize: string;
    }
    interface inboxFetchResult {
        contents: mailUnit[];
        resultUnseenMailCnt: number;
        totalCount: number;
    }
})();
