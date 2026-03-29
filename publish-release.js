#!/usr/bin/env node
import { spawnSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function exec(cmd, args = "", options = {}) {
    const { cwd, encoding = "utf8", stdio = "pipe", shell = false } = options;
    const execCmd = process.platform === "win32" && cmd === "npm" ? "npm.cmd" : cmd;

    const argList =
        typeof args === "string"
            ? (args.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((x) => x.replace(/^['"]|['"]$/g, ""))
            : args;

    return spawnSync(execCmd, argList, { cwd, encoding, stdio, shell });
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
        rl.question(message, (answer) => resolve(answer));
        if (prefill) rl.write(prefill);
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
    return missing.map((name) => `## ${name}\n\n- `).join("\n\n");
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
    if (!checkCommand("gh")) {
        console.error("Error: GitHub CLI 'gh' is required.");
        process.exit(1);
    }
    if (!checkCommand("code")) {
        console.error("Error: VS Code CLI 'code' is required.");
        console.error("Install via VS Code Command Palette: Shell Command: Install 'code' command in PATH");
        process.exit(1);
    }

    const packagePath = join(__dirname, "package.json");
    const manifestPath = join(__dirname, "manifest.json");

    const distDir = join(__dirname, "dist");
    const prePublishDir = join(__dirname, "pre-publish");
    const publishDir = join(__dirname, "publish");
    const draftPath = join(prePublishDir, ".release-notes-draft.md");

    ensureUtf8NoBom(packagePath);
    ensureUtf8NoBom(manifestPath);

    const packageJson = readJsonFile(packagePath);
    let currentVersion = packageJson.version;

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    try {
        // --- 1. Version prompt ---
        console.log(`\nCurrent version: \x1b[36m${currentVersion}\x1b[0m`);

        const newVersion = await prompt(rl, "Enter version: ", currentVersion);
        if (!newVersion.trim()) {
            console.error("Error: Version cannot be empty.");
            process.exit(1);
        }
        if (newVersion.trim() === currentVersion) {
            console.log("Version unchanged.");
        } else {
            currentVersion = newVersion.trim();
            updateVersionInFile(packagePath, currentVersion);
            updateVersionInFile(manifestPath, currentVersion);
            console.log(`Updated version to ${currentVersion} in package.json and manifest.json`);
        }

        // --- 2. Build ---
        console.log("\nRunning build...");
        const buildResult = exec("npm", "run build", { stdio: "inherit", encoding: "utf8", shell: true });
        if (buildResult.status !== 0) {
            if (buildResult.error) {
                console.error(`Build spawn error: ${buildResult.error.message}`);
            }
            console.error("Error: Build failed.");
            process.exit(1);
        }

        const tag = `v${currentVersion}`;
        const defaultTitle = `TrackPost ${tag}`;
        const assetPath = join(prePublishDir, "dist.zip");

        if (!existsSync(assetPath)) {
            console.error(`Error: Asset not found: ${assetPath}`);
            process.exit(1);
        }

        // --- 3. Release title ---
        const titleRaw = await prompt(rl, `\nRelease title (Enter for default): `, defaultTitle);
        const title = titleRaw.trim() || defaultTitle;

        // --- 4. Fetch existing notes & commits from repo ---
        const existingBodyRaw = ghExec(`release view ${tag} --json body --jq .body`, publishDir);
        const latestBodyRaw = ghExec("release view --json body --jq .body", publishDir);
        const existingBody = stripHtmlComments(existingBodyRaw);
        const latestBody = stripHtmlComments(latestBodyRaw);

        const lastTagResult = exec("git", "describe --tags --abbrev=0", { cwd: __dirname });
        const lastTag = lastTagResult.status === 0 ? lastTagResult.stdout.trim() : "";

        let commitLines;
        const lastCommitInPublish = exec("git", ["log", "-n", "1", "--pretty=format:%ad"], { cwd: publishDir });
        const lastCommitDate = lastCommitInPublish.status === 0 ? lastCommitInPublish.stdout.trim() : null;
        const sinceArg = lastCommitDate ? `--since=${lastCommitDate}` : `--since=${lastTag}`;
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

        const commitRangeTitle = `commits since ${lastCommitDate || lastTag}`;

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
                commitSummaryBlock,
                referenceBlock,
            ].join("\n");
        } else {
            draftContent = [template, commitSummaryBlock, referenceBlock].join("\n");
        }

        writeFileSync(draftPath, draftContent, "utf8");

        // --- 6. Open in VS Code ---
        console.log("\nOpening release notes in VS Code. Save and close to continue...");
        const openEditorResult = exec("code", `-r --wait "${draftPath}"`, {
            cwd: __dirname,
            stdio: "inherit",
            encoding: "utf8",
            shell: false,
        });
        if (openEditorResult.status !== 0) {
            console.error("Error: Failed to open VS Code editor.");
            process.exit(1);
        }

        // --- 7. Validate notes ---
        const baselineNotes = draftContent.trim();
        const notes = readFileSync(draftPath, "utf8").trim();
        if (!notes) {
            console.error("Error: Release notes are empty.");
            process.exit(1);
        }
        if (notes === baselineNotes) {
            console.error("Error: Release notes were not edited. Please update the draft before closing VS Code.");
            process.exit(1);
        }
        if (hasUntouchedTemplatePlaceholders(notes)) {
            console.error(
                "Error: Template placeholders are still present (for example '-'). Fill out Added/Changed/Fixed sections.",
            );
            process.exit(1);
        }

        // --- 8. Prepare publish repo ---
        copyAllFiles(distDir, publishDir);
        exec("git", "add .", { cwd: publishDir });
        exec("git", ["commit", "-m", `chore: release ${title}`, "-m", notes], { cwd: publishDir });
        exec("git", "push origin main", { cwd: publishDir });
        exec("git", "add publish", { cwd: __dirname });
        exec("git", `commit -m "Update submodule reference"`, { cwd: __dirname });
        exec("git", "push origin main", { cwd: __dirname });

        // --- 9. Create or update GitHub release ---
        const releaseExists = ghExec(`release view ${tag} --json tagName`, publishDir) !== null;

        if (releaseExists) {
            console.log(`\nRecreating release ${tag} and refreshing source archives...`);

            const deleteResult = exec("gh", `release delete ${tag} --yes`, {
                cwd: publishDir,
                stdio: "inherit",
                encoding: "utf8",
            });
            if (deleteResult.status !== 0) {
                console.error("Error: Failed to delete existing release.");
                process.exit(1);
            }

            const headResult = exec("git", ["rev-parse", "HEAD"], { cwd: publishDir });
            if (headResult.status !== 0) {
                console.error("Error: Failed to resolve latest commit SHA in publish repo.");
                process.exit(1);
            }
            const headSha = headResult.stdout.trim();

            const tagMoveResult = exec("git", ["tag", "-f", tag, headSha], {
                cwd: publishDir,
                stdio: "inherit",
                encoding: "utf8",
            });
            if (tagMoveResult.status !== 0) {
                console.error("Error: Failed to move tag to latest commit.");
                process.exit(1);
            }

            const pushTagResult = exec("git", ["push", "origin", tag, "--force"], {
                cwd: publishDir,
                stdio: "inherit",
                encoding: "utf8",
            });
            if (pushTagResult.status !== 0) {
                console.error("Error: Failed to force-push updated tag.");
                process.exit(1);
            }

            const recreateResult = exec(
                "gh",
                `release create ${tag} dist.zip --title "${title}" --notes-file "${draftPath}"`,
                {
                    cwd: publishDir,
                    stdio: "inherit",
                    encoding: "utf8",
                },
            );
            if (recreateResult.status !== 0) {
                console.error("Error: Failed to recreate release.");
                process.exit(1);
            }
        } else {
            console.log(`\nCreating new release ${tag}...`);
            const createResult = exec(
                "gh",
                `release create ${tag} dist.zip --title "${title}" --notes-file "${draftPath}"`,
                {
                    cwd: publishDir,
                    stdio: "inherit",
                    encoding: "utf8",
                },
            );
            if (createResult.status !== 0) {
                console.error("Error: Failed to create release.");
                process.exit(1);
            }
        }

        console.log("\nRelease flow completed.");
    } finally {
        rl.close();
        if (existsSync(draftPath)) rmSync(draftPath);
    }
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
