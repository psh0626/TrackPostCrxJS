import { COMMANDS, Msg } from "../lib/Message";
import "../lib/TimespanExtension";

declare global {
    interface Window {
        Handler?: {
            mailListGroupStore: {
                reload: () => void;
            };
        };
        FolderTreePanel?: {
            getNodeById: (id: string) => {
                ui: {
                    updateMsgNum: (num: number) => void;
                };
            };
        };
    }
}
void (() => {
    
    let isTime = true;
    const originalTitle = document.title;
    
    let folderId = getFolderId();
    if (!folderId) {
        console.log("Folder ID not found, will try again in 10 seconds");
        setTimeout(() => {
            folderId = getFolderId();
            console.log("New Folder ID: ", folderId);
        }, "10".toSeconds());
    }
    
    const elmCount = getUnreadCountByElement2();

    updateTitle(elmCount);

    setInterval(() => {
        void (async () => {
            const unreadCount = await getUnreadCountByFetch();
            updateTitle(unreadCount);
            isTime = false;
            console.log("Title updated to: ", document.title);
        })();
    }, "3".toMinutes());

    function getUnreadCountByElement2() {
        
        const unreadElm: HTMLLIElement | null | undefined = document.querySelector("tr.x-tree-action-id-1")?.querySelector("li.badge-m");
        if (!unreadElm) {
            console.log("Unread element not found");
            return getUnreadCountByElement();
        }

        const unreadCount = unreadElm.innerText === "" ? 0 : parseInt(unreadElm.innerText);
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
            }, "5".toSeconds());
            return;
        }
        if (unreadCount === 0) {
            document.title = `${originalTitle}`;
            console.log("Title updated to: ", originalTitle);
        } else {
            document.title = `(${unreadCount}) ${originalTitle}`;
            console.log("Title updated to: ", `(${unreadCount}) ${originalTitle}`);
        }
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
    function refreshUI(count: number) {
        if (count === 0) {
            if (!document.querySelector('#r3-maill-unseen-cnt-td')?.classList.contains('x-hidden')) {
                document.querySelector('#r3-maill-unseen-cnt-td')?.classList.add('x-hidden');
            }
        } else {
            if (document.querySelector('#r3-maill-unseen-cnt-td')?.classList.contains('x-hidden')) {
                document.querySelector('#r3-maill-unseen-cnt-td')?.classList.remove('x-hidden');
            }
            document.getElementById('r3-maill-unseen-cnt')!.innerHTML = count.toString();
        }

        window.FolderTreePanel?.getNodeById(folderId!).ui.updateMsgNum(count); // folder badge update
        window.Handler?.mailListGroupStore.reload(); // mail list update
    }
    async function getUnreadCountByFetch() {
        const fetch = await fecthInbox();
        if (!fetch) {
            console.log("Fetch failed");
            return 0;
        }

        const unreadCount = fetch.resultUnseenMailCnt;

        refreshUI(unreadCount);

        console.log("Unread count: ", unreadCount);
        return unreadCount;
    }
    async function fecthInbox() {
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
                            "accept": "*/*",
                            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                            "powered-by": "Crinity",
                        },
                        body: `start=0&limit=20&sort=timeMillis&dir=DESC&method=mailbox&allFolder=false&folderUid=${folderId}&folderType=0&filterField=&filterKey=&searchField=&searchWord=&periodStart=0&periodLimit=0&searchContent=&searchAdrTo=&searchAdrFrom=&searchAttachName=&searchSubjectWord=`,
                        method: "POST",
                        mode: "cors",
                        credentials: "include"
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
    interface mailUnit{        
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