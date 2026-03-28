import { CMD, MSG } from "./message-hub/Message";

export type ExchangeRateMap = Map<string, CurrencyItem>;
export class CurrencyItem {
    currency: string = "KRW";
    valueInKRW: number = 1;
    isAdded?: boolean = false;
    constructor(init?: Partial<CurrencyItem>) {
        Object.assign(this, init);
    }
}

export default class ExchangeRateUtil {
    private static readonly storageName = "IMIC_EXCHANGE_RATES";
    private static readonly storageNameLastUpdated = "IMIC_EXCHANGE_RATES_LAST_UPDATED";

    static lastUpdated: Date | null = null;
    static rates: ExchangeRateMap = new Map<string, CurrencyItem>([
        ["KRW", new CurrencyItem({ currency: "KRW", valueInKRW: 1 })],
        ["SDR", new CurrencyItem({ currency: "SDR", valueInKRW: 1749 })],
        ["USD", new CurrencyItem({ currency: "USD", valueInKRW: 1600 })],
        ["EUR", new CurrencyItem({ currency: "EUR", valueInKRW: 1900 })],
        ["GBP", new CurrencyItem({ currency: "GBP", valueInKRW: 2200 })],
        ["CNY", new CurrencyItem({ currency: "CNY", valueInKRW: 300 })],
        ["JPY", new CurrencyItem({ currency: "JPY", valueInKRW: 12 })],
    ]);

    static getRate(currency: string): number {
        const rateItem = this.rates.get(currency);
        if (!rateItem) {
            console.warn(`[ExchangeRateUtil] Exchange rate for ${currency} not found. Defaulting to USD rate.`);
            return this.rates.get("USD")!.valueInKRW;
        }
        return rateItem.valueInKRW;
    }

    static convert(amount: number, fromCurrency: string, toCurrency: string): number {
        const fromRate = this.getRate(fromCurrency);
        const toRate = this.getRate(toCurrency);
        return (amount * fromRate) / toRate;
    }
    static calculateSDR(value: string | number, currency: string) {
        const inputValue = isNaN(Number(value || "1")) ? 1 : Number(value);
        const calcValue = this.convert(inputValue, currency?.toString() || "USD", "SDR");
        return Math.ceil(calcValue).toString();
    }

    static saveRates() {
        console.log("[ExchangeRateUtil] Saving exchange rates to storage: ", this.rates);
        return chrome.storage.local.set({
            [ExchangeRateUtil.storageName]: Object.fromEntries(this.rates),
            [ExchangeRateUtil.storageNameLastUpdated]: new Date().toISOString(),
        });
    }
    static async loadRates() {
        const result = await chrome.storage.local.get([
            ExchangeRateUtil.storageName,
            ExchangeRateUtil.storageNameLastUpdated,
        ]);
        const foundRates = result[ExchangeRateUtil.storageName];
        const lastUpdated = result[ExchangeRateUtil.storageNameLastUpdated] as string | undefined;
        if (lastUpdated) {
            this.lastUpdated = new Date(lastUpdated);
        }
        if (foundRates) {
            this.rates = new Map(
                Object.entries(foundRates).map(([key, value]) => [key, new CurrencyItem({ currency: key, ...value })]),
            ) as ExchangeRateMap;
            console.log("[ExchangeRateUtil] Loaded exchange rates from storage: ", this.rates);
        } else {
            console.log("[ExchangeRateUtil] No exchange rates found in storage, using default rates.");
        }
    }
    static async updateRates(newRates: ExchangeRateMap) {
        newRates.forEach((value, key) => {
            this.rates.set(key, value);
        });
        await this.saveRates();
        await this.notifyRateChangeToTabs();
    }
    static async notifyRateChangeToTabs() {
        console.log("[ExchangeRateUtil] Notifying all tabs about exchange rate update.");
        return new MSG(CMD.EXCHANGE_RATES_UPDATED).fromService.notifyAllTabs();
    }
    static async initialize() {
        chrome.runtime.onMessage.addListener((message: MSG, _sender) => {
            switch (message.Command) {
                case CMD.EXCHANGE_RATES_UPDATED:
                    ExchangeRateUtil.loadRates();
                    break;
            }
        });

        await ExchangeRateUtil.loadRates();
    }
}
