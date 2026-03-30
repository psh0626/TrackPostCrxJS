export class ReleaseError extends Error {
    constructor(message, { exitCode = 1, logged = false } = {}) {
        super(message);
        this.exitCode = exitCode;
        this.logged = logged;
    }
}

export function die(message) {
    throw new ReleaseError(message);
}
