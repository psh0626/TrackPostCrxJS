import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { die } from "./errors.js";
import { readJsonFile } from "./files.js";
import { checkCommand, runChecked } from "./process.js";

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceDir = path.join(__dirname, "..");
const publishDir = path.join(workspaceDir, "publish");
const distDir = path.join(workspaceDir, "dist");
const packageJsonPath = path.join(workspaceDir, "package.json");

const pemPath = path.join(__dirname, "dist.pem");
const crxToMovePath = path.join(publishDir, "dist.crx");
const updateManifestPath = path.join(publishDir, "updateManifest.xml");
const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const extensionId = "ceaglmnlneffokklakakncncaholckem";
const codebaseUrl = "https://raw.githubusercontent.com/psh0626/TrackPostExtZip/main/dist.crx";

export function createCrxAndUpdateManifest() {
    if (!fs.existsSync(browserPath)) {
        die(`Browser not found at path: ${browserPath}. Please update the 'browserPath' variable in the script. `);
    }

    const packageJson = readJsonFile(packageJsonPath);

    makeCrxFile(browserPath, { srcDir: distDir, pemPath: pemPath, outPath: crxToMovePath });
    makeUpdateManifest({ appid: extensionId, version: packageJson.version, codebase: codebaseUrl }, updateManifestPath);
}

// make update manifest file
export function makeUpdateManifest({ appid, version, codebase }, outPath) {
    const manifestRaw = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">`,
        `  <app appid="${appid}">`,
        `    <updatecheck codebase="${codebase}" version="${version}" />`,
        `  </app>`,
        `</gupdate>`,
    ].join("\n");
    fs.writeFileSync(outPath, manifestRaw);
}

export function makeCrxFile(browserPath, { srcDir, pemPath, outPath }) {
    const args = [`--pack-extension=${srcDir}`, `--pack-extension-key=${pemPath}`];
    runChecked(browserPath, args);
    const crxPath = `${path.join(path.join(srcDir, ".."), path.basename(srcDir) + ".crx")}`;
    if (!fs.existsSync(crxPath)) {
        throw new Error(`Failed to create .crx file at expected location: ${crxPath}`);
    }
    fs.renameSync(crxPath, outPath);
}
