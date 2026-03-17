import { TravelExplore } from "@mui/icons-material";
import { AppBar, Box, Paper, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { IMICSettings } from "../../lib/IMICSettings";
import { GeneralSettings } from "./tabs/generalSettings";
import { ImportExport } from "./tabs/importExport";
import { PersonalRemarks } from "./tabs/personalRemarks";

export default function OptionsApp() {
    const settings = useRef(new IMICSettings());
    const [initialized, setInitialized] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        if (!initialized) {
            void (async () => {
                await settings.current.loadOptions();
                console.log("options_app.tsb: settings loaded", settings.current);
                setInitialized(true);
            })();
        }
    }, []);

    return (
        <Paper>
            <AppBar position="sticky" color="primary">
                <Toolbar>
                    <TravelExplore sx={{ mr: 1 }} />
                    <Typography variant="h6">IMIC TrackPost Extension Settings</Typography>
                </Toolbar>
            </AppBar>

            {!initialized ? (
                ""
            ) : (
                <Box sx={{ display: "flex", flexGrow: 1, overflow: "auto", height: "88vh" }}>
                    <Tabs
                        variant="fullWidth"
                        value={tabValue}
                        onChange={(_e, n) => setTabValue(n)}
                        orientation="vertical"
                        sx={{ borderRight: 1, borderColor: "divider" }}
                    >
                        <Tab label="General" />
                        <Tab label="Personal Remarks" />
                        <Tab label="Import/Export" />
                    </Tabs>
                    <Box sx={{ padding: "10px" }}>
                        <Box sx={{ display: tabValue === 0 ? "block" : "none" }}>
                            <GeneralSettings settings={settings} />
                        </Box>
                        <Box sx={{ display: tabValue === 1 ? "block" : "none" }}>
                            <PersonalRemarks settings={settings} />
                        </Box>
                        <Box sx={{ display: tabValue === 2 ? "block" : "none" }}>
                            <ImportExport settings={settings} />
                        </Box>
                    </Box>
                </Box>
            )}
        </Paper>
    );
}
