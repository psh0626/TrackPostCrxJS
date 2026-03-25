import { ExpandMore, SwapHoriz } from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Divider,
    Grid,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import ExchangeRateUtil from "../../../background/inject-dom/exchangeRateUtil";

const renderHeader = (title: string) => (
    <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2, userSelect: "none" }}>
        <Typography variant="h4" fontWeight={100}>
            환율 조정
        </Typography>
    </Stack>
);

const InputLayout = ({
    section1,
    section2 = <Stack alignItems="center"><SwapHoriz /></Stack>,
    section3,
    section4,
}: {
    section1: ReactElement;
    section2?: ReactElement;
    section3: ReactElement;
    section4: ReactElement;
}) => (
    <Stack>
        <Grid container spacing={1} padding={1.5} alignItems="center" justifyContent="center">
            <Grid size={3}>{section1}</Grid>
            <Grid size={2} justifyContent="center" alignItems="center">
                {section2}
            </Grid>
            <Grid size={3}>{section3}</Grid>
            <Grid size={2}>{section4}</Grid>
        </Grid>
    </Stack>
);

const ValueTextField = ({
    value,
    onChange,
}: {
    value: string | number;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value?.replaceAll(",", "");
        onChange({ ...event, target: { ...event.target, value: value } });
    };
    return (
        <TextField
            variant="outlined"
            size="small"
            slotProps={{
                input: {
                    inputMode: "numeric",
                },
                htmlInput: { sx: { textAlign: "right" } },
            }}
            value={isNaN(Number(value)) ? "0" : Number(value).toLocaleString()}
            onChange={handleChange}
        ></TextField>
    );
};

const renderRateInput = (
    rateName: string,
    rateValueInKRW: string | number,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void,
) => {
    return (
        <Stack>
            <Divider />
            <InputLayout
                section1={
                    <Typography variant="subtitle1" textAlign="center">
                        1 {rateName}
                    </Typography>
                }
                section3={<ValueTextField value={rateValueInKRW} onChange={onChange} />}
                section4={
                    <Typography variant="subtitle1" textAlign="center">
                        KRW
                    </Typography>
                }
            />
        </Stack>
    );
};

const NewItemInput = ({ sx, ...props }: { sx?: any; [key: string]: any }) => {
    const [currency, setCurrency] = useState("USD");
    const [value, setValue] = useState("");

    return (
        <Accordion sx={sx} {...props}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ userSelect: "none" }}>
                <Typography variant="subtitle1" textAlign="center">
                    환율 항목 추가
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Stack justifyContent="center" alignItems="center">
                    <InputLayout
                        section1={
                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
                                <Typography variant="subtitle1" textAlign="center">
                                    1
                                </Typography>
                                <TextField
                                    variant="outlined"
                                    size="small"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    sx={{ width: 80 }}
                                />
                            </Stack>
                        }
                        section3={<ValueTextField value={value} onChange={(e) => setValue(e.target.value)} />}
                        section4={
                            <Typography variant="subtitle1" textAlign="center">
                                KRW
                            </Typography>
                        }
                    />
                    <Button variant="outlined" sx={{ width: "90%", mb: 1.5 }}>
                        추가
                    </Button>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
};

const currencyOrder = ["SDR", "USD", "EUR", "GBP", "CNY", "JPY"];
export const ExchangeRate = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [rates, setRates] = useState<{ [key: string]: number }>(ExchangeRateUtil.rates);
    useEffect(() => {
        if (isInitialized) return;

        ExchangeRateUtil.loadRates().then(() => {
            setRates({ ...ExchangeRateUtil.rates });
            setIsInitialized(true);
        });
    }, []);

    return (
        <Stack>
            {renderHeader("환율 조정")}
            <Divider variant="fullWidth" sx={{ mb: 2 }} />
            <Stack paddingLeft={2}>
                <NewItemInput sx={{ mt: 2 }} />
                <Divider variant="middle" sx={{ mt: 2 }} />
                <Paper variant="elevation" sx={{ mt: 2 }}>
                    {Object.keys(rates)
                        .sort((a, b) => currencyOrder.indexOf(a) - currencyOrder.indexOf(b))
                        .map((currency) => {
                            if (currency === "KRW") return null;
                            return renderRateInput(currency, rates[currency], (event) => {
                                const newRates = { ...rates, [currency]: parseFloat(event.target.value) };
                                setRates(newRates);
                            });
                        })}
                </Paper>
            </Stack>
        </Stack>
    );
};
