(() => {
    const font = new FontFace(
        "Pretendard Variable",
        `url(${chrome.runtime.getURL("fonts/PretendardVariable.woff2")}) format('woff2')`,
        { style: "normal", weight: "300 900" },
    );
    font.load()
        .then((loadedFont) => {
            document.fonts.add(loadedFont);
            console.log("Pretendard Variable font loaded and added to document.");
        })
        .catch((error) => {
            console.error("Failed to load Pretendard Variable font:", error);
        });
})();
