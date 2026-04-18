export default class StorageKey {
    private key: string;
    constructor(key: string) {
        this.key = key;
    }

    get fromSession() {
        return {
            get: <T>() =>
                chrome.storage.session
                    .get(this.key)
                    .then((result) => result[this.key] as T | undefined)
                    .catch(() => undefined),
            set: (value: any) => chrome.storage.session.set({ [this.key]: value }),
        };
    }
    get fromLocal() {
        return {
            get: <T>() =>
                chrome.storage.local
                    .get(this.key)
                    .then((result) => result[this.key] as T | undefined)
                    .catch(() => undefined),
            set: (value: any) => chrome.storage.local.set({ [this.key]: value }),
        };
    }
}
