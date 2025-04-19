// Adding extension methods to the String prototype
export {};

declare global {
    interface String {
        toMilliseconds(): number;
        toSeconds(): number;
        toMinutes(): number;
        toHours(): number;
    }
}

String.prototype.toMilliseconds = function (): number {
    return parseFloat(this.toString());
};

String.prototype.toSeconds = function (): number {
    return parseFloat(this.toString()) * 1000;
};

String.prototype.toMinutes = function (): number {
    return parseFloat(this.toString()) * 60 * 1000;
};

String.prototype.toHours = function (): number {
    return parseFloat(this.toString()) * 60 * 60 * 1000;
};
