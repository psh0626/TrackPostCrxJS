import manifest from "@/../manifest.json";
import { Stack, Typography } from "@mui/material";
import { loadTrianglesPreset } from "@tsparticles/preset-triangles";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { useEffect, useState } from "react";
import "./about2.css";

export default function About2() {
    const [init, setInit] = useState(false);
    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadTrianglesPreset(engine);
        }).then((_) => setInit(true));
    }, []);

    if (init) {
        return (
            <Stack sx={{ position: "relative", height: "100%" }} alignItems="center" justifyContent="center">
                <Typography id="title" variant="h1">
                    IMIC TrackPost
                </Typography>
                <Typography id="version" variant="subtitle1">
                    Version {manifest.version}
                </Typography>
                <Particles
                    id="particles"
                    style={{ position: "absolute" }}
                    options={{
                        preset: "triangles",
                        fullScreen: { enable: false },
                        background: {
                            opacity: 0,
                            size: "stretch",
                        },
                        particles: {
                            color: {
                                value: "#333333",
                            },
                            links: {
                                color: "#333333",
                            },
                            number: {
                                density: {
                                    enable: true,
                                },
                            },
                            move: {
                                speed: 2,
                            },
                        },

                        pauseOnBlur: true,
                    }}
                />
            </Stack>
        );
    }
    return <></>;
}
