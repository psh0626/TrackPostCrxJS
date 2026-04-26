import { CMD, MSG } from "@/common/message-hub/Message";

const currentUrl = location.href;
console.log(`[Github Script] Current URL: ${currentUrl}`);
if (currentUrl.includes("psh0626")) {
    window.addEventListener("hashchange", (e) => {
        doParams(e.newURL);
    });
    doParams(currentUrl);
}

function doParams(url: string) {
    const params = new URL(url).searchParams;
    if (params.get("focus") === "readme") {
        document.querySelector("div[itemtype*='abstract']")?.scrollIntoView({ behavior: "smooth" });
    } else if (params.get("reload") === "true") {
        console.log("[Github Script] Github page extension reload requested, extension reloads..");
        new MSG(CMD.RELOAD_EXTENSION).fromContent.toService();
    }
    window.history.replaceState(null, "", window.location.pathname);
}
