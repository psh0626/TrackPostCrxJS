import { Button, Divider, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import AlertDialog from "../../../components/alertDialog";
import ImportExport from "../import-export/importExport";
import NewItemInput from "./newItemInput";
import RateForm from "./rateForm";
import ExchangeRateUtil, { ExchangeRateMap, CurrencyItem } from "../../../../../lib/exchangeRateUtil";

const renderHeader = (title: string) => (
    <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ userSelect: "none" }}>
        <Typography variant="h4" fontWeight={100}>
            환율 조정
        </Typography>
    </Stack>
);

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
        setRates((prevRates) => {
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
            setRates((prevRates) => {
                const newRates = new Map(prevRates);
                newRates.delete(item.currency);
                return newRates;
            });
        }
    };

    return (
        <Stack>
            <Stack direction={"row"} justifyContent="space-between" alignItems="end" padding={2}>
                {renderHeader("환율 조정")}
                <ImportExport
                    target={Object.fromEntries(rates)}
                    fileName="MyExchangeRates.json"
                    onImport={(importedRates) => {
                        const newRates = new Map<string, CurrencyItem>(Object.entries(importedRates));
                        setRates(newRates);
                        handleSaveConfirmed(true);
                    }}
                />
            </Stack>
            <Divider variant="fullWidth" sx={{ mb: 2 }} />

            <Stack direction={"column"} paddingLeft={2} paddingTop={2} spacing={3}>
                <NewItemInput onAdd={handleAddConfirmed} />
                <Divider variant="middle" />
                <Paper variant="elevation">
                    {Array.from(rates.values())
                        .filter((item) => item.currency !== "KRW")
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
                <Typography variant="body2" color="textSecondary">
                    {lastUpdated && `마지막 저장: ${lastUpdated.toLocaleString()}`}
                </Typography>
                <AlertDialog
                    content="환율 정보를 저장하시겠습니까?"
                    isOpen={isAlertOpen.saveButton}
                    onClose={handleSaveConfirmed}
                />
            </Stack>
        </Stack>
    );
}
