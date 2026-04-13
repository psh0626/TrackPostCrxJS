import { wait } from "@/common/utils";
import { confetti } from "@tsparticles/confetti";

(async () => {
    // const canvas = document.createElement("canvas");
    // canvas.id = "party-canvas";
    // canvas.style.position = "fixed";
    // canvas.style.top = "0";
    // canvas.style.left = "0";
    // canvas.style.width = "100%";
    // canvas.style.height = "100%";
    // canvas.style.pointerEvents = "none";
    // document.body.appendChild(canvas);
    // const party = await confetti.create(canvas, {});
    // party({ particleCount: 100, spread: 70, origin: { x: 0.5, y: 0.5 } });
    await wait(1500);
    confetti({ count: 400, spread: 150 });
})();
