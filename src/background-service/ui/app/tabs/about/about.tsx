import manifest from "@/../manifest.json";
import { checkUpdate } from "@/background-service/serviceworker";
import StorageKey from "@/common/StorageKey";
import { wait } from "@/common/utils";
import { ArrowDropDown, Download, GitHub, Refresh } from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    CircularProgress,
    Stack,
    Typography,
    type SxProps,
    type Theme,
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
import "./about.css";
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

async function getUpdateInfo() {
    const cache = await getCachedUpdateInfo();
    if (cache && !cache.isExpired()) {
        return cache.releases;
    }
    const releases = await fetchUpdateInfo().catch(() => null);
    if (releases) {
        cacheUpdateInfo(releases);
    }
    return releases;
}
function LinkButton({
    href,
    text,
    size = "medium",
    startIcon,
    endIcon,
    sx,
}: {
    href: string;
    text: string;
    size?: "small" | "medium" | "large";
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    sx?: SxProps<Theme>;
}) {
    return (
        <Button
            endIcon={endIcon}
            startIcon={startIcon}
            variant="contained"
            color="inherit"
            size={size}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ alignSelf: "center", textTransform: "none", ...sx }}
        >
            {text}
        </Button>
    );
}
export default function About() {
    const [init, setInit] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<GitHubReleaseList | null>(null);
    const [firstItemExpanded, setFirstItemExpanded] = useState(false);

    useEffect(() => {
        wait(2000).then(() => {
            getUpdateInfo().then((info) => {
                if (info) {
                    setUpdateInfo(info);
                }
            });
        });
        void initParticlesEngine(async (engine) => {
            await loadExternalRepulseInteraction(engine, false);
            await loadExternalPushInteraction(engine, false);
            await loadLifeUpdater(engine, false);
            await loadTrianglesPreset(engine, true);
        }).then(() => setInit(true));
    }, []);

    useEffect(() => {
        if (!updateInfo || updateInfo.length === 0) return;
        wait(400 * (updateInfo.length + 2)).then(() => setFirstItemExpanded(true));
    }, [updateInfo]);

    const renderUpdateInfo = () => {
        if (!updateInfo) return <CircularProgress color="inherit" sx={{ marginTop: 6 }} />;
        if (updateInfo.length === 0) return <Typography>업데이트 정보가 없습니다.</Typography>;

        return (
            <>
                <Stack direction="row" spacing={1} mb={0.5} alignSelf="end">
                    <LinkButton
                        href="https://github.com/psh0626/TrackPostExtZip/releases/latest/download/TrackPost-install.bat"
                        text="Install File"
                        size="small"
                        startIcon={<Download />}
                    />
                    <LinkButton
                        href="https://github.com/psh0626/TrackPostExtZip/releases/latest/download/TrackPost-uninstall.bat"
                        text="Uninstall File"
                        size="small"
                        startIcon={<Download />}
                    />
                </Stack>
                {updateInfo.map((release, idx) => (
                    <Accordion
                        variant="elevation"
                        key={release.id}
                        expanded={idx === 0 ? firstItemExpanded : undefined}
                        onChange={() => {
                            if (idx === 0) {
                                setFirstItemExpanded((prev) => !prev);
                            }
                        }}
                        sx={{ width: "100%", "--idx": idx + 1, mt: idx === 0 && !firstItemExpanded ? 2 :0 }}
                    >
                        <AccordionSummary expandIcon={<ArrowDropDown />}>
                            <Typography variant="h6" fontWeight={300} fontSize={16} textAlign="center" width="100%">
                                {release.name}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Markdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                            >{`<div align="right"> ${new Date(release.updated_at).toLocaleString()} </div>\n\n${release.body}`}</Markdown>
                        </AccordionDetails>
                    </Accordion>
                ))}
                <LinkButton
                    href="https://github.com/psh0626/TrackPostExtZip/releases"
                    text="Click to see more on GitHub"
                    endIcon={<GitHub />}
                    sx={{ mt: 2, "--idx": updateInfo.length + 1 }}
                />
                {/* <LinkButton
                    href="https://github.com/psh0626/TrackPostExtZip/releases/tag/v3.1.12"
                    text="Update notes before v3.1.12"
                    endIcon={<GitHub />}
                    sx={{ mt: 2 }}
                /> */}
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
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ position: "absolute", bottom: 8, right: 20, zIndex: 1 }}
                >
                    chrome extension developed by Park Sunghoon (pshsh0626@gmail.com)
                </Typography>
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
