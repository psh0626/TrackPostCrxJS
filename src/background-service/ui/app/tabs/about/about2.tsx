import manifest from "@/../manifest.json";
import { checkUpdate } from "@/background-service/serviceworker";
import StorageKey from "@/common/StorageKey";
import { ArrowDropDown, Refresh } from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";
import { loadExternalPushInteraction } from "@tsparticles/interaction-external-push";
import { loadExternalRepulseInteraction } from "@tsparticles/interaction-external-repulse";
import { loadTrianglesPreset } from "@tsparticles/preset-triangles";
import Particles, { initParticlesEngine, IParticlesProps } from "@tsparticles/react";
import { loadLifeUpdater } from "@tsparticles/updater-life";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import AlertDialog from "../components/alertDialog";
import "./about2.css";
import { GitHubReleaseList } from "./githubWrapper";
import { UpdateInfoCache, UpdateInfoCacheData } from "./updateInfoCache";

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
async function fetchUpdateInfo() {
    const response = await fetch("https://api.github.com/repos/psh0626/TrackPostExtZip/releases?page=1&per_page=5");
    if (!response.ok) {
        throw new Error("Failed to fetch release information");
    }
    const releases: GitHubReleaseList = await response.json();
    return releases;
}
function cacheUpdateInfo(releases: GitHubReleaseList) {
    const cache = new UpdateInfoCache(releases);
    return new StorageKey("UPDATE_INFO").fromLocal.set(cache);
}
async function getCachedUpdateInfo() {
    const cached = await new StorageKey("UPDATE_INFO").fromLocal.get<UpdateInfoCacheData>();
    if (!cached) return null;
    const cache = new UpdateInfoCache(cached.releases, cached._timestamp);
    console.log("[getCachedUpdateInfo] cache: ", cache, "  isExpired: ", cache.isExpired());
    return cache;
}

export default function About2() {
    const [init, setInit] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<GitHubReleaseList | null>(null);

    useEffect(() => {
        getCachedUpdateInfo().then((cache) => {
            if (cache && !cache.isExpired()) {
                setUpdateInfo(cache.releases);
            } else {
                fetchUpdateInfo()
                    .then((releases) => {
                        setUpdateInfo(releases);
                        cacheUpdateInfo(releases);
                    })
                    .catch(() => setUpdateInfo(null));
            }
        });

        void initParticlesEngine(async (engine) => {
            await loadExternalRepulseInteraction(engine, false);
            await loadExternalPushInteraction(engine, false);
            await loadLifeUpdater(engine, false);
            await loadTrianglesPreset(engine, true);
        }).then(() => setInit(true));
    }, []);

    const renderUpdateInfo = () => {
        if (!updateInfo) return <CircularProgress />;
        if (updateInfo.length === 0) return <Typography>업데이트 정보가 없습니다.</Typography>;

        return (
            <>
                {updateInfo.map((release, idx) => (
                    <Accordion
                        variant="elevation"
                        key={release.id}
                        defaultExpanded={idx === 0}
                        sx={{ width: "100%", "--idx": idx + 1 }}
                    >
                        <AccordionSummary expandIcon={<ArrowDropDown />}>
                            <Typography variant="h6" fontWeight={300} textAlign="center" width="100%">
                                {release.name}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Markdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                            >{`#### ${new Date(release.updated_at).toLocaleString()}\n${release.body}`}</Markdown>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </>
        );
    };

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

                    <Stack id="update-info-container">{renderUpdateInfo()}</Stack>
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
