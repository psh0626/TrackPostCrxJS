import { getPreviousReleaseBody, ghExec } from "./github.js";
import { buildMissingSections, stripHtmlComments } from "./notes.js";
import { exec } from "./process.js";

export function buildReleaseDraft({ tag, publishDir, workspaceDir, sections = ["Added", "Changed", "Fixed"] }) {
    const existingBodyRaw = ghExec(`release view ${tag} --json body --jq .body`, publishDir);
    const latestBodyRaw = ghExec("release view --json body --jq .body", publishDir);
    const existingBody = stripHtmlComments(existingBodyRaw);

    const previousBodyRaw = existingBody ? getPreviousReleaseBody(publishDir, tag) : null;
    const referenceBody = stripHtmlComments(previousBodyRaw || latestBodyRaw);

    const lastTagResult = exec("git", ["describe", "--tags", "--abbrev=0"], { cwd: workspaceDir });
    const lastTag = lastTagResult.status === 0 ? lastTagResult.stdout.trim() : "";

    const lastCommitInPublish = exec("git", ["log", "-n", "1", "--pretty=format:%ad"], { cwd: publishDir });
    const lastCommitDate = lastCommitInPublish.status === 0 ? lastCommitInPublish.stdout.trim() : null;
    const sinceArg = lastTag ? `${lastTag}..HEAD` : lastCommitDate ? `--since=${lastCommitDate}` : "";

    const commitLogs = exec(
        "git",
        [
            "log",
            ...(sinceArg ? [sinceArg] : []),
            "--pretty=format:Author: %an%nDate: %ad%n%s%n",
            "--date=format:%Y-%m-%d %I:%M:%S %p",
            "--grep=Update submodule reference",
            "--invert-grep",
        ],
        { cwd: workspaceDir },
    );
    const commitLines = commitLogs.stdout.trim() || "- No recent commits found.";

    const commitRangeTitle = lastTag
        ? `commits since tag ${lastTag}`
        : lastCommitDate
          ? `commits since ${new Date(lastCommitDate).toLocaleString()}`
          : "recent commits";
    const commitSummaryBlock = [
        `<!-- Commit Summary: ${commitRangeTitle} -->`,
        "<!--",
        "",
        commitLines,
        "",
        "-->",
    ].join("\n");

    const template = sections.flatMap((name) => [`## ${name}`, "- ", ""]).join("\n");

    const referenceBlock = referenceBody
        ? ["", "<!-- Reference release note -->", "<!--", "", referenceBody, "", "-->"].join("\n")
        : "";

    let draftContent;
    if (existingBody) {
        const missingSections = buildMissingSections(existingBody, sections);
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

    return {
        draftContent,
        existingBody,
        referenceBody,
        lastTag,
        lastCommitDate,
        sinceArg,
        commitLines,
        commitRangeTitle,
    };
}
