import { ms } from "@/common/TimespanExtension";
import { GitHubReleaseList } from "./githubWrapper";
export type UpdateInfoCacheData = {
    releases: GitHubReleaseList;
    _timestamp: string;
};
export class UpdateInfoCache {
    releases: GitHubReleaseList;
    private _timestamp: string;
    private static EXPIRATION_TIME = ms(1).toHours();
    constructor(releases: GitHubReleaseList, timestamp: Date | string = new Date()) {
        this.releases = releases;
        this._timestamp = typeof timestamp === "string" ? timestamp : timestamp.toISOString();
    }
    get timestamp() {
        return new Date(this._timestamp);
    }
    set timestamp(date: Date) {
        this._timestamp = date.toISOString();
    }
    isExpired() {
        if (!this.isVersionUpToDate()) return true;
        const now = new Date();
        const cacheTime = this.timestamp;
        const elapsedTime = now.getTime() - cacheTime.getTime();
        return elapsedTime >= UpdateInfoCache.EXPIRATION_TIME;
    }
    private isVersionUpToDate() {
        const currentVersion = chrome.runtime.getVersion();
        const latestRelease = this.releases[0];
        if (!latestRelease) return false;
        const latestVersion = latestRelease.tag_name.replace(/^v/, ""); // Remove 'v' prefix if exists
        return currentVersion === latestVersion;
    }
}
