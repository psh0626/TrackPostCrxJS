#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { createCrxAndUpdateManifest } from "./lib/crx-file.js";
import { buildReleaseDraft } from "./lib/draft-builder.js";
import { ReleaseError, die } from "./lib/errors.js";
import { prompt, readJsonFile } from "./lib/files.js";
import { captureCheckpoint, commitTagAndRelease, rollback } from "./lib/git.js";
import { checkGhAuthAndPermissions, checkReposClean, ghExec } from "./lib/github.js";
import { ansi, c, errorText, logDetail, logInfo, logSuccess, logWarning, releasePrefix } from "./lib/log.js";
import { hasUntouchedTemplatePlaceholders, stripHtmlComments } from "./lib/notes.js";
import { checkCommand, runChecked } from "./lib/process.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceDir = join(__dirname, "..");
const packagePath = join(workspaceDir, "package.json");
const publishDir = join(workspaceDir, "publish");
const prePublishDir = join(workspaceDir, "pre-publish");
const draftPath = join(prePublishDir, ".release-notes-draft.md");
const assetPath = join(prePublishDir, "dist.zip");
const crxAssetPath = join(publishDir, "dist.crx");
const installScriptAssetPath = join(publishDir, "TrackPost-install.bat");
const uninstallScriptAssetPath = join(publishDir, "TrackPost-uninstall.bat");

const releaseAssetPaths = [assetPath, crxAssetPath, installScriptAssetPath, uninstallScriptAssetPath];

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
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    const proceed = (
        await prompt(rl, `\n${releasePrefix(ansi.blue)} ${c("Start publishing release? (y/n): ", ansi.bold)}`, "y")
    ).toLowerCase();
    if (proceed !== "y") {
        console.log("Release flow cancelled by user.");
        process.exit(0);
    }

    logInfo("Starting publish-release flow.\n");

    if (!checkCommand("gh")) die("GitHub CLI 'gh' is required.");

    checkGhAuthAndPermissions(workspaceDir, publishDir);

    checkReposClean(workspaceDir, publishDir);

    if (!checkCommand("code")) {
        logWarning("Install via VS Code Command Palette: Shell Command: Install 'code' command in PATH");
        die("VS Code CLI 'code' is required.");
    }

    logDetail("workspace", workspaceDir);
    logDetail("publishDir", publishDir);
    logDetail("draftPath", draftPath);
    console.log("");

    logInfo("Setting up rollback checkpoint.");
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
    logSuccess("Rollback checkpoint set.\n");

    const sigintHandler = () => {
        console.error(`\n${releasePrefix(ansi.yellow)} ${c("Interrupted by user (Ctrl+C).", ansi.bold, ansi.yellow)}`);
        rollback(rollbackState);
        process.exit(1);
    };

    rl.on("SIGINT", sigintHandler);
    process.on("SIGINT", sigintHandler);

    const packageJson = readJsonFile(packagePath);
    const currentVersion = packageJson.version;

    try {
        logInfo("Creating CRX file and updating manifest for release...");
        createCrxAndUpdateManifest();
        logSuccess(`Created dist.crx file and updateManifest.xml to version ${currentVersion}\n`);

        // --- Release title ---

        releaseAssetPaths.forEach((asset, idx) => {
            logDetail(`releaseAsset ${idx + 1}`, asset);
            if (!existsSync(asset)) die(`Asset not found: ${asset}`);
        });
        logSuccess("Verified release assets exist.\n");

        const tag = `v${currentVersion}`;
        rollbackState.tag = tag;
        const defaultTitle = `TrackPost ${tag}`;
        logDetail("releaseTag", tag);
        const titleRaw = await prompt(
            rl,
            `${releasePrefix(ansi.blue)} ${c("Release title (Enter for default): ", ansi.bold)}`,
            defaultTitle,
        );
        const title = titleRaw.trim() || defaultTitle;

        // --- Fetch existing notes & commits from repo ---
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

        console.log("");
        logDetail("existingReleaseNotesFound", existingBody ? "yes" : "no");
        logDetail("referenceReleaseNotesFound", referenceBody ? "yes" : "no");
        logDetail("lastTag", lastTag || "<none>");
        logDetail("publishRepoLastCommitDateFallback", lastCommitDate || "<none>");
        logDetail(
            "commitRangeSource",
            lastTag ? `tag:${lastTag}` : lastCommitDate ? `publish-last-commit:${lastCommitDate}` : "repo-history",
        );
        logDetail("gitLogRange", sinceArg || "<none>");
        logDetail("commitSummaryLength", String(commitLines.split(/\r?\n/).length));
        logDetail("commitRangeTitle", commitRangeTitle);

        writeFileSync(draftPath, draftContent, "utf8");
        logSuccess("Release note draft written.\n");

        // --- 5. Open in VS Code ---
        logInfo("Opening release notes in VS Code. Save and close to continue...");
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
                assetPaths: releaseAssetPaths,
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
                assetPaths: releaseAssetPaths,
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
        runChecked("git", ["add", "publish"], { cwd: workspaceDir }, "Failed to stage root repo release changes.");
        runChecked(
            "git",
            ["commit", "-m", "Update submodule reference"],
            { cwd: workspaceDir },
            "Failed to commit root repo release changes.",
        );
        runChecked("git", ["push", "origin", "main"], { cwd: workspaceDir }, "Failed to push root repo main branch.");
        rollbackState.rootMainPushed = true;

        console.log(`\n${releasePrefix(ansi.green)} ${c("Release flow completed.", ansi.bold, ansi.green)}`);

        // Clean up draft on success only; on error the file is left for inspection
        if (existsSync(draftPath)) rmSync(draftPath);
    } finally {
        rl.close();
        process.off("SIGINT", sigintHandler);
    }
}
