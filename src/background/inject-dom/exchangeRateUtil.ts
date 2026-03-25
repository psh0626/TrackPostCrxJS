import { CMD, MSG } from "../message-hub/Message";

export default class ExchangeRateUtil {
    private static readonly storageName = "IMIC_EXCHANGE_RATES";
    static cooldown: NodeJS.Timeout | null = null;
    static rates: { [key: string]: number } = {
        SDR: 1749,
        USD: 1600,
        EUR: 1900,
        KRW: 1,
        GBP: 2200,
        JPY: 12,
        CNY: 300,
    };

    static getRate(currency: string): number {
        if (!this.rates[currency]) {
            console.warn(`[ExchangeRateUtil] Exchange rate for ${currency} not found. Defaulting to USD rate.`);
            return this.rates.USD;
        }
        return this.rates[currency];
    }

    static convert(amount: number, fromCurrency: string, toCurrency: string): number {
        const fromRate = this.getRate(fromCurrency);
        const toRate = this.getRate(toCurrency);
        return (amount * fromRate) / toRate;
    }
    static calculateSDR(value: string | number, currency: string) {
        const inputValue = parseFloat(value?.toString() || "0");
        const calcValue = this.convert(inputValue, currency?.toString() || "USD", "SDR");
        return Math.ceil(calcValue).toString();
    }

    static saveRates() {
        console.log("[ExchangeRateUtil] Saving exchange rates to storage: ", this.rates);
        return chrome.storage.local.set({ [ExchangeRateUtil.storageName]: this.rates });
    }
    static async loadRates() {
        const result = await chrome.storage.local.get([ExchangeRateUtil.storageName]);
        if (result[ExchangeRateUtil.storageName]) {
            this.rates = result[ExchangeRateUtil.storageName] as typeof this.rates;
            console.log("[ExchangeRateUtil] Loaded exchange rates from storage: ", this.rates);
        } else {
            console.log("[ExchangeRateUtil] No exchange rates found in storage, using default rates.");
        }
    }
    static async updateRates(newRates: { [key: string]: number }) {
        this.rates = { ...this.rates, ...newRates };
        const saveAction = async () => {
            await this.saveRates();
            await this.notifyRateChangeToTabs();
        };
        if (this.cooldown) {
            console.log("[ExchangeRateUtil] Update is on cooldown. Delaying save action by 3 seconds.");
            clearTimeout(this.cooldown);
            this.cooldown = setTimeout(saveAction, 1000 * 3); // 3 seconds cooldown
            return;
        }
        this.cooldown = setTimeout(saveAction, 1000 * 3); // 3 seconds cooldown
    }
    static async notifyRateChangeToTabs() {
        console.log("[ExchangeRateUtil] Notifying all tabs about exchange rate update.");
        return new MSG(CMD.EXCHANGE_RATES_UPDATED).notifyAllTabs();
    }
}

chrome.runtime.onMessage.addListener((message: MSG, _sender, sendResponse) => {
    switch (message.Command) {
        case CMD.EXCHANGE_RATES_UPDATED:
            ExchangeRateUtil.loadRates();
            break;
    }
});

await ExchangeRateUtil.loadRates();
