import { ArrowDropDown } from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Stack,
    SxProps,
    TextField,
    Theme,
    Typography,
    useTheme,
} from "@mui/material";
import { useEffect, useState } from "react";
import AlertDialog from "../../../components/alertDialog";
import InputLayout from "./inputLayout";
import ValueTextField from "./valueTextField";
import { CurrencyItem } from "@/common/exchangeRateUtil";

interface NewItemInputProps {
    onAdd?: (item: CurrencyItem) => void;
    sx?: SxProps<Theme>;
    [key: string]: any;
}
interface AccordionState {
    isMouseOver: boolean;
    isExpanded: boolean;
    backgroundColor: string;
    textColor: string;
}
export default function NewItemInput({ onAdd, sx, ...props }: NewItemInputProps) {
    const theme = useTheme();
    const [currency, setCurrency] = useState("USD");
    const [value, setValue] = useState("");
    const [accState, setAccState] = useState<AccordionState>({
        isMouseOver: false,
        isExpanded: false,
        backgroundColor: "transparent",
        textColor: "inherit",
    });
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    useEffect(() => {
        if (accState.isMouseOver && !accState.isExpanded) {
            setAccState((prev) => ({ ...prev, backgroundColor: theme.palette.primary.main, textColor: "white" }));
        } else {
            setAccState((prev) => ({ ...prev, backgroundColor: "transparent", textColor: "inherit" }));
        }
    }, [accState.isMouseOver, accState.isExpanded, theme]);

    return (
        <Stack sx={{ ...sx }}>
            <Accordion
                sx={{
                    mt: 0,
                    background: accState.backgroundColor,
                    color: accState.textColor,
                    transition: "background-color 0.3s, color 0.3s",
                }}
                {...props}
                expanded={accState.isExpanded}
                onChange={() => {
                    setAccState((prev) => {
                        if (prev.isExpanded) {
                            return { ...prev, isExpanded: false, backgroundColor: "transparent", textColor: "inherit" };
                        }
                        return { ...prev, isExpanded: true };
                    });
                }}
                onMouseEnter={() => setAccState((prev) => ({ ...prev, isMouseOver: true }))}
                onMouseLeave={() => setAccState((prev) => ({ ...prev, isMouseOver: false }))}
            >
                <AccordionSummary expandIcon={<ArrowDropDown />} sx={{ userSelect: "none" }}>
                    <Typography
                        variant="subtitle1"
                        letterSpacing={4}
                        fontWeight={500}
                        textAlign="center"
                        width={"100%"}
                    >
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
                                        onChange={(e) => setCurrency(e.target.value?.toUpperCase())}
                                        sx={{ width: 80 }}
                                        slotProps={{ htmlInput: { maxLength: "3" } }}
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
                        <Button
                            variant="outlined"
                            sx={{ width: "85%", my: 1.5 }}
                            onClick={() => {
                                setIsAlertOpen(true);
                            }}
                        >
                            추가
                        </Button>
                    </Stack>
                </AccordionDetails>
            </Accordion>
            <AlertDialog
                content={`
                        환율 정보를 추가하시겠습니까?\n
                        이미 존재하는 통화의 경우 환율 정보가 업데이트됩니다.
                    `}
                isOpen={isAlertOpen}
                onClose={(result) => {
                    setIsAlertOpen(false);
                    if (result) {
                        const newValue = isNaN(Number(value)) ? 1 : Number(value);
                        const newItem = new CurrencyItem({ currency, valueInKRW: newValue, isAdded: true });
                        onAdd?.(newItem);
                    }
                }}
            />
        </Stack>
    );
}
