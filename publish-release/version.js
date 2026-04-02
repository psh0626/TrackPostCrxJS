import { dirname, join } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { die } from "./lib/errors.js";
import { ensureUtf8NoBom, prompt, readJsonFile, updateVersionInFile } from "./lib/files.js";
import { ansi, c, logDetail, logSuccess, logWarning } from "./lib/log.js";
import { isValidVersion } from "./lib/notes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceDir = join(__dirname, "..");
const packagePath = join(workspaceDir, "package.json");
const manifestPath = join(workspaceDir, "manifest.json");

main();

async function main() {
    ensureUtf8NoBom(packagePath);
    ensureUtf8NoBom(manifestPath);
    logSuccess("Verified package.json and manifest.json are UTF-8 without BOM.");

    const packageJson = readJsonFile(packagePath);
    let currentVersion = packageJson.version;
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    const sigintHandler = () => {
        console.error(`\n${c("Interrupted by user (Ctrl+C).", ansi.bold, ansi.yellow)}`);
        process.exit(1);
    };

    rl.on("SIGINT", sigintHandler);
    process.on("SIGINT", sigintHandler);

    console.log(`\n${c("Current version", ansi.bold)}: ${c(currentVersion, ansi.bold, ansi.green)}`);

    const newVersion = (await prompt(rl, "Enter version: ", currentVersion)).trim();
    if (!newVersion) die("Version cannot be empty.");
    if (!isValidVersion(newVersion)) die(`Invalid version format: "${newVersion}". Expected: major.minor.patch`);

    if (newVersion === currentVersion) {
        logWarning("Version unchanged.");
    } else {
        currentVersion = newVersion;
        updateVersionInFile(packagePath, currentVersion);
        updateVersionInFile(manifestPath, currentVersion);
        logSuccess(`Updated version to ${currentVersion} in package.json and manifest.json`);
    }

    logDetail("selectedVersion", currentVersion);
    rl.close();
}
