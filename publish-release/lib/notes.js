export function stripHtmlComments(text) {
    return text.replace(/<!--[\s\S]*?-->/g, "").replace(/^\s*\n/gm, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function hasSection(body, sectionName) {
    return body.includes(`## ${sectionName}`);
}

export function buildMissingSections(existingBody) {
    const sections = ["New Features", "Bug Fixes", "Other Changes"];
    const missing = sections.filter((s) => !hasSection(existingBody, s));
    if (missing.length === 0) return existingBody;
    const additions = missing.map((s) => `## ${s}\n\n- \n`).join("\n");
    return existingBody.trim() + "\n\n" + additions;
}

export function hasUntouchedTemplatePlaceholders(notes) {
    return /^- \s*$/m.test(notes);
}

export function isValidVersion(version) {
    return /^\d+\.\d+\.\d+$/.test(version);
}
