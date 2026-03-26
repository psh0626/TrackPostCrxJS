import { SwapHoriz } from "@mui/icons-material";
import { Grid, Stack } from "@mui/material";
import { ReactElement } from "react";

interface InputLayoutProps {
    section1: ReactElement;
    section2?: ReactElement;
    section3: ReactElement;
    section4: ReactElement;
}
export default function InputLayout({
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
