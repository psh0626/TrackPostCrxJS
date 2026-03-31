export const ansi = {
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

export function c(text, ...styles) {
    return `${styles.join("")}${text}${ansi.reset}`;
}

export function stripAnsi(text) {
    return text.replace(/\x1B\[[0-9;]*m/g, "");
}

export function releasePrefix(color) {
    return `${c("[", ansi.dim)}${c("release", ansi.bold, color)}${c("]", ansi.dim)}`;
}

export function errorText(message) {
    return c(`Error: ${message}`, ansi.bold, ansi.red);
}

export function formatCommand(cmd, args = "") {
    const argList =
        typeof args === "string"
            ? args
            : args.map((arg) => (String(arg).includes(" ") ? `"${arg}"` : String(arg))).join(" ");
    return argList ? `${cmd} ${argList}` : cmd;
}

export function logInfo(message) {
    console.log(`${releasePrefix(ansi.blue)} ${message}`);
}

export function logSuccess(message) {
    console.log(`${releasePrefix(ansi.green)} ${c(message, ansi.green)}`);
}

export function logDetail(label, value) {
    console.log(`${releasePrefix(ansi.cyan)} ${c(label, ansi.bold, ansi.white)}: ${c(value, ansi.cyan)}`);
}

export function logWarning(message) {
    console.log(`${releasePrefix(ansi.yellow)} ${c(message, ansi.yellow)}`);
}
