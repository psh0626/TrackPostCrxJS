import manifest from "@/../manifest.json";
import { Info, Refresh } from "@mui/icons-material";
import { Button, Divider, Paper, Stack, Typography } from "@mui/material";
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
    return (
        <Button
            variant="text"
            sx={{ justifyContent: "flex-start", paddingLeft: 0 }}
            onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
        >
            <Info color={color === "textDisabled" ? "disabled" : "inherit"} sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight={600} color={color}>
                {children}
            </Typography>
        </Button>
    );
}

export default function About() {
    return (
        <Stack>
            <Paper className="gradient-border" elevation={8} sx={{ p: 1.5, ml: 7, mt: 7 }}>
                <Stack sx={{ m: 4, mb: 1.6 }}>
                    <Typography variant="h4" fontWeight={800}>
                        IMIC TrackPost 확장 프로그램
                    </Typography>

                    <Button sx={{ ml: "auto", minWidth: 45 }} onClick={() => window.location.reload()}>
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
                    <ButtonLink color="textDisabled" href="https://github.com/psh0626/TrackPostExtZip/commits/main/">
                        업데이트 노트 (v3.1.11 이전)
                    </ButtonLink>
                </Stack>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="body2" fontStyle="italic" color="textDisabled" textAlign="right" sx={{ mb: 1, mr: .5}}>
                    developed by Park Sunghoon - pshsh0626@gmail.com
                </Typography>
            </Paper>
        </Stack>
    );
}
