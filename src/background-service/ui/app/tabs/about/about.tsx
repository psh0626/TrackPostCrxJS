import manifest from "@/../manifest.json";
import { checkUpdate } from "@/background-service/serviceworker";
import { Info, Refresh } from "@mui/icons-material";
import { Button, Divider, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";
import AlertDialog from "../components/alertDialog";
import "./about.css";

interface ButtonLinkProps {
    href: string;
    color?:
        | "primary"
        | "secondary"
        | "success"
        | "error"
        | "info"
        | "warning"
        | "textPrimary"
        | "textSecondary"
        | "textDisabled";
    children?: React.ReactNode;
}

function ButtonLink({ href, color, children }: ButtonLinkProps) {
    const openLink = async () => {
        await chrome.tabs.create({ active: true, url: href });
    };
    return (
        <Button variant="text" sx={{ justifyContent: "flex-start", paddingLeft: 0 }} onClick={openLink}>
            <Info color={color === "textDisabled" ? "disabled" : "inherit"} sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight={600} color={color}>
                {children}
            </Typography>
        </Button>
    );
}

export default function About() {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    return (
        <Stack>
            <Paper className="gradient-border" elevation={8} sx={{ p: 1.5, ml: 7, mt: 7 }}>
                <Stack sx={{ m: 4, mb: 1.6 }}>
                    <Typography variant="h4" fontWeight={800}>
                        IMIC TrackPost 확장 프로그램
                    </Typography>

                    <Button
                        sx={{ ml: "auto", minWidth: 45 }}
                        onClick={() =>
                            checkUpdate().then((status) => {
                                if (status.status === "no_update") {
                                    setIsAlertOpen(true);
                                }
                            })
                        }
                    >
                        <Refresh color="disabled" sx={{ mr: 1 }} />
                        <Typography
                            variant="subtitle1"
                            color="text.secondary"
                            textAlign={"right"}
                            sx={{ position: "relative" }}
                        >
                            버전 {manifest.version}
                        </Typography>
                    </Button>
                </Stack>
                <Divider sx={{ mb: 3, borderBottomWidth: 1, bgcolor: "divider" }} />
                <Stack spacing={3} sx={{ pl: 3.5, mb: 3 }}>
                    <ButtonLink href="https://github.com/psh0626/TrackPostExtZip/">IMIC TrackPost 정보</ButtonLink>
                    <ButtonLink href="https://github.com/psh0626/TrackPostExtZip/releases">
                        업데이트 노트 (v3.1.12 이후)
                    </ButtonLink>
                    <ButtonLink
                        color="textDisabled"
                        href="https://github.com/psh0626/TrackPostExtZip/releases/tag/v3.1.12"
                    >
                        업데이트 노트 (v3.1.12 이전)
                    </ButtonLink>
                </Stack>
                <Divider sx={{ mb: 1 }} />
                <Typography
                    variant="body2"
                    fontStyle="italic"
                    color="textDisabled"
                    textAlign="right"
                    sx={{ mb: 1, mr: 0.5 }}
                >
                    developed by Park Sunghoon - pshsh0626@gmail.com
                </Typography>
            </Paper>
            <AlertDialog
                content="현재 최신 버전입니다."
                okOnly={true}
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
            />
        </Stack>
    );
}
