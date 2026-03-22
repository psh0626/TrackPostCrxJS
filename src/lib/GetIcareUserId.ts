import { CMD, MSG, sendRequest } from "../background/message-hub/Message";

export default async function getIcareUserId() {
    let user_id = "";
    user_id = await loadIcareUserId();
    if (user_id) {
        console.log("icare user id loaded from local storage:", user_id);
        return user_id;
    }
    console.log("icare user id failed to load (there was nothing stored)");
    const home = document
        .querySelector(
            "body > div.content-wrapper > main > div > div.row.row-wrap.dashboard-content > div:nth-child(3) > div > div > div:nth-child(1) > div > table > tbody > tr:nth-child(1) > td:nth-child(1) > a",
        )
        ?.getAttribute("href");

    if (home) {
        const param = new URLSearchParams(home);
        user_id = param.get("responsibleUser")!;
    } else {
        const optionArr = Array.from(
            document.querySelectorAll("select[name='responsibleUser'] option"),
        ) as HTMLOptionElement[];
        const me_option = optionArr.find((e) => e.text === "Me");
        if (me_option) {
            user_id = me_option.value;
        }
    }
    if (user_id) {
        saveIcareUserId(user_id);
    }
    return user_id;
}

function saveIcareUserId(user_id: string) {
    void chrome.runtime.sendMessage(new MSG(CMD.SAVE_ICARE_USER_ID, user_id));
}
async function loadIcareUserId() {
    console.log("requesting local storage for icare user id");
    return await sendRequest<string>(new MSG(CMD.LOAD_ICARE_USER_ID));
}
