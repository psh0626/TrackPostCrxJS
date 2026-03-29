#!/usr/bin/env node
import { spawnSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ansi = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
};

function c(text, ...styles) {
    return `${styles.join("")}${text}${ansi.reset}`;
}

function stripAnsi(text) {
    return text.replace(/\x1B\[[0-9;]*m/g, "");
}

function releasePrefix(color) {
    return `${c("[", ansi.dim)}${c("release", ansi.bold, color)}${c("]", ansi.dim)}`;
}

function errorText(message) {
    return c(`Error: ${message}`, ansi.bold, ansi.red);
}

function formatCommand(cmd, args = "") {
    const argList =
        typeof args === "string"
            ? args
            : args.map((arg) => (String(arg).includes(" ") ? `"${arg}"` : String(arg))).join(" ");
    return argList ? `${cmd} ${argList}` : cmd;
}

function logInfo(message) {
    console.log(`${releasePrefix(ansi.blue)} ${message}`);
}

function logSuccess(message) {
    console.log(`${releasePrefix(ansi.green)} ${c(message, ansi.green)}`);
}

function logDetail(label, value) {
    console.log(`${releasePrefix(ansi.cyan)} ${c(label, ansi.bold, ansi.white)}: ${c(value, ansi.cyan)}`);
}

function logWarning(message) {
    console.log(`${releasePrefix(ansi.yellow)} ${c(message, ansi.yellow)}`);
}

function exec(cmd, args = "", options = {}) {
    const { cwd, encoding = "utf8", stdio = "pipe", shell = false } = options;
    const execCmd = process.platform === "win32" && cmd === "npm" ? "npm.cmd" : cmd;

    const argList =
        typeof args === "string"
            ? (args.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((x) => x.replace(/^['"]|['"]$/g, ""))
            : args;

    return spawnSync(execCmd, argList, { cwd, encoding, stdio, shell });
}

function runChecked(cmd, args = "", options = {}, errorMessage = "Command failed.") {
    const commandText = formatCommand(cmd, args);
    const cwdText = options.cwd || process.cwd();

    logInfo(`Running command: ${commandText}`);
    logDetail("cwd", cwdText);

    const result = exec(cmd, args, options);

    if (result.status !== 0) {
        if (result.error) {
            console.error(`${releasePrefix(ansi.red)} ${c(`Command spawn error: ${result.error.message}`, ansi.red)}`);
        }
        if (typeof result.stdout === "string" && result.stdout.trim()) {
            console.error(
                `${releasePrefix(ansi.magenta)} ${c("stdout:", ansi.bold, ansi.magenta)}\n${result.stdout.trim()}`,
            );
        }
        if (typeof result.stderr === "string" && result.stderr.trim()) {
            console.error(`${releasePrefix(ansi.red)} ${c("stderr:", ansi.bold, ansi.red)}\n${result.stderr.trim()}`);
        }
        console.error(errorText(errorMessage));
        process.exit(1);
    }

    logSuccess(`Command completed: ${commandText}`);
    return result;
}

function checkCommand(cmd) {
    if (process.platform === "win32") {
        const result = exec("where", cmd);
        return result.status === 0;
    }
    const result = exec("which", cmd);
    return result.status === 0;
}

function prompt(rl, message, prefill = "") {
    return new Promise((resolve) => {
        rl.question(c(message, ansi.bold), (answer) => resolve(stripAnsi(answer)));
        if (prefill) rl.write(c(prefill, ansi.cyan, ansi.bold));
    });
}

function readJsonFile(filePath) {
    const raw = readFileSync(filePath, "utf8");
    const sanitized = raw.replace(/^\uFEFF/, "");
    return JSON.parse(sanitized);
}

function ensureUtf8NoBom(filePath) {
    const raw = readFileSync(filePath, "utf8");
    const sanitized = raw.replace(/^\uFEFF/, "");
    if (raw !== sanitized) {
        writeFileSync(filePath, sanitized, "utf8");
    }
}

function updateVersionInFile(filePath, newVersion) {
    const content = readFileSync(filePath, "utf8");
    const updated = content.replace(/"version"\s*:\s*"[^"]*"/, `"version": "${newVersion}"`);
    writeFileSync(filePath, updated, "utf8"); // Node.js fs writes UTF-8 without BOM
}

function ghExec(command, cwd) {
    const result = exec("gh", command, { cwd });
    if (result.status === 0) return result.stdout.trim();
    return null;
}

function stripHtmlComments(text) {
    if (!text) return "";
    return text
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function hasSection(body, sectionName) {
    if (!body) return false;
    const re = new RegExp(`^##\\s*${sectionName}\\b`, "mi");
    return re.test(body);
}

function buildMissingSections(existingBody) {
    const sections = ["Added", "Changed", "Fixed"];
    const missing = sections.filter((name) => !hasSection(existingBody, name));
    if (missing.length === 0) return "";
    return missing.map((name) => `## ${name}\n- `).join("\n");
}

function hasUntouchedTemplatePlaceholders(notes) {
    const lines = notes.split(/\r?\n/).map((line) => line.trim());
    const sectionIndices = lines
        .map((line, idx) => ({ line, idx }))
        .filter((x) => x.line === "## Added" || x.line === "## Changed" || x.line === "## Fixed")
        .map((x) => x.idx);

    return sectionIndices.some((idx) => lines[idx + 1] === "-");
}

function copyAllFiles(srcDir, destDir) {
    const entries = readdirSync(srcDir, { withFileTypes: true });
    entries.forEach((entry) => {
        const srcPath = join(srcDir, entry.name);
        const destPath = join(destDir, entry.name);
        if (entry.isDirectory()) {
            if (!existsSync(destPath)) mkdirSync(destPath);
            copyAllFiles(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    });
}

async function main() {
    logInfo("Starting publish-release flow.");

    if (!checkCommand("gh")) {
        console.error(errorText("GitHub CLI 'gh' is required."));
        process.exit(1);
    }
    if (!checkCommand("code")) {
        console.error(errorText("VS Code CLI 'code' is required."));
        console.error(
            c("Install via VS Code Command Palette: Shell Command: Install 'code' command in PATH", ansi.yellow),
        );
        process.exit(1);
    }

    const packagePath = join(__dirname, "package.json");
    const manifestPath = join(__dirname, "manifest.json");

    const distDir = join(__dirname, "dist");
    const prePublishDir = join(__dirname, "pre-publish");
    const publishDir = join(__dirname, "publish");
    const draftPath = join(prePublishDir, ".release-notes-draft.md");

    logDetail("workspace", __dirname);
    logDetail("distDir", distDir);
    logDetail("publishDir", publishDir);
    logDetail("draftPath", draftPath);

    ensureUtf8NoBom(packagePath);
    ensureUtf8NoBom(manifestPath);
    logSuccess("Verified package.json and manifest.json are UTF-8 without BOM.");

    const packageJson = readJsonFile(packagePath);
    let currentVersion = packageJson.version;

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    try {
        // --- 1. Version prompt ---
        console.log(`\n${c("Current version", ansi.bold)}: ${c(currentVersion, ansi.bold, ansi.green)}`);

        const newVersion = await prompt(rl, "Enter version: ", currentVersion);
        if (!newVersion.trim()) {
            console.error(errorText("Version cannot be empty."));
            process.exit(1);
        }
        if (newVersion.trim() === currentVersion) {
            logWarning("Version unchanged.");
        } else {
            currentVersion = newVersion.trim();
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
        const defaultTitle = `TrackPost ${tag}`;
        const assetPath = join(prePublishDir, "dist.zip");
        logDetail("releaseTag", tag);
        logDetail("releaseAsset", assetPath);

        if (!existsSync(assetPath)) {
            console.error(errorText(`Asset not found: ${assetPath}`));
            process.exit(1);
        }
        logSuccess("Verified release asset exists.");

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

        const lastTagResult = exec("git", "describe --tags --abbrev=0", { cwd: __dirname });
        const lastTag = lastTagResult.status === 0 ? lastTagResult.stdout.trim() : "";
        logDetail("lastTag", lastTag || "<none>");

        let commitLines;
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
            { cwd: __dirname },
        );
        commitLines = log.stdout.trim() || "- No recent commits found.";
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
            `-r --wait "${draftPath}"`,
            {
                cwd: __dirname,
                stdio: "ignore",
                encoding: "utf8",
                shell: false,
            },
            "Failed to open VS Code editor.",
        );
        logSuccess("Release note editor closed.");

        // --- 7. Validate notes ---
        const baselineNotes = draftContent.trim();
        const notes = readFileSync(draftPath, "utf8").trim();
        if (!notes) {
            console.error(errorText("Release notes are empty."));
            process.exit(1);
        }
        if (notes === baselineNotes) {
            console.error(errorText("Release notes were not edited. Please update the draft before closing VS Code."));
            process.exit(1);
        }
        if (hasUntouchedTemplatePlaceholders(notes)) {
            console.error(
                errorText(
                    "Template placeholders are still present (for example '-'). Fill out Added/Changed/Fixed sections.",
                ),
            );
            process.exit(1);
        }
        logDetail("finalReleaseNotesLength", String(notes.split(/\r?\n/).length));
        logSuccess("Release notes validation passed.");

        // --- 8. Create or update GitHub release ---
        const releaseExists = ghExec(`release view ${tag} --json tagName`, publishDir) !== null;
        logDetail("releaseAlreadyExists", releaseExists ? "yes" : "no");

        if (releaseExists) {
            console.log(`\nRecreating release ${tag} and refreshing source archives...`);

            runChecked(
                "gh",
                `release delete ${tag} --yes`,
                {
                    cwd: publishDir,
                    stdio: "inherit",
                    encoding: "utf8",
                },
                "Failed to delete existing release.",
            );

            runChecked(
                "git",
                "reset HEAD~1",
                { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
                "Failed to rewind publish repo before recreating release.",
            );

            logInfo("Copying build output into publish repository.");
            copyAllFiles(distDir, publishDir);
            runChecked(
                "git",
                "add .",
                { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
                "Failed to stage publish repo changes.",
            );
            runChecked(
                "git",
                ["commit", "-m", `release ${title}`, "-m", notes],
                {
                    cwd: publishDir,
                    stdio: "inherit",
                    encoding: "utf8",
                },
                "Failed to commit publish repo release changes.",
            );
            runChecked(
                "git",
                "push origin main --force",
                { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
                "Failed to force-push publish repo main branch.",
            );

            const headResult = runChecked(
                "git",
                ["rev-parse", "HEAD"],
                { cwd: publishDir },
                "Failed to resolve latest commit SHA in publish repo.",
            );
            const headSha = headResult.stdout.trim();
            logDetail("publishHeadSha", headSha);

            runChecked(
                "git",
                ["tag", "-f", tag, headSha],
                {
                    cwd: publishDir,
                    stdio: "inherit",
                    encoding: "utf8",
                },
                "Failed to move tag to latest commit.",
            );

            runChecked(
                "git",
                ["push", "origin", tag, "--force"],
                {
                    cwd: publishDir,
                    stdio: "inherit",
                    encoding: "utf8",
                },
                "Failed to force-push updated tag.",
            );

            runChecked(
                "gh",
                `release create ${tag} "${prePublishDir}/dist.zip" --title "${title}" --notes-file "${draftPath}"`,
                {
                    cwd: publishDir,
                    stdio: "inherit",
                    encoding: "utf8",
                },
                "Failed to recreate release.",
            );
        } else {
            console.log(`\nCreating new release ${tag}...`);
            logInfo("Copying build output into publish repository.");
            copyAllFiles(distDir, publishDir);
            runChecked("git", "add .", { cwd: publishDir }, "Failed to stage publish repo changes.");
            runChecked(
                "git",
                ["commit", "-m", `release ${title}`, "-m", notes],
                { cwd: publishDir },
                "Failed to commit publish repo release changes.",
            );

            // Create tag pointing to current commit
            runChecked(
                "git",
                ["tag", tag],
                { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
                "Failed to create tag.",
            );

            // Push branch and tag separately
            runChecked(
                "git",
                "push origin main",
                { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
                "Failed to push publish repo main branch.",
            );
            runChecked(
                "git",
                ["push", "origin", tag],
                { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
                "Failed to push release tag.",
            );

            runChecked(
                "gh",
                `release create ${tag} "${prePublishDir}/dist.zip" --title "${title}" --notes-file "${draftPath}"`,
                {
                    cwd: publishDir,
                    stdio: "inherit",
                    encoding: "utf8",
                },
                "Failed to create release.",
            );
        }

        logInfo("Syncing root repository after publish release update.");
        runChecked(
            "git",
            "add publish manifest.json package.json",
            { cwd: __dirname },
            "Failed to stage root repo release changes.",
        );
        runChecked(
            "git",
            `commit -m "Update submodule reference"`,
            { cwd: __dirname },
            "Failed to commit root repo release changes.",
        );
        runChecked("git", "push origin main", { cwd: __dirname }, "Failed to push root repo main branch.");
        runChecked(
            "git",
            ["push", "origin"],
            { cwd: __dirname, stdio: "inherit", encoding: "utf8" },
            "Failed to push root repo refs to origin.",
        );
        console.log(`\n${releasePrefix(ansi.green)} ${c("Release flow completed.", ansi.bold, ansi.green)}`);
    } finally {
        rl.close();
        if (existsSync(draftPath)) {
            logWarning("Cleaning up release note draft.");
            rmSync(draftPath);
        }
    }
}

main().catch((err) => {
    console.error(errorText(err.message || String(err)));
    process.exit(1);
});
