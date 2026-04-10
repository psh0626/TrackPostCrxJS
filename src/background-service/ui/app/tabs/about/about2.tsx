import manifest from "@/../manifest.json";
import { checkUpdate } from "@/background-service/serviceworker";
import { ArrowDropDown, Refresh } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Typography } from "@mui/material";
import { loadExternalPushInteraction } from "@tsparticles/interaction-external-push";
import { loadExternalRepulseInteraction } from "@tsparticles/interaction-external-repulse";
import { loadTrianglesPreset } from "@tsparticles/preset-triangles";
import Particles, { initParticlesEngine, IParticlesProps } from "@tsparticles/react";
import { loadLifeUpdater } from "@tsparticles/updater-life";
import React, { useEffect, useState } from "react";
import AlertDialog from "../components/alertDialog";
import "./about2.css";

const options = {
    preset: "triangles",
    fullScreen: { enable: false },
    background: {
        opacity: 0,
    },
    detectRetina: true,
    particles: {
        color: { value: "#333333" },
        number: { density: { enable: true } },
        move: { speed: 1 },
        links: { color: { value: "#333333" } },
    },
    interactivity: {
        detectsOn: "window",
        events: { onHover: { enable: true, mode: "repulse" }, onClick: { enable: true, mode: "push" } },
        modes: {
            repulse: { distance: 300, maxSpeed: 1 },
            push: {
                quantity: 4,
                particles: {
                    life: {
                        count: 1,
                        delay: { value: 0.1 },
                        duration: { value: 3 },
                    },
                },
            },
        },
    },
    pauseOnBlur: true,
    pauseOnOutsideViewport: true,
} as const as IParticlesProps["options"];
export default function About2() {
    const [init, setInit] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<React.ReactElement | null>(null);

    const fetchUpdateInfo = async () => {
        fetch("https://github.com/psh0626/TrackPostExtZip/releases/tag/v3.1.37").then(async (res) => {
            const html = await res.text();

            const newDiv = document.createElement("div");
            newDiv.innerHTML = html;
            const content = newDiv.querySelector<HTMLDivElement>(`div[data-test-selector="body-content"]`);
            const reactElement = React.createElement("div", {
                dangerouslySetInnerHTML: { __html: content?.innerHTML ?? "" },
            });
            setUpdateInfo(reactElement);
        });
    };
    useEffect(() => {
        void initParticlesEngine(async (engine) => {
            await loadExternalRepulseInteraction(engine, false);
            await loadExternalPushInteraction(engine, false);
            await loadLifeUpdater(engine, false);
            await loadTrianglesPreset(engine, true);
        }).then(() => setInit(true));
    }, []);

    if (init) {
        return (
            <div id="about2-root">
                <Stack
                    direction="column"
                    alignItems="center"
                    justifyContent="center"
                    sx={{ position: "relative", zIndex: 1, height: "100%" }}
                    p={7}
                >
                    <Stack id="title-container" spacing={-1.5} mb={10}>
                        <Button
                            id="app-version"
                            variant="text"
                            size="small"
                            startIcon={<Refresh color="disabled" />}
                            onClick={() =>
                                checkUpdate().then((update) => {
                                    if (update.status === "no_update") {
                                        setIsAlertOpen(true);
                                    }
                                })
                            }
                            sx={{ width: "fit-content", alignSelf: "flex-end", textTransform: "none" }}
                        >
                            <Typography color="text.secondary" variant="subtitle1" fontWeight={300}>
                                version {manifest.version}
                            </Typography>
                        </Button>
                        <a href="https://github.com/psh0626/TrackPostExtZip/" target="_blank" rel="noopener noreferrer">
                            <Typography id="app-title" variant="h2" fontWeight={800}>
                                IMIC TrackPost
                            </Typography>
                        </a>
                    </Stack>

                    <Stack width={500}>
                        <Accordion>
                            <AccordionSummary expandIcon={<ArrowDropDown />}>
                                <Typography variant="h5" fontWeight={300} textAlign="center" width="100%">
                                    v{manifest.version} 업데이트 노트
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>{updateInfo ?? "SDFA"}</AccordionDetails>
                        </Accordion>
                    </Stack>
                </Stack>
                <AlertDialog
                    content="현재 최신 버전입니다."
                    okOnly={true}
                    isOpen={isAlertOpen}
                    onClose={() => setIsAlertOpen(false)}
                />
                <Particles id="background" options={options} />
            </div>
        );
    }
    return <></>;
}
