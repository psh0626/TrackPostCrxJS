import InjectUtil from "./inject-dom/injectUtil";
import NewGcssScript from "./newGcssScript.ts";
import OldGcssScript from "./oldGcssScript.tsx";

const elementFound = await InjectUtil.waitUntil(() => {
    const oldGcss = document.querySelector("#taskFolders");
    const newGcss = document.querySelector(".MuiTab-root");
    return oldGcss || newGcss;
});

if (!elementFound) {
    console.log("[GCSS LOADER] Could not find the element.");
}

const isOldGcss = elementFound?.id === "taskFolders";
if (isOldGcss) {
    console.log("[GCSS LOADER] Old GCSS detected. Loading old GCSS Script.");
    OldGcssScript();
} else {
    console.log("[GCSS LOADER] New GCSS detected. Loading new GCSS Script.");
    NewGcssScript();
}
