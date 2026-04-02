import * as fs from "fs";
import * as path from "path";
import { checkCommand, runChecked } from "./process";

// make update manifest file
export function makeUpdateManifest({ appid, version, codebase }, outPath = path.join(__dirname, "updateManifest.xml")) {
    const manifestRaw = `<?xml version="1.0" encoding="UTF-8"?>
        <gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
            <app appid="${appid}">
                <updatecheck codebase="${codebase}" version="${version}" />
            </app>
        </gupdate>`;
    fs.writeFileSync(outPath, manifestRaw);
}

export function makeCrxFile({ srcDir, pemPath, outPath }) {
    const edgePath = `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`;
    checkCommand(edgePath) || (() => { throw new Error(`Microsoft Edge not found at path: ${edgePath}`); })();

    const args = `--pack-extension="${srcDir}" --pack-extension-key="${pemPath}" --no-message-box`;
    runChecked(edgePath, args);
    const crxPath = `${srcDir}.crx`;
}
// manifest update_url: "https://raw.githubusercontent.com/psh0626/TrackPostExtZip/main/updateManifest.json";
// release download https://github.com/psh0626/TrackPostExtZip/releases/download/v3.1.17/dist.zip