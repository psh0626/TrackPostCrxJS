#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { buildReleaseDraft } from "./lib/draft-builder.js";
import { ReleaseError, die } from "./lib/errors.js";
import { ensureUtf8NoBom, prompt, readJsonFile, updateVersionInFile } from "./lib/files.js";
import { captureCheckpoint, commitTagAndRelease, rollback } from "./lib/git.js";
import { checkGhAuthAndPermissions, checkReposClean, ghExec } from "./lib/github.js";
import { ansi, c, errorText, logDetail, logInfo, logSuccess, logWarning, releasePrefix } from "./lib/log.js";
import { hasUntouchedTemplatePlaceholders, isValidVersion, stripHtmlComments } from "./lib/notes.js";
import { checkCommand, runChecked } from "./lib/process.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceDir = join(__dirname, "..");
const packagePath = join(workspaceDir, "package.json");
const manifestPath = join(workspaceDir, "manifest.json");
const distDir = join(workspaceDir, "dist");
const publishDir = join(workspaceDir, "publish");
const prePublishDir = join(workspaceDir, "pre-publish");
const draftPath = join(prePublishDir, ".release-notes-draft.md");
const assetPath = join(prePublishDir, "dist.zip");

const pemPath = join(__dirname, "dist.pem");
const crxPath = join(workspaceDir, "dist.crx");
const crxToMovePath = join(publishDir, "dist.crx");
const updateManifestPath = join(publishDir, "updateManifest.xml");
const browserPath = `C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe`;
const extensionId = "ceaglmnlneffokklakakncncaholckem";
const codebaseUrl = "https://raw.githubusercontent.com/psh0626/TrackPostExtZip/main/dist.crx";
const updateManifestUrl = "https://raw.githubusercontent.com/psh0626/TrackPostExtZip/main/updateManifest.xml";

const releaseNoteSections = ["Added", "Changed", "Fixed"];

let rollbackState = null;

main().catch((err) => {
    if (rollbackState) rollback(rollbackState);
    if (err instanceof ReleaseError) {
        if (!err.logged) {
            if (err.exitCode === 0) {
                console.log(err.message);
            } else {
                console.error(errorText(err.message));
            }
        }
        process.exit(err.exitCode);
    }
    console.error(errorText(err.message || String(err)));
    process.exit(1);
});

async function main() {
    logInfo("Starting publish-release flow.");

    if (!checkCommand(browserPath)) {
        die(`Browser not found at path: ${browserPath}. Please update the 'browserPath' variable in the script. `);
    }

    if (!checkCommand("gh")) die("GitHub CLI 'gh' is required.");

    checkGhAuthAndPermissions(workspaceDir, publishDir);
    checkReposClean(workspaceDir, publishDir);

    if (!checkCommand("code")) {
        logWarning("Install via VS Code Command Palette: Shell Command: Install 'code' command in PATH");
        die("VS Code CLI 'code' is required.");
    }

    logDetail("workspace", workspaceDir);
    logDetail("distDir", distDir);
    logDetail("publishDir", publishDir);
    logDetail("draftPath", draftPath);

    ensureUtf8NoBom(packagePath);
    ensureUtf8NoBom(manifestPath);
    logSuccess("Verified package.json and manifest.json are UTF-8 without BOM.\n");

    rollbackState = {
        rootDir: workspaceDir,
        publishDir,
        checkpoint: captureCheckpoint(workspaceDir, publishDir),
        tag: null,
        draftPath,
        publishMainPushed: false,
        tagPushed: false,
        releaseCreated: false,
        rootMainPushed: false,
        rolledBack: false,
    };
    logSuccess("Rollback checkpoint set.");

    const packageJson = readJsonFile(packagePath);
    let currentVersion = packageJson.version;

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    const sigintHandler = () => {
        console.error(`\n${releasePrefix(ansi.yellow)} ${c("Interrupted by user (Ctrl+C).", ansi.bold, ansi.yellow)}`);
        rollback(rollbackState);
        process.exit(1);
    };
    rl.on("SIGINT", sigintHandler);
    process.on("SIGINT", sigintHandler);

    try {
        // --- 1. Version prompt ---
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

        // --- 2. Build ---
        console.log("\nRunning build...");
        runChecked("npm", "run build", { stdio: "inherit", encoding: "utf8", shell: true }, "Build failed.");
        logSuccess("Build completed successfully.");

        const tag = `v${currentVersion}`;
        rollbackState.tag = tag;
        const defaultTitle = `TrackPost ${tag}`;
        logDetail("releaseTag", tag);
        logDetail("releaseAsset", assetPath);

        if (!existsSync(assetPath)) die(`Asset not found: ${assetPath}`);
        logSuccess("Verified release asset exists.");

        if (!existsSync(distDir)) die(`Build output directory not found: ${distDir}`);

        // --- 3. Release title ---
        const titleRaw = await prompt(rl, `\nRelease title (Enter for default): `, defaultTitle);
        const title = titleRaw.trim() || defaultTitle;

        // --- 4. Fetch existing notes & commits from repo ---
        const {
            draftContent,
            existingBody,
            referenceBody,
            lastTag,
            lastCommitDate,
            sinceArg,
            commitLines,
            commitRangeTitle,
        } = buildReleaseDraft({ tag, publishDir, workspaceDir, sections: releaseNoteSections });

        logDetail("existingReleaseNotesFound", existingBody ? "yes" : "no");
        logDetail("referenceReleaseNotesFound", referenceBody ? "yes" : "no");
        logDetail("lastTag", lastTag || "<none>");
        logDetail("publishRepoLastCommitDate", lastCommitDate || "<none>");
        logDetail("gitLogSinceArg", sinceArg);
        logDetail("commitSummaryLength", String(commitLines.split(/\r?\n/).length));
        logDetail("commitRangeTitle", commitRangeTitle);

        writeFileSync(draftPath, draftContent, "utf8");
        logSuccess("Release note draft written.");

        // --- 5. Open in VS Code ---
        console.log("\nOpening release notes in VS Code. Save and close to continue...");
        runChecked(
            "code",
            ["-r", "--wait", draftPath],
            { cwd: workspaceDir, stdio: "ignore", encoding: "utf8" },
            "Failed to open VS Code editor.",
        );
        logSuccess("Release note editor closed.\n");

        // --- 6. Validate notes ---
        const baselineNotes = draftContent.trim();
        const notes = readFileSync(draftPath, "utf8").trim();
        if (!notes) die("Release notes are empty.");
        if (notes === baselineNotes) {
            die("Release notes were not edited. Please update the draft before closing VS Code.");
        }
        if (hasUntouchedTemplatePlaceholders(notes)) {
            die("Template placeholders are still present (for example '-'). Fill out Added/Changed/Fixed sections.");
        }
        logDetail("finalReleaseNotesLength", String(notes.split(/\r?\n/).length));
        logSuccess("Release notes validation passed.\n");

        // Strip HTML comments for a cleaner git commit message
        const commitBody = stripHtmlComments(notes);

        // --- 7. Create or update GitHub release ---
        const releaseExists = ghExec(`release view ${tag} --json tagName`, publishDir) !== null;
        logDetail("releaseAlreadyExists", releaseExists ? "yes" : "no");

        if (releaseExists) {
            const confirm = await prompt(
                rl,
                c(
                    `Release ${tag} already exists. Do you want to recreate it with the new notes and asset? (y/n): `,
                    ansi.red,
                ),
                "y",
            );
            if (confirm.toLowerCase() !== "y") {
                throw new ReleaseError("Release update cancelled by user.", { exitCode: 0, logged: false });
            }

            console.log(`\nRecreating release ${tag} and refreshing source archives...`);

            runChecked(
                "gh",
                ["release", "delete", tag, "--yes"],
                { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
                "Failed to delete existing release.",
            );

            runChecked(
                "git",
                ["reset", "HEAD~1"],
                { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
                "Failed to rewind publish repo before recreating release.",
            );

            commitTagAndRelease({
                publishDir,
                distDir,
                assetPath,
                tag,
                title,
                commitBody,
                draftPath,
                force: true,
                rollbackState,
            });
        } else {
            const remoteTags = runChecked(
                "git",
                ["ls-remote", "--tags", "origin"],
                { cwd: publishDir },
                "Failed to list remote tags.",
            ).stdout.trim();
            const tagExistsRemotely = remoteTags.split("\n").some((line) => line.endsWith(`refs/tags/${tag}`));
            logDetail("tagExistsInRemote", tagExistsRemotely ? "yes" : "no");

            if (tagExistsRemotely) {
                runChecked("git", ["tag", "-d", tag], { cwd: publishDir }, "Failed to delete local tag.");
                runChecked(
                    "git",
                    ["push", "--delete", "origin", tag],
                    { cwd: publishDir },
                    "Failed to delete remote tag.",
                );
            }

            console.log(`\nCreating new release ${tag}...`);
            commitTagAndRelease({
                publishDir,
                distDir,
                assetPath,
                tag,
                title,
                commitBody,
                draftPath,
                force: false,
                rollbackState,
            });
        }

        // --- 8. Sync root repository ---
        logInfo("Syncing root repository after publish release update.");
        runChecked(
            "git",
            ["add", "publish", "manifest.json", "package.json"],
            { cwd: workspaceDir },
            "Failed to stage root repo release changes.",
        );
        runChecked(
            "git",
            ["commit", "-m", "Update submodule reference"],
            { cwd: workspaceDir },
            "Failed to commit root repo release changes.",
        );
        runChecked(
            "git",
            ["push", "origin", "main"],
            { cwd: workspaceDir, stdio: "inherit", encoding: "utf8" },
            "Failed to push root repo main branch.",
        );
        rollbackState.rootMainPushed = true;

        console.log(`\n${releasePrefix(ansi.green)} ${c("Release flow completed.", ansi.bold, ansi.green)}`);

        // Clean up draft on success only; on error the file is left for inspection
        if (existsSync(draftPath)) rmSync(draftPath);
    } finally {
        rl.close();
        process.off("SIGINT", sigintHandler);
    }
}
