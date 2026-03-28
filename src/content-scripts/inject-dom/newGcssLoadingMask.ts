import "./newGcssLoadingMask.css";
export default class GcssLoadingMask {
    private static maskElement: HTMLDivElement | null = null;
    private static maskTimeout: number | null = null;
    public static injectMask() {
        const maskId = "IMIC-LOADING-MASK";
        if (!this.maskElement) {
            const mask = document.createElement("div");
            mask.id = maskId;
            mask.style.opacity = "0";
            mask.innerText = "자동 입력 중";
            document.body.appendChild(mask);
            this.maskElement = mask;
        }
        return this.maskElement;
    }
    static showLoadingMask() {
        const mask = this.injectMask();
        mask.style.opacity = "1";
        if (this.maskTimeout) {
            clearTimeout(this.maskTimeout);
        }
        this.maskTimeout = window.setTimeout(() => {
            mask.style.opacity = "0";
        }, 5000);
    }
    static hideLoadingMask() {
        const mask = this.injectMask();
        if (this.maskTimeout) {
            clearTimeout(this.maskTimeout);
            this.maskTimeout = null;
        }
        if (mask) {
            mask.style.opacity = "0";
        }
    }
}
