import { ArrowDropDown, Remove, SwapHoriz } from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    Paper,
    Stack,
    SxProps,
    TextField,
    Theme,
    Typography,
    useTheme,
} from "@mui/material";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import ExchangeRateUtil, { CurrencyItem, ExchangeRateMap } from "../../../background/inject-dom/exchangeRateUtil";

const renderHeader = (title: string) => (
    <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2, userSelect: "none" }}>
        <Typography variant="h4" fontWeight={100}>
            환율 조정
        </Typography>
    </Stack>
);
interface InputLayoutProps {
    section1: ReactElement;
    section2?: ReactElement;
    section3: ReactElement;
    section4: ReactElement;
}
function InputLayout({
    section1,
    section2 = (
        <Stack alignItems="center">
            <SwapHoriz />
        </Stack>
    ),
    section3,
    section4,
}: InputLayoutProps) {
    return (
        <Stack>
            <Grid container spacing={1} padding={1.5} alignItems="center" justifyContent="center">
                <Grid size={1}></Grid>
                <Grid size={3}>{section1}</Grid>
                <Grid size={2} justifyContent="center" alignItems="center">
                    {section2}
                </Grid>
                <Grid size={3}>{section3}</Grid>
                <Grid size={2}>{section4}</Grid>
            </Grid>
        </Stack>
    );
}

function ValueTextField({
    value,
    onChange,
}: {
    value: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value?.replaceAll(",", "");
        const numericValue = isNaN(Number(value)) ? "1" : value;
        onChange?.({ ...event, target: { ...event.target, value: numericValue } });
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
            value={isNaN(Number(value)) ? "1" : Number(value) === 0 ? "1" : Number(value).toLocaleString()}
            onChange={handleChange}
        ></TextField>
    );
}
interface RateInputProps {
    rateItem: CurrencyItem;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (item: CurrencyItem) => void;
}

function RateForm({ rateItem, onChange, onRemove }: RateInputProps) {
    const theme = useTheme();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState("transparent");

    const onRemoveClicked = () => {
        setBackgroundColor(theme.palette.grey[200]);
        setIsAlertOpen(true);
    };

    const handleRemoveAlertClose = (result: boolean) => {
        setIsAlertOpen(false);
        setBackgroundColor("transparent");
        if (result) {
            onRemove(rateItem);
        }
    };

    return (
        <Stack position="relative" width="100%" sx={{ backgroundColor: backgroundColor }}>
            <InputLayout
                section1={
                    <Typography variant="subtitle1" textAlign="center">
                        1 {rateItem.currency}
                    </Typography>
                }
                section3={<ValueTextField value={rateItem.valueInKRW} onChange={onChange} />}
                section4={
                    <Typography variant="subtitle1" textAlign="center">
                        KRW
                    </Typography>
                }
            />
            {rateItem.isAdded && (
                <Button
                    color="error"
                    sx={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        p: 1,
                        minWidth: 0,
                    }}
                    onClick={() => {
                        setIsAlertOpen(true);
                    }}
                >
                    <Remove onClick={onRemoveClicked} />
                </Button>
            )}

            <AlertDialog
                content={`해당 환율 정보를 삭제하시겠습니까?`}
                isOpen={isAlertOpen}
                onClose={handleRemoveAlertClose}
            />
        </Stack>
    );
}
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
function NewItemInput({ onAdd, sx, ...props }: NewItemInputProps) {
    const theme = useTheme();
    const [currency, setCurrency] = useState("USD");
    const [value, setValue] = useState("");
    const [accState, setAccState] = useState<AccordionState>({
        isMouseOver: false,
        isExpanded: false,
        backgroundColor: "transparent",
        textColor: "inherit",
    });

    useEffect(() => {
        if (accState.isMouseOver && !accState.isExpanded) {
            setAccState((prev) => ({ ...prev, backgroundColor: theme.palette.text.primary, textColor: "white" }));
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
                                if (onAdd) {
                                    const newValue = isNaN(Number(value)) ? 1 : Number(value);
                                    const newItem = new CurrencyItem({ currency, valueInKRW: newValue, isAdded: true });
                                    onAdd(newItem);
                                }
                            }}
                        >
                            추가
                        </Button>
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </Stack>
    );
}
// TODO: AlertDialog 컴포넌트는 공통으로 사용할 수 있게 별도 파일로 분리하기
// TODO: content \n를 <br />로 구분해서 여러줄 지원하게 하기
interface AlertDialogProps {
    isOpen: boolean;
    onClose: (result: boolean) => void;
    content?: React.ReactElement | string;
}
function AlertDialog({ isOpen, onClose, content }: AlertDialogProps) {
    const dialogDiv = useRef<HTMLDivElement | null>(null);
    const isDragging = useRef(false);
    const dragOrigin = useRef({ mouseX: 0, mouseY: 0, elemTop: 0, elemLeft: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !dialogDiv.current) return;
            const deltaX = e.clientX - dragOrigin.current.mouseX;
            const deltaY = e.clientY - dragOrigin.current.mouseY;
            dialogDiv.current.style.top = `${dragOrigin.current.elemTop + deltaY}px`;
            dialogDiv.current.style.left = `${dragOrigin.current.elemLeft + deltaX}px`;
        };
        const handleMouseUp = () => {
            isDragging.current = false;
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dialogDiv.current) return;
        const rect = dialogDiv.current.getBoundingClientRect();
        // transform을 제거하고 실제 픽셀 위치로 고정
        dialogDiv.current.style.transform = "none";
        dialogDiv.current.style.top = `${rect.top}px`;
        dialogDiv.current.style.left = `${rect.left}px`;
        isDragging.current = true;
        dragOrigin.current = { mouseX: e.clientX, mouseY: e.clientY, elemTop: rect.top, elemLeft: rect.left };
    };

    const onChange = () => {};
    return (
        <Dialog
            open={isOpen}
            onChange={onChange}
            onClose={() => onClose(false)}
            PaperComponent={(props) => {
                return (
                    <div
                        ref={dialogDiv}
                        id="alertDialog"
                        onMouseDown={onMouseDown}
                        style={{
                            position: "fixed",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            cursor: "move",
                        }}
                    >
                        <Paper {...props} sx={{ maxWidth: 500 }}></Paper>
                    </div>
                );
            }}
        >
            <DialogTitle sx={{ userSelect: "none" }}>확인</DialogTitle>
            <DialogContent>
                <Typography sx={{ userSelect: "none" }}>{content}</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>취소</Button>
                <Button
                    autoFocus
                    variant="contained"
                    color="primary"
                    onClick={() => {
                        onClose(true);
                    }}
                >
                    확인
                </Button>
            </DialogActions>
        </Dialog>
    );
}

const currencyOrder = ["SDR", "USD", "EUR", "GBP", "CNY", "JPY"];
export function ExchangeRate() {
    const [isInitialized, setIsInitialized] = useState(false);
    const [rates, setRates] = useState<ExchangeRateMap>(ExchangeRateUtil.rates);
    // TODO: 내보내기/가져오기 기능 추가하기 (파일로 저장/불러오기 or 클립보드 복사/붙여넣기)
    // TODO: 아래 각 컴포넌트로 돌려보내기
    const [isAlertOpen, setIsAlertOpen] = useState({ saveButton: false, addButton: false, removeButton: false });
    const [tempNewItem, setTempNewItem] = useState<CurrencyItem>({ currency: "", valueInKRW: 1, isAdded: true });

    useEffect(() => {
        if (isInitialized) return;

        ExchangeRateUtil.loadRates().then(() => {
            setRates(ExchangeRateUtil.rates);
            setIsInitialized(true);
        });
    }, []);

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

    const onAddClicked = (item: CurrencyItem) => {
        setTempNewItem(item);
        setIsAlertOpen({ addButton: true, saveButton: false, removeButton: false });
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
        setIsAlertOpen({ addButton: false, saveButton: true, removeButton: false });
    };

    const handleSaveConfirmed = async (result: boolean) => {
        setIsAlertOpen({ addButton: false, saveButton: false, removeButton: false });
        if (result) {
            await ExchangeRateUtil.updateRates(rates);
        }
    };

    const handleRemoveConfirmed = async (item: CurrencyItem) => {
        setIsAlertOpen({ addButton: false, saveButton: false, removeButton: false });
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
            {renderHeader("환율 조정")}
            <Divider variant="fullWidth" sx={{ mb: 2 }} />
            <Stack direction={"column"} paddingLeft={2} paddingTop={2} spacing={3}>
                <NewItemInput onAdd={onAddClicked} />
                <Divider variant="middle" />
                <Paper variant="elevation">
                    {Array.from(rates.values())
                        .filter((item) => item.currency !== "KRW")
                        .sort(sortRates)
                        .map((item, idx) => {
                            return (
                                <Stack>
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
                <AlertDialog
                    content={
                        <>
                            <span>환율 정보를 추가하시겠습니까?</span>
                            <br />
                            <span>이미 존재하는 통화의 경우 환율 정보가 업데이트됩니다.</span>
                        </>
                    }
                    isOpen={isAlertOpen.addButton}
                    onClose={async (result) => {
                        setIsAlertOpen({ addButton: false, saveButton: false, removeButton: false });
                        if (result) {
                            handleAddConfirmed(tempNewItem);
                        }
                    }}
                />
                <AlertDialog
                    content="환율 정보를 저장하시겠습니까?"
                    isOpen={isAlertOpen.saveButton}
                    onClose={handleSaveConfirmed}
                />
            </Stack>
        </Stack>
    );
}
