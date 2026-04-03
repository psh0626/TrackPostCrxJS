import { existsSync, rmSync } from "fs";
import { exec, runChecked } from "./process.js";
import { die } from "./errors.js";
import { releasePrefix, ansi, c, logInfo, logSuccess, logDetail, logWarning } from "./log.js";
import { copyAllFiles } from "./files.js";

export function captureCheckpoint(rootDir, publishDir) {
    const rootShaResult = exec("git", ["rev-parse", "HEAD"], { cwd: rootDir });
    const rootBranchResult = exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: rootDir });
    const publishShaResult = exec("git", ["rev-parse", "HEAD"], { cwd: publishDir });
    const publishBranchResult = exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: publishDir });

    if (rootShaResult.status !== 0) die("Failed to capture root repository HEAD for checkpoint.");
    if (publishShaResult.status !== 0) die("Failed to capture publish repository HEAD for checkpoint.");

    const checkpoint = {
        rootSha: rootShaResult.stdout.trim(),
        rootBranch: rootBranchResult.stdout.trim() || "main",
        publishSha: publishShaResult.stdout.trim(),
        publishBranch: publishBranchResult.stdout.trim() || "main",
    };

    logDetail("checkpointRootSha", checkpoint.rootSha.slice(0, 8));
    logDetail("checkpointPublishSha", checkpoint.publishSha.slice(0, 8));
    logSuccess("Checkpoint captured.");
    return checkpoint;
}

export function rollback(state) {
    if (state.rolledBack) return;
    state.rolledBack = true;

    const { rootDir, publishDir, checkpoint, tag } = state;
    if (!checkpoint) {
        logWarning("No checkpoint available; skipping rollback.");
        return;
    }

    console.error(`\n${releasePrefix(ansi.red)} ${c("Rolling back to checkpoint...", ansi.bold, ansi.red)}`);

    // Best-effort remote cleanup in reverse order of operations performed
    if (state.releaseCreated && tag) {
        logInfo(`Rollback: deleting GitHub release ${tag}.`);
        const r = exec("gh", ["release", "delete", tag, "--yes"], { cwd: publishDir });
        if (r.status === 0) logSuccess(`Rollback: deleted release ${tag}.`);
        else logWarning(`Rollback: could not delete release ${tag}. Delete it manually at GitHub.`);
    }

    if (state.tagPushed && tag) {
        logInfo(`Rollback: deleting remote tag ${tag}.`);
        const r = exec("git", ["push", "--delete", "origin", tag], { cwd: publishDir });
        if (r.status === 0) logSuccess(`Rollback: deleted remote tag ${tag}.`);
        else logWarning(`Rollback: could not delete remote tag ${tag}. Delete it manually.`);
    }

    if (state.publishMainPushed) {
        logInfo(`Rollback: restoring remote publish/${checkpoint.publishBranch} to checkpoint.`);
        const r = exec(
            "git",
            ["push", "origin", `${checkpoint.publishSha}:refs/heads/${checkpoint.publishBranch}`, "--force"],
            { cwd: publishDir },
        );
        if (r.status === 0) logSuccess("Rollback: restored remote publish branch.");
        else logWarning("Rollback: could not restore remote publish branch. Force-push manually.");
    }

    if (state.rootMainPushed) {
        logInfo(`Rollback: restoring remote root/${checkpoint.rootBranch} to checkpoint.`);
        const r = exec(
            "git",
            ["push", "origin", `${checkpoint.rootSha}:refs/heads/${checkpoint.rootBranch}`, "--force"],
            { cwd: rootDir },
        );
        if (r.status === 0) logSuccess("Rollback: restored remote root branch.");
        else logWarning("Rollback: could not restore remote root branch. Force-push manually.");
    }

    // Local hard reset — safe because repos were verified clean before any mutations
    logInfo("Rollback: resetting publish repository to checkpoint.");
    const rp = exec("git", ["reset", "--hard", checkpoint.publishSha], { cwd: publishDir });
    if (rp.status === 0) logSuccess("Rollback: publish repository reset.");
    else logWarning("Rollback: could not reset publish repository.");

    logInfo("Rollback: resetting root repository to checkpoint.");
    const rr = exec("git", ["reset", "--hard", checkpoint.rootSha], { cwd: rootDir });
    if (rr.status === 0) logSuccess("Rollback: root repository reset.");
    else logWarning("Rollback: could not reset root repository.");

    // Remove local tag if it exists
    if (tag) {
        const tagCheck = exec("git", ["tag", "-l", tag], { cwd: publishDir });
        if (tagCheck.stdout.trim() === tag) {
            logInfo(`Rollback: deleting local tag ${tag}.`);
            const rt = exec("git", ["tag", "-d", tag], { cwd: publishDir });
            if (rt.status === 0) logSuccess(`Rollback: deleted local tag ${tag}.`);
            else logWarning(`Rollback: could not delete local tag ${tag}.`);
        }
    }

    // Remove draft file if it still exists
    if (state.draftPath && existsSync(state.draftPath)) {
        try {
            rmSync(state.draftPath);
        } catch {
            /* ignore */
        }
    }

    console.error(`${releasePrefix(ansi.yellow)} ${c("Rollback complete.", ansi.yellow)}\n`);
}

export function commitTagAndRelease({
    publishDir,
    distDir,
    assetPaths,
    tag,
    title,
    commitBody,
    draftPath,
    force,
    rollbackState: rs,
}) {
    logInfo("Copying build output into publish repository.");
    copyAllFiles(distDir, publishDir);

    runChecked(
        "git",
        ["add", "."],
        { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
        "Failed to stage publish repo changes.",
    );

    runChecked(
        "git",
        ["commit", "-m", `release ${title}`, "-m", commitBody],
        { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
        "Failed to commit publish repo release changes.",
    );

    const headResult = exec("git", ["rev-parse", "HEAD"], { cwd: publishDir });
    if (headResult.status === 0) logDetail("publishHeadSha", headResult.stdout.trim());

    runChecked(
        "git",
        ["tag", ...(force ? ["-f"] : []), tag],
        { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
        `Failed to ${force ? "update" : "create"} tag.`,
    );

    runChecked(
        "git",
        ["push", "origin", "main", ...(force ? ["--force"] : [])],
        { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
        "Failed to push publish repo main branch.",
    );
    if (rs) rs.publishMainPushed = true;

    runChecked(
        "git",
        ["push", "origin", tag, ...(force ? ["--force"] : [])],
        { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
        "Failed to push release tag.",
    );
    if (rs) rs.tagPushed = true;

    runChecked(
        "gh",
        ["release", "create", tag, ...assetPaths, "--title", title, "--notes-file", draftPath],
        { cwd: publishDir, stdio: "inherit", encoding: "utf8" },
        "Failed to create release.",
    );
    if (rs) rs.releaseCreated = true;
}
