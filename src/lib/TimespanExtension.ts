export function time(ms: string | number): Mil {
    return new Mil(ms);
}
export class Mil {
    private _timeMs = 0;
    constructor(ms: string | number) {
        if (typeof ms === "string") {
            this._timeMs = parseFloat(ms);
        } else {
            this._timeMs = ms;
        }
    }
    toNumber(): number {
        return this._timeMs;
    }
    toSeconds(): number {
        return this._timeMs * 1000;
    }
    toMinutes(): number {
        return this._timeMs * 60 * 1000;
    }
    toHours(): number {
        return this._timeMs * 60 * 60 * 1000;
    }
    toSecondsString(): string {
        return this._timeMs / 1000 + " seconds";
    }
    toMinutesString(): string {
        return this._timeMs / (60 * 1000) + " minutes";
    }
    toHoursString(): string {
        return this._timeMs / (60 * 60 * 1000) + " hours";
    }
}
