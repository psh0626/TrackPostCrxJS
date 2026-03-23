export default class ExchangeRateUtil {
    private static rates: { [key: string]: number } = {
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
            console.warn(`Exchange rate for ${currency} not found. Defaulting to USD rate.`);
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
}
