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

    const birthDay = new Date("1994-06-26");
    const now = new Date();
    const isBirthDay = now.getMonth() === birthDay.getMonth() && now.getDate() === birthDay.getDate();
    if (!isBirthDay) {
        return;
    }

    console.log("[party] Injecting party script!");

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

    showBirthday();

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
    function showBirthday() {
        const container = document.createElement("div");
        container.id = "party-string";
        document.body.appendChild(container);

        const duration = ms(10).toSeconds();

        const h1 = document.createElement("h1");
        h1.textContent = "";
        h1.classList.add("no-print");
        h1.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            white-space: nowrap;
            font-family: 'Pretendard Variable', sans-serif;
            font-size: 8vw;
            font-weight: 900;
            color: #333333;
            z-index: 9999;
            pointer-events: none;
            padding: 10px 40px;
            background: rgba(255, 255, 255, 0.9);
            opacity: 0;
        `;
        container.appendChild(h1);
        setTimeout(
            () => {
                h1.style.animation = `slideUp 1s cubic-bezier(.3,0,.1,1) forwards`;
                h1.textContent = "박성훈";
            },
            duration * (1 / 6),
        );

        setTimeout(
            () => {
                h1.textContent = "박성훈 탄신일";
            },
            duration * (2 / 6),
        );
        setTimeout(
            () => {
                h1.textContent = "(경) 박성훈 탄신일 (축)";
            },
            duration * (3 / 6),
        );
        setTimeout(() => {
            h1.style.animation = `slideOut 1s cubic-bezier(.3,0,.1,1) forwards`;
        }, duration);
        setTimeout(() => {
            document.body.removeChild(container);
        }, duration + 2000);

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
