import ExchangeRateUtil, { CurrencyItem, ExchangeRateMap } from "@/common/exchangeRateUtil";
import { Button, Divider, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import AlertDialog from "../components/alertDialog";
import Header from "../components/header";
import ImportExport from "../components/importExport";
import NewItemInput from "./newItemInput";
import RateForm from "./rateForm";

export default function ExchangeRate() {
    const [isInitialized, setIsInitialized] = useState(false);
    const [rates, setRates] = useState<ExchangeRateMap>(ExchangeRateUtil.rates);
    // TODO: 내보내기/가져오기 기능 추가하기 (파일로 저장/불러오기 or 클립보드 복사/붙여넣기)
    const [isAlertOpen, setIsAlertOpen] = useState({ saveButton: false });
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        if (isInitialized) return;

        ExchangeRateUtil.loadRates().then(() => {
            setRates(ExchangeRateUtil.rates);
            setLastUpdated(ExchangeRateUtil.lastUpdated);
            setIsInitialized(true);
        });
    }, []);

    const currencyOrder = ["SDR", "USD", "EUR", "GBP", "CNY", "JPY"];
    const sortRates = (a: CurrencyItem, b: CurrencyItem) => {
        const indexA = currencyOrder.indexOf(a.currency);
        const indexB = currencyOrder.indexOf(b.currency);
        const isInOrderA = indexA !== -1;
        const isInOrderB = indexB !== -1;

        if (isInOrderA && isInOrderB) {
            return indexA - indexB;
        }

        if (isInOrderA) {
            return -1;
        }

        if (isInOrderB) {
            return 1;
        }

        return a.currency.localeCompare(b.currency);
    };

    const onRateInputChange = (item: CurrencyItem, value: string) => {
        const parsedValue = isNaN(Number(value)) ? 1 : Number(value);
        setRates((prevRates: ExchangeRateMap) => {
            const newRates = new Map(prevRates);
            newRates.get(item.currency)!.valueInKRW = parsedValue;
            return newRates;
        });
    };

    const onSaveClick = async () => {
        setIsAlertOpen({ saveButton: true });
    };

    const handleSaveConfirmed = async (result: boolean) => {
        setIsAlertOpen({ saveButton: false });
        if (result) {
            await ExchangeRateUtil.updateRates(rates);
            setLastUpdated(new Date());
        }
    };

    const handleAddConfirmed = (item: CurrencyItem) => {
        const existingItem = rates.has(item.currency);
        if (existingItem) {
            const newRates = new Map(rates);
            newRates.set(item.currency, { currency: item.currency, valueInKRW: item.valueInKRW, isAdded: false });
            setRates(newRates);
        } else {
            const newRates = new Map(rates);
            newRates.set(item.currency, { currency: item.currency, valueInKRW: item.valueInKRW, isAdded: true });
            setRates(newRates);
        }
    };

    const handleRemoveConfirmed = async (item: CurrencyItem) => {
        if (rates.has(item.currency)) {
            setRates((prevRates: ExchangeRateMap) => {
                const newRates = new Map(prevRates);
                newRates.delete(item.currency);
                return newRates;
            });
        }
    };

    const exampleCalculation = () => {
        const egAmount = 34.26;
        const egCurrency = "USD";
        const inKRW = rates.get(egCurrency)?.valueInKRW;
        if (!inKRW) return null;

        const convertedAmount = egAmount * inKRW;
        const sdr = rates.get("SDR")?.valueInKRW ?? 1;
        if (!sdr) return null;

        const convertedToSDR = (convertedAmount / sdr).toFixed(2);
        const finalString = `${egAmount} ${egCurrency}를 SDR로 환산하는 과정
            1. (${egCurrency} → KRW) ${egAmount} × ${inKRW.toLocaleString()} = ${convertedAmount.toLocaleString()} KRW
            2. (KRW → SDR) ${convertedAmount.toLocaleString()} ÷ ${sdr.toLocaleString()} = ${convertedToSDR} SDR
            3. (소수점 올림) ${convertedToSDR} SDR → ${Math.ceil(Number(convertedToSDR))} SDR`;
        return (
            <Stack sx={{ ml: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, mt: 2, mb: 2 }}>
                    <Typography variant="h6" fontWeight={200} color="textSecondary" gutterBottom>
                        SDR 계산 예시
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    {finalString.split("\n").map((line, idx) => (
                        <Typography
                            variant="caption"
                            color="textSecondary"
                            letterSpacing={0.5}
                            sx={{ pl: 0.7 }}
                            key={idx}
                        >
                            {line}
                            <br />
                        </Typography>
                    ))}
                </Paper>
            </Stack>
        );
    };

    return (
        <Stack>
            <Header title="환율 설정">
                <ImportExport
                    target={Object.fromEntries(rates)}
                    fileName="ExchangeRates.json"
                    onImport={(importedRates) => {
                        const newRates = new Map<string, CurrencyItem>(Object.entries(importedRates));
                        setRates(newRates);
                        handleSaveConfirmed(true);
                    }}
                />
            </Header>

            <Stack direction={"column"} paddingLeft={2} spacing={3}>
                <NewItemInput onAdd={handleAddConfirmed} />
                <Divider variant="middle" />
                <Paper variant="elevation">
                    {Array.from(rates.values())
                        .filter((item: CurrencyItem) => item.currency !== "KRW")
                        .sort(sortRates)
                        .map((item, idx) => {
                            return (
                                <Stack key={idx}>
                                    {idx !== 0 && <Divider key={`divider-${idx}`} variant="fullWidth" />}
                                    <RateForm
                                        key={idx}
                                        rateItem={item}
                                        onChange={(e) => {
                                            onRateInputChange(item, e.target.value);
                                        }}
                                        onRemove={(item) => {
                                            handleRemoveConfirmed(item);
                                        }}
                                    />
                                </Stack>
                            );
                        })}
                </Paper>
                <Divider variant="middle" />
                <Button variant="outlined" onClick={onSaveClick}>
                    저장
                </Button>
            </Stack>

            <Typography variant="body2" color="textSecondary" textAlign="end" my={1.5} mr={0.3}>
                {lastUpdated && `마지막 저장: ${lastUpdated.toLocaleString()}`}
            </Typography>
            {exampleCalculation()}
            <AlertDialog
                content="환율 정보를 저장하시겠습니까?"
                isOpen={isAlertOpen.saveButton}
                onClose={handleSaveConfirmed}
            />
        </Stack>
    );
}
