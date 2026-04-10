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
        return <Particles id="particles" options={{
            preset: "triangles", fullScreen: { enable: false },
            
        }} />;
    }
    return <></>;
}
