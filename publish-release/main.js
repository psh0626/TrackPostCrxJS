#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceDir = join(__dirname, "..");

import { ReleaseError, die } from "./lib/errors.js";
import { ensureUtf8NoBom, prompt, readJsonFile, updateVersionInFile } from "./lib/files.js";
import { captureCheckpoint, commitTagAndRelease, rollback } from "./lib/git.js";
import { checkGhAuthAndPermissions, checkReposClean, ghExec } from "./lib/github.js";
import { ansi, c, errorText, logDetail, logInfo, logSuccess, logWarning, releasePrefix } from "./lib/log.js";
import {
    buildMissingSections,
    hasUntouchedTemplatePlaceholders,
    isValidVersion,
    stripHtmlComments,
} from "./lib/notes.js";
import { checkCommand, exec, runChecked } from "./lib/process.js";

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

    if (!checkCommand("gh")) die("GitHub CLI 'gh' is required.");

    const publishDir = join(workspaceDir, "publish");
    checkGhAuthAndPermissions(workspaceDir, publishDir);
    checkReposClean(workspaceDir, publishDir);

    if (!checkCommand("code")) {
        logWarning("Install via VS Code Command Palette: Shell Command: Install 'code' command in PATH");
        die("VS Code CLI 'code' is required.");
    }

    const packagePath = join(workspaceDir, "package.json");
    const manifestPath = join(workspaceDir, "manifest.json");
    const distDir = join(workspaceDir, "dist");
    const prePublishDir = join(workspaceDir, "pre-publish");
    const draftPath = join(prePublishDir, ".release-notes-draft.md");
    const assetPath = join(prePublishDir, "dist.zip");

    logDetail("workspace", workspaceDir);
    logDetail("distDir", distDir);
    logDetail("publishDir", publishDir);
    logDetail("draftPath", draftPath);

    ensureUtf8NoBom(packagePath);
    ensureUtf8NoBom(manifestPath);
    logSuccess("Verified package.json and manifest.json are UTF-8 without BOM.");

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
        const existingBodyRaw = ghExec(`release view ${tag} --json body --jq .body`, publishDir);
        const latestBodyRaw = ghExec("release view --json body --jq .body", publishDir);
        const existingBody = stripHtmlComments(existingBodyRaw);
        const latestBody = stripHtmlComments(latestBodyRaw);
        logDetail("existingReleaseNotesFound", existingBody ? "yes" : "no");
        logDetail("latestReleaseNotesFound", latestBody ? "yes" : "no");

        const lastTagResult = exec("git", ["describe", "--tags", "--abbrev=0"], { cwd: workspaceDir });
        const lastTag = lastTagResult.status === 0 ? lastTagResult.stdout.trim() : "";
        logDetail("lastTag", lastTag || "<none>");

        const lastCommitInPublish = exec("git", ["log", "-n", "1", "--pretty=format:%ad"], { cwd: publishDir });
        const lastCommitDate = lastCommitInPublish.status === 0 ? lastCommitInPublish.stdout.trim() : null;
        const sinceArg = lastCommitDate ? `--since=${lastCommitDate}` : `--since=${lastTag}`;
        logDetail("publishRepoLastCommitDate", lastCommitDate || "<none>");
        logDetail("gitLogSinceArg", sinceArg);

        const log = exec(
            "git",
            [
                "log",
                sinceArg,
                "--pretty=format:Author: %an%nDate: %ad%n%s%n",
                "--date=format:%Y-%m-%d %I:%M:%S %p",
                "--grep=Update submodule reference",
                "--invert-grep",
            ],
            { cwd: workspaceDir },
        );
        const commitLines = log.stdout.trim() || "- No recent commits found.";
        logDetail("commitSummaryLength", String(commitLines.split(/\r?\n/).length));

        const commitRangeTitle = `commits since ${lastCommitDate ? new Date(lastCommitDate).toLocaleString() : lastTag}`;
        logDetail("commitRangeTitle", commitRangeTitle);

        const commitSummaryBlock = [
            `<!-- Commit Summary: ${commitRangeTitle} -->`,
            "<!--",
            "",
            commitLines,
            "",
            "-->",
        ].join("\n");

        const template = ["## Added", "- ", "", "## Changed", "- ", "", "## Fixed", "- ", ""].join("\n");

        const referenceBlock = latestBody
            ? ["", "<!-- Reference: latest release note -->", "<!--", "", latestBody, "", "-->"].join("\n")
            : "";

        // --- 5. Build draft content ---
        let draftContent;
        if (existingBody) {
            const missingSections = buildMissingSections(existingBody);
            draftContent = [
                "<!-- Existing release note for this tag (editable) -->",
                "",
                existingBody,
                ...(missingSections ? ["", "<!-- Missing sections added below -->", missingSections] : []),
                "",
                referenceBlock,
                commitSummaryBlock,
            ].join("\n");
        } else {
            draftContent = [template, commitSummaryBlock, referenceBlock].join("\n");
        }

        writeFileSync(draftPath, draftContent, "utf8");
        logSuccess("Release note draft written.");

        // --- 6. Open in VS Code ---
        console.log("\nOpening release notes in VS Code. Save and close to continue...");
        runChecked(
            "code",
            ["-r", "--wait", draftPath],
            { cwd: workspaceDir, stdio: "ignore", encoding: "utf8" },
            "Failed to open VS Code editor.",
        );
        logSuccess("Release note editor closed.");

        // --- 7. Validate notes ---
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
        logSuccess("Release notes validation passed.");

        // Strip HTML comments for a cleaner git commit message
        const commitBody = stripHtmlComments(notes);

        // --- 8. Create or update GitHub release ---
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

        // --- 9. Sync root repository ---
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
