import { Divider, Stack, Typography } from "@mui/material";

function Header({ title, children }: { title: string; children?: React.ReactNode }) {
    return (
        <>
            <Stack direction={"row"} justifyContent="space-between" alignItems="end" padding={2}>
                <Stack spacing={2} padding={0.2} direction="row" alignItems="end" sx={{ userSelect: "none" }}>
                    <Typography variant="h4" fontWeight={200}>
                        {title}
                    </Typography>
                </Stack>
                {children}
            </Stack>
            <Divider variant="fullWidth" sx={{ mb: 4 }} />
        </>
    );
}

export default Header;
