import { Remove } from "@mui/icons-material";
import { Button, Stack, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { CurrencyItem } from "../../../../lib/exchangeRateUtil";
import AlertDialog from "../../../components/alertDialog";
import InputLayout from "./inputLayout";
import ValueTextField from "./valueTextField";

interface RateFormProps {
    rateItem: CurrencyItem;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (item: CurrencyItem) => void;
}

export default function RateForm({ rateItem, onChange, onRemove }: RateFormProps) {
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
