import StorageKey from "@/common/StorageKey";
import { ms } from "@/common/TimespanExtension";
import { wait } from "@/common/utils";
import "@/content-scripts/fonts";
import { confetti } from "@tsparticles/confetti";
import InjectUtil from "./inject-dom/injectUtil";
function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

(async function main() {
    const birthDay = new Date("1994-06-26");
    const now = new Date();
    const isBirthDay = now.getMonth() === birthDay.getMonth() && now.getDate() === birthDay.getDate();
    if (!isBirthDay) {
        return;
    }

    console.log("[party] Injecting party script!");

    const style = document.createElement("style");
    style.id = "party-exclude-print";
    style.innerHTML = `
        @media print {
            .no-print, canvas { display: none !important; }
        }
        @keyframes slideUp {
            from { transform: translate(-50%, 100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translate(-50%, 0); opacity: 1; }
            to { transform: translate(-50%, -100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    window.addEventListener("click", async (ev) => {
        const [screenSizeX, screenSizeY] = [window.innerWidth, window.innerHeight];
        const [xPortion, yPortion] = [(ev.clientX / screenSizeX) * 100, (ev.clientY / screenSizeY) * 100];
        // console.log("click portions", xPortion, yPortion);
        await onBirthdayClick(xPortion, yPortion);
    });

    // entrance confetti
    const elementFound = await InjectUtil.waitUntil(() => {
        const oldGcss = document.querySelector("#taskFolders");
        const newGcss = document.querySelector(".MuiTab-root");
        const iCare = document.querySelector(".dashboard-content");
        return oldGcss || newGcss || iCare;
    });
    if (!elementFound) {
        console.log("[party] Could not find the element. Aborting party script.");
        return;
    }
    type SessionDict = Record<"GCSS" | "ICARE", { lastShown: number; shownCount: number }>;

    const url = new URL(window.location.href);
    const currentPage = url.href.includes("icare") ? "ICARE" : "GCSS";

    const partyKey = new StorageKey("PARTY");
    const partyStored = await partyKey.fromSession.get<SessionDict>();
    if (partyStored) {
        if (partyStored?.[currentPage]?.shownCount >= 4) {
            console.log("[party] Party has been shown 4 times already. Aborting party script.");
            return;
        } else if (Date.now() - partyStored?.[currentPage]?.lastShown < ms(30).toMinutes()) {
            console.log("[party] Party was shown less than 30 minutes ago. Aborting party script.");
            return;
        }
    }
    partyKey.fromSession.set({
        ...partyStored,
        [currentPage]: {
            lastShown: Date.now(),
            shownCount: (partyStored?.[currentPage]?.shownCount || 0) + 1,
        },
    });

    const duration = ms(10).toSeconds();
    showBirthdayConfetti(duration);
    wait(1200).then(() => showBirthdayString(duration));

    async function onBirthdayClick(x: number, y: number) {
        const defaults = {
            count: randomInRange(15, 35),
            spread: 360,
            startVelocity: randomInRange(10, 15),
            gravity: -0.5,
            ticks: 500,
        };

        confetti({
            ...defaults,
            count: defaults.count * (3 / 4),
            shapes: ["square"],
            position: { x: x, y: y },
        });
        await wait(100);
        confetti({
            ...defaults,
            count: defaults.count * (1 / 4),
            ticks: 400,
            scalar: 3,
            shapes: ["emoji"],
            shapeOptions: {
                emoji: {
                    value: ["🎂", "🎈", "🎉", "🥳"],
                },
            },
            position: { x: x, y: y },
        });
    }
    async function showBirthdayString(duration = ms(10).toSeconds()) {
        const container = document.createElement("div");
        container.id = "party-string";
        container.classList.add("no-print");
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: auto; height: auto;
            padding: 2.5em 5em;
            border-radius: 4px;
            pointer-events: none;
            font-family: 'Pretendard Variable', sans-serif;
            text-align: center;
            white-space: nowrap;
            z-index: 9999;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);
            opacity: 0;
            transition: opacity 1200ms ease;
        `;
        document.body.appendChild(container);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                container.style.opacity = "1";
            });
        });

        type LineConfig = {
            segments: { text: string; weight: number; fontSize?: string }[];
            color: string;
            blockColor: string;
            fontSize?: string;
            textShadow?: string;
        };
        const lineConfigs: LineConfig[] = [
            {
                segments: [{ text: "오늘의 주인공", weight: 900 }],
                color: "#C45000",
                blockColor: "#C4B8AA",
                textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 2px 4px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.16)",
            },
            {
                segments: [{ text: "박성훈", weight: 600, fontSize: "240px" }],
                color: "#E8820A",
                blockColor: "#D4BC8C",
                textShadow:
                    "0 1px 0 rgba(255,245,210,0.95), 0 2px 8px rgba(139,94,16,0.45), 0 10px 30px rgba(139,94,16,0.2)",
            },
            {
                segments: [
                    { text: "생일", weight: 600, fontSize: "132px" },
                    { text: "축하", weight: 300 },
                ],
                color: "#8B3A00",
                blockColor: "#B0A898",
                textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 2px 4px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.12)",
            },
        ];
        const PHASE1_MS = 400; // thin line sweeps L→R
        const PHASE2_MS = 200; // line expands to full block
        const PHASE3_MS = 500; // block wipes out L→R, revealing text
        const STAGGER_MS = 900; // gap between lines starting

        function createLineEl(config: LineConfig) {
            const wrapper = document.createElement("div");
            wrapper.style.cssText = `position: relative; overflow: hidden; margin: 0.05em 0;`;

            const h1 = document.createElement("h1");
            h1.style.cssText = `
                font-size: ${config.fontSize ?? "84px"} !important;
                line-height: 1.1 !important;
                color: ${config.color};
                text-shadow: ${config.textShadow ?? "0 1px 0 rgba(255,255,255,0.95), 0 2px 4px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.12)"};
                margin: 0;
                padding: 0;
                opacity: 0;
            `;
            config.segments.forEach(({ text, weight, fontSize }) => {
                const span = document.createElement("span");
                span.textContent = text;
                span.style.cssText = `font-weight: ${weight}; font-size: ${fontSize ?? "inherit"};`;
                h1.appendChild(span);
            });

            // Block starts as a horizontally-squished sliver at center
            const block = document.createElement("div");
            block.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: ${config.blockColor};
                transform: scaleX(0) scaleY(0.04);
                transform-origin: left center;
                pointer-events: none;
            `;

            wrapper.append(h1, block);
            return { wrapper, h1, block };
        }

        const elements = lineConfigs.map(createLineEl);
        elements.forEach(({ wrapper }) => container.appendChild(wrapper));

        // Lock container size before letter-spacing animations expand the content
        await new Promise<void>((resolve) =>
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    const { width, height } = container.getBoundingClientRect();
                    container.style.width = `${width + 200}px`;
                    container.style.height = `${height}px`;
                    container.style.overflow = "hidden";
                    resolve();
                }),
            ),
        );

        async function animateLine(
            { h1, block }: { h1: HTMLHeadingElement; block: HTMLDivElement },
            delay: number,
            index: number,
        ) {
            await wait(delay);

            // Phase 1: thin line sweeps left → right
            block.style.transition = `transform ${PHASE1_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            block.style.transform = "scaleX(1) scaleY(0.04)";
            await wait(PHASE1_MS);

            // Phase 2: line expands vertically to full block
            block.style.transition = `transform ${PHASE2_MS}ms ease-in-out`;
            block.style.transform = "scaleX(1) scaleY(1)";

            h1.style.transition = `letter-spacing 5s ease-out, text-indent 5s ease-out`;
            if (index === 0) {
                h1.style.letterSpacing = "0.35em";
                h1.style.textIndent = "0.35em";
            } else if (index === 1) {
                h1.style.letterSpacing = "0.3em";
                h1.style.textIndent = "0.3em";
            } else if (index === 2) {
                h1.style.letterSpacing = "1em";
                h1.style.textIndent = "1em";
            }

            await wait(PHASE2_MS);

            // Phase 3: block wipes out left → right, text appears behind it
            h1.style.opacity = "1";
            block.style.transformOrigin = "right center";
            block.style.transition = `transform ${PHASE3_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            block.style.transform = "scaleX(0) scaleY(1)";
        }

        const perLineDuration = PHASE1_MS + PHASE2_MS + STAGGER_MS;
        elements.forEach(({ h1, block }, i) => {
            animateLine({ h1, block }, i * perLineDuration, i);
        });

        const totalMs = elements.length * perLineDuration + PHASE3_MS + 500;
        await wait(Math.min(totalMs, duration) + ms(2).toSeconds());

        // Fade out: spread text + opacity → 0, then remove container
        const FADEOUT_MS = 6000;
        elements.forEach(({ h1 }) => {
            h1.style.transition = `opacity ${FADEOUT_MS / 2}ms ease-in, filter ${FADEOUT_MS / 2}ms ease-in, letter-spacing ${FADEOUT_MS}ms ease-in, text-indent ${FADEOUT_MS}ms ease-in`;
            const currentSpacing = parseFloat(getComputedStyle(h1).letterSpacing) || 0;
            const extraEm = 1.5;
            h1.style.letterSpacing = `calc(${currentSpacing}px + ${extraEm}em)`;
            h1.style.textIndent = `calc(${currentSpacing}px + ${extraEm}em)`;
            h1.style.opacity = "0";
            h1.style.filter = "blur(4px)";
        });
        container.style.transition = `opacity ${FADEOUT_MS / 2}ms ease-in`;
        container.style.opacity = "0";
        await wait(FADEOUT_MS);
        container.remove();
    }
    function showBirthdayConfetti(duration = ms(10).toSeconds()) {
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, shapes: ["square"], scalar: 2 };

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 20 * (timeLeft / duration);

            // since particles fall down, start a bit higher than random
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            });
        }, 250);
        (function frame() {
            confetti({
                particleCount: 1,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
            });

            confetti({
                particleCount: 1,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
            });

            const timeLeft = animationEnd - Date.now();
            if (timeLeft > 0) {
                requestAnimationFrame(frame);
            }
        })();
    }
})();
