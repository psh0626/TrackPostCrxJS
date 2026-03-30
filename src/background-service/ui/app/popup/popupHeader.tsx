import { Info, Settings, TravelExplore } from "@mui/icons-material";
import { AppBar, Button, colors, Stack, Toolbar, Typography } from "@mui/material";
import { ReactNode } from "react";

async function openOptionsPage() {
    const optionsUrl = chrome.runtime.getURL("/src/background-service/ui/options.html");
    const [openedOptionsPage] = await chrome.tabs.query({ url: optionsUrl });
    if (openedOptionsPage) {
        // if options page is already open, focus on it
        await chrome.tabs.update(openedOptionsPage?.id, { active: true, url: optionsUrl + "?tab=about" });
    } else {
        // if options page is not open, open it in a new tab
        window.open(optionsUrl + "?tab=about", "_blank");
    }
}
interface nested_component {
    children?: ReactNode;
}
export default function PopupHeader({ children }: nested_component) {
    const myHeight = "48px";
    return (
        <Stack color={colors.deepOrange} marginBottom="28px" height={myHeight}>
            <AppBar position="fixed" color="primary" sx={{ height: myHeight }}>
                <Toolbar sx={{ height: myHeight, minHeight: 0, pr: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
                        <Stack direction="row" alignItems="center">
                            <TravelExplore sx={{ mr: 1 }} />
                            <Typography variant="h6" textAlign="start" fontWeight={700} sx={{ userSelect: "none" }}>
                                국제우편 행방조사
                            </Typography>
                        </Stack>
                        <Stack direction="row">
                            <Button
                                variant="text"
                                color="inherit"
                                sx={{ minWidth: 45 }}
                                onClick={() => openOptionsPage()}
                            >
                                <Info />
                            </Button>
                            <Button
                                variant="text"
                                color="inherit"
                                sx={{ minWidth: 45 }}
                                onClick={() => chrome.runtime.openOptionsPage()}
                            >
                                <Settings />
                            </Button>
                        </Stack>
                    </Stack>
                </Toolbar>
            </AppBar>
            {children}
        </Stack>
    );
}
