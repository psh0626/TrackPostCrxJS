import { Add, Height, TravelExplore } from "@mui/icons-material";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  Divider,
  Fab,
  Paper,
  Stack,
  Tab,
  Tabs,
} from "@mui/material";
import { useState } from "react";
import React from "react";
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}>
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}
export default function OptionsApp() {
  const [tab_value, set_tab_value] = useState(0);

  return (
    <Paper>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <TravelExplore sx={{ mr: 1 }} />
          <Typography variant="h6">IMIC TrackPost Extension Settings</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flexGrow: 1, height: "90vh" }}>
        <Tabs
          variant="fullWidth"
          value={tab_value}
          onChange={(_e, n) => set_tab_value(n)}
          orientation="vertical"
          sx={{ borderRight: 1, borderColor: "divider" }}>
          <Tab label="Personal Remarks" />
          <Tab label="Info" />
        </Tabs>
        <TabPanel value={tab_value} index={0}>
          <Stack spacing={2} padding={1} direction="row" alignItems="end" sx={{ mb: 2 }}>
            <Typography variant="h4" fontWeight={700} color="initial" sx={{width: 500}}>
              ICare Personal Remarks
            </Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} variant="fullWidth" />
          <Stack alignItems="end">
            <Fab color="primary" variant="extended" size="small" sx={{ mb: 3 }}>
              <Add sx={{ mr: 1 }} />
              <Typography sx={{ mr: 1 }} variant="body2">
                템플릿 추가
              </Typography>
            </Fab>
          </Stack>
          <Card>
            <CardActionArea>
              <CardContent sx={{height: 150}}>
                <Typography gutterBottom variant="h5" component="div">
                  제목
                </Typography>
                <Divider sx={{mt: 2, mb: 1}} />
                <Typography variant="body2" color="text.secondary">
                  내용
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </TabPanel>
        <TabPanel value={tab_value} index={1}></TabPanel>
      </Box>
    </Paper>
  );
}
