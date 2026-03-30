import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { ansi, c, stripAnsi } from "./log.js";

export function prompt(rl, message, prefill = "") {
    return new Promise((resolve) => {
        rl.question(c(message, ansi.bold), (answer) => resolve(stripAnsi(answer)));
        if (prefill) rl.write(prefill);
    });
}

export function readJsonFile(filePath) {
    const raw = readFileSync(filePath, "utf8");
    const sanitized = raw.replace(/^\uFEFF/, "");
    return JSON.parse(sanitized);
}

export function ensureUtf8NoBom(filePath) {
    const raw = readFileSync(filePath, "utf8");
    const sanitized = raw.replace(/^\uFEFF/, "");
    if (raw !== sanitized) {
        writeFileSync(filePath, sanitized, "utf8");
    }
}

export function updateVersionInFile(filePath, newVersion) {
    const content = readFileSync(filePath, "utf8");
    const updated = content.replace(/"version"\s*:\s*"[^"]*"/, `"version": "${newVersion}"`);
    writeFileSync(filePath, updated, "utf8");
}

export function copyAllFiles(srcDir, destDir) {
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
