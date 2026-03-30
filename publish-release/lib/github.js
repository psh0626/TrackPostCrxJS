import { exec } from "./process.js";
import { die } from "./errors.js";
import { releasePrefix, ansi, c, logInfo, logSuccess, logDetail } from "./log.js";

export function parseGitHubRepoSlug(remoteUrl) {
    const normalized = remoteUrl.trim();

    const httpsMatch = normalized.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;

    const sshMatch = normalized.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;

    return null;
}

export function checkGhAuthAndPermissions(rootDir, publishDir) {
    logInfo("Checking GitHub CLI authentication status.");
    const authResult = exec("gh", ["auth", "status"], { cwd: rootDir });
    if (authResult.status !== 0) {
        if (typeof authResult.stderr === "string" && authResult.stderr.trim()) {
            console.error(
                `${releasePrefix(ansi.red)} ${c("stderr:", ansi.bold, ansi.red)}\n${authResult.stderr.trim()}`,
            );
        }
        die("GitHub CLI is not authenticated. Run 'gh auth login' first.");
    }
    logSuccess("GitHub CLI authentication check passed.");

    const repoDirs = [
        { name: "root", cwd: rootDir },
        { name: "publish", cwd: publishDir },
    ];

    for (const { name, cwd } of repoDirs) {
        const remoteResult = exec("git", ["remote", "get-url", "origin"], { cwd });
        if (remoteResult.status !== 0 || !remoteResult.stdout.trim()) {
            die(`Failed to resolve origin remote in ${name} repository.`);
        }

        const remoteUrl = remoteResult.stdout.trim();
        const slug = parseGitHubRepoSlug(remoteUrl);
        if (!slug) {
            die(`Origin remote is not a supported GitHub URL in ${name} repository: ${remoteUrl}`);
        }

        const repoInfoResult = exec(
            "gh",
            ["api", `repos/${slug}`, "--jq", '{"full_name": .full_name, "permissions": .permissions}'],
            { cwd },
        );

        if (repoInfoResult.status !== 0 || !repoInfoResult.stdout.trim()) {
            if (typeof repoInfoResult.stderr === "string" && repoInfoResult.stderr.trim()) {
                console.error(
                    `${releasePrefix(ansi.red)} ${c("stderr:", ansi.bold, ansi.red)}\n${repoInfoResult.stderr.trim()}`,
                );
            }
            die(`Failed to fetch repository permissions for ${slug}.`);
        }

        let repoInfo;
        try {
            repoInfo = JSON.parse(repoInfoResult.stdout.trim());
        } catch {
            die(`Unable to parse repository permissions response for ${slug}.`);
        }

        const hasPush = Boolean(repoInfo?.permissions?.push);
        logDetail(`${name}Repo`, repoInfo?.full_name || slug);
        logDetail(`${name}RepoPushPermission`, hasPush ? "yes" : "no");

        if (!hasPush) {
            die(`Authenticated GitHub account does not have push permission for ${repoInfo?.full_name || slug}.`);
        }
    }

    logSuccess("GitHub repository permission checks passed.");
}

export function checkReposClean(rootDir, publishDir) {
    logInfo("Checking that both repositories have no uncommitted changes.");

    const repos = [
        { name: "root", cwd: rootDir },
        { name: "publish", cwd: publishDir },
    ];

    for (const { name, cwd } of repos) {
        const result = exec("git", ["status", "--porcelain"], { cwd });
        if (result.status !== 0) {
            die(`Failed to check git status in ${name} repository.`);
        }
        const dirty = result.stdout.trim();
        if (dirty) {
            console.error(
                `${releasePrefix(ansi.red)} ${c(`Uncommitted changes in ${name} repository:`, ansi.bold, ansi.red)}`,
            );
            console.error(c(dirty, ansi.yellow));
            die(`${name} repository has uncommitted changes. Commit or stash them before running the release.`);
        }
        logSuccess(`${name} repository is clean.`);
    }
}

export function ghExec(command, cwd) {
    const result = exec("gh", command, { cwd });
    if (result.status === 0) return result.stdout.trim();
    return null;
}
