import { dirname, join } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { die } from "./lib/errors.js";
import { ensureUtf8NoBom, prompt, readJsonFile, updateVersionInFile } from "./lib/files.js";
import { ansi, c } from "./lib/log.js";
import { isValidVersion } from "./lib/notes.js";
import { exec } from "./lib/process.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceDir = join(__dirname, "..");
const packagePath = join(workspaceDir, "package.json");
const manifestPath = join(workspaceDir, "manifest.json");

function buildPrefix(color) {
    return `${c("[", ansi.dim)}${c("Build", ansi.bold, color)}${c("]", ansi.dim)}`;
}

function logBuildSuccess(message) {
    console.log(`${buildPrefix(ansi.green)} ${c(message, ansi.green)}`);
}

function logBuildWarning(message) {
    console.log(`${buildPrefix(ansi.yellow)} ${c(message, ansi.yellow)}`);
}

function logBuildDetail(label, value) {
    console.log(`${buildPrefix(ansi.cyan)} ${c(label, ansi.bold, ansi.white)}: ${c(value, ansi.cyan)}`);
}

main();

async function main() {
    ensureUtf8NoBom(packagePath);
    ensureUtf8NoBom(manifestPath);
    logBuildSuccess("Verified package.json and manifest.json are UTF-8 without BOM.");

    const packageJson = readJsonFile(packagePath);
    let currentVersion = packageJson.version;
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    const sigintHandler = () => {
        console.error(`\n${buildPrefix(ansi.yellow)} ${c("Interrupted by user (Ctrl+C).", ansi.bold, ansi.yellow)}`);
        process.exit(1);
    };

    rl.on("SIGINT", sigintHandler);
    process.on("SIGINT", sigintHandler);

    console.log(
        `\n${buildPrefix(ansi.blue)} ${c("Current version", ansi.bold)}: ${c(currentVersion, ansi.bold, ansi.green)}`,
    );

    const newVersion = (
        await prompt(rl, `${buildPrefix(ansi.blue)} ${c("Enter version", ansi.bold)}: `, currentVersion)
    ).trim();
    if (!newVersion) die("Version cannot be empty.");
    if (!isValidVersion(newVersion)) die(`Invalid version format: "${newVersion}". Expected: major.minor.patch`);

    if (newVersion === currentVersion) {
        logBuildWarning(`\n${c("Version unchanged.", ansi.bold, ansi.yellow)}`);
    } else {
        currentVersion = newVersion;
        updateVersionInFile(packagePath, currentVersion);
        updateVersionInFile(manifestPath, currentVersion);
        logBuildSuccess(
            `\nUpdated version from ${c(currentVersion, ansi.bold, ansi.white)} to ${c(currentVersion, ansi.bold, ansi.blue)} in package.json and manifest.json`,
        );
        exec("git", ["add", "."], { cwd: workspaceDir, stdio: "pipe" });
        exec("git", ["commit", "-m", `Update version to ${currentVersion}`], { cwd: workspaceDir, stdio: "pipe" });
    }

    logBuildDetail("selectedVersion", currentVersion);
    rl.close();
}
