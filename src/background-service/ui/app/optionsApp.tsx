import { IMICSettings } from "@/common/IMICSettings";
import { TravelExplore } from "@mui/icons-material";
import { AppBar, Box, Paper, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import About from "./tabs/about/about";
import About2 from "./tabs/about/about2";
import ExchangeRate from "./tabs/exhcnage-rate/exchangeRate";
import { GeneralSettings } from "./tabs/genral-settings/generalSettings";
import { PersonalRemarks } from "./tabs/personal-remarks/personalRemarks";

const tabs = ["general", "remarks", "exchange", "about", "about2"];
export default function OptionsApp() {
    const settings = useRef(new IMICSettings());
    const [initialized, setInitialized] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    useEffect(() => {
        if (!initialized) {
            void (async () => {
                await settings.current.loadOptions();
                const tabSelected = new URLSearchParams(window.location.search).get("tab");
                if (tabSelected) {
                    const tabIndex = tabs.indexOf(tabSelected);
                    if (tabIndex >= 0) setTabValue(tabIndex);
                }
                console.log("options_app.tsb: settings loaded", settings.current);
                setInitialized(true);
            })();
        }
    }, []);

    useEffect(() => {
        if (!initialized) return;
        // set the current tab to url query for deep linking
        const tabName = tabs[tabValue];
        const newUrl = `${window.location.pathname}?tab=${tabName}`;
        window.history.replaceState(null, "", newUrl);
    }, [tabValue]);

    return (
        <Paper>
            <AppBar position="sticky" color="primary">
                <Toolbar>
                    <TravelExplore sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ userSelect: "none" }}>
                        IMIC TrackPost Extension Settings
                    </Typography>
                </Toolbar>
            </AppBar>

            {!initialized ? (
                ""
            ) : (
                <Box sx={{ display: "flex", flexGrow: 1, overflow: "auto", minHeight: "88vh" }}>
                    <Tabs
                        id="tab-container"
                        variant="fullWidth"
                        value={tabValue}
                        onChange={(_e, n) => setTabValue(n)}
                        orientation="vertical"
                        sx={{ borderRight: 1, borderColor: "divider", minHeight: "88vh", minWidth: "180px" }}
                    >
                        <Tab label="Notifications" />
                        <Tab label="Personal Remarks" />
                        <Tab label="Exchange Rates" />
                        <Tab label="About" />
                        <Tab label="About2" />
                    </Tabs>
                    <Box sx={{ padding: "10px", width: "100%" }}>
                        <Box sx={{ display: tabValue === 0 ? "block" : "none", width: "585px" }}>
                            <GeneralSettings settings={settings} />
                        </Box>
                        <Box sx={{ display: tabValue === 1 ? "block" : "none", width: "576px" }}>
                            <PersonalRemarks settings={settings} />
                        </Box>
                        <Box sx={{ display: tabValue === 2 ? "block" : "none", width: "585px" }}>
                            <ExchangeRate />
                        </Box>
                        {tabValue === 3 && (
                            <Box sx={{ display: tabValue === 3 ? "block" : "none" }}>
                                <About />
                            </Box>
                        )}
                        {tabValue === 4 && (
                            <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
                                <About2 />
                            </Box>
                        )}
                    </Box>
                </Box>
            )}
        </Paper>
    );
}
