import { spawnSync } from "child_process";
import { ReleaseError } from "./errors.js";
import { ansi, c, errorText, formatCommand, logDetail, logInfo, logSuccess, releasePrefix } from "./log.js";

export function exec(cmd, args = "", options = {}) {
    const { cwd, encoding = "utf8", stdio = "pipe", shell = false } = options;
    const execCmd = process.platform === "win32" && cmd === "npm" ? "npm.cmd" : cmd;

    const argList =
        typeof args === "string"
            ? (args.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((x) => x.replace(/^['"]|['"]$/g, ""))
            : args;

    return spawnSync(execCmd, argList, { cwd, encoding, stdio, shell });
}

export function runChecked(cmd, args = "", options = {}, errorMessage = "Command failed.") {
    const commandText = formatCommand(cmd, args);
    const cwdText = options.cwd || process.cwd();
    const lastPartOfCwd = cwdText.split("\\").slice(-1)[0] || cwdText;

    logDetail("Running command", commandText);
    logInfo(`Working Directory: ${lastPartOfCwd}`);

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
        console.log("");
        throw new ReleaseError(errorMessage, { logged: true });
    }

    logSuccess(`Command completed.\n`);
    return result;
}

export function checkCommand(cmd) {
    if (process.platform === "win32") {
        const result = exec("where", cmd);
        return result.status === 0;
    }
    const result = exec("which", cmd);
    return result.status === 0;
}
