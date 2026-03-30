export function stripHtmlComments(text) {
    if (!text) return "";
    return text.replace(/<!--[\s\S]*?-->/g, "").replace(/^\s*\n/gm, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function hasSection(body, sectionName) {
    if (!body) return false;
    const re = new RegExp(`^##\\s*${sectionName}\\b`, "mi");
    return re.test(body);
}

export function buildMissingSections(existingBody) {
    const sections = ["Added", "Changed", "Fixed"];
    const missing = sections.filter((name) => !hasSection(existingBody, name));
    if (missing.length === 0) return "";
    return missing.map((name) => `## ${name}\n- `).join("\n");
}

export function hasUntouchedTemplatePlaceholders(notes) {
    return /^- \s*$/m.test(notes);
}

export function isValidVersion(version) {
    return /^\d+\.\d+\.\d+$/.test(version);
}
