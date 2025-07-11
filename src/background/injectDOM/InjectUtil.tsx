import { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import FloatingHelper from "./DomInject";
import PersonalRemarksSelect from "./PersonalRemarks";

class InjectUtil {
    private static InsertReact(react_component: ReactNode, target: HTMLElement, where: InsertPosition = "afterend") {
        if (!target) {
            console.error("No target element found for: " + target);
            return;
        }

        (target.closest("div") as HTMLDivElement).style.position = "relative";

        const new_div = document.createElement("div");
        new_div.setAttribute("style", "display: flex; align-items: center;");

        const inject_react = createRoot(new_div);
        inject_react.render(react_component);

        target.insertAdjacentElement(where, new_div);
        return new_div;
    }
    private static GcssInjectFor(target_element: HTMLInputElement, val: string, manual: boolean = false) {
        this.InsertReact(
            <FloatingHelper target={target_element} new_value={val} manual_change={manual} />,
            target_element
        );
    }

    private static IcareInjectFor(target_elm: HTMLInputElement, val: string, manual: boolean = false) {
        this.InsertReact(
            <FloatingHelper target={target_elm} new_value={val} manual_change={manual} for_icare={true} />,
            target_elm
        );
    }

    private static separateKoreanSyllable(syllable: string): string {
        // console.log("St: " + syllable);
        const charCode = syllable.charCodeAt(0);
        if (charCode < 0xac00 || charCode > 0xd7a3) {
            // console.log("Denied: " + syllable);
            return syllable; // Return as is if it's not a Korean syllable
        }

        const jamoSet = [
            "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ",
            "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ",
            " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ",
        ];

        let offset = charCode - 0xac00;
        const jong = offset % 28;
        offset = (offset - jong) / 28;
        const jung = offset % 21;
        const cho = (offset - jung) / 21;

        let result = jamoSet[0][cho] + jamoSet[1][jung];
        if (jong > 0) {
            result += jamoSet[2][jong];
        }

        // console.log("Result: " + result);
        return result;
    }
    private static kr2en(text: string): string {
        const jamoMap = new Map<string, string>([
            ["ㄱ", "r"],
            ["ㄲ", "R"],
            ["ㄴ", "s"],
            ["ㄷ", "e"],
            ["ㄸ", "E"],
            ["ㄹ", "f"],
            ["ㅁ", "a"],
            ["ㅂ", "q"],
            ["ㅃ", "Q"],
            ["ㅅ", "t"],
            ["ㅆ", "T"],
            ["ㅇ", "d"],
            ["ㅈ", "w"],
            ["ㅉ", "W"],
            ["ㅊ", "c"],
            ["ㅋ", "z"],
            ["ㅌ", "x"],
            ["ㅍ", "v"],
            ["ㅎ", "g"],
            ["ㅏ", "k"],
            ["ㅐ", "o"],
            ["ㅑ", "i"],
            ["ㅒ", "O"],
            ["ㅓ", "j"],
            ["ㅔ", "p"],
            ["ㅕ", "u"],
            ["ㅖ", "P"],
            ["ㅗ", "h"],
            ["ㅘ", "hk"],
            ["ㅙ", "ho"],
            ["ㅚ", "hl"],
            ["ㅛ", "y"],
            ["ㅜ", "n"],
            ["ㅝ", "nj"],
            ["ㅞ", "np"],
            ["ㅟ", "nl"],
            ["ㅠ", "b"],
            ["ㅡ", "m"],
            ["ㅢ", "ml"],
            ["ㅣ", "l"],
        ]);

        try {
            return text
                .split("")
                .map((char) => {
                    const separated = this.separateKoreanSyllable(char);
                    const result = separated
                        .split("")
                        .map((jamo) => jamoMap.get(jamo) || jamo)
                        .join("");
                    // console.log("separated: " + result);
                    return result;
                })
                .join("");
        } catch {
            return text;
        }
    }

    static ChangeAttributes(
        target_input: HTMLInputElement,
        target_form: HTMLFormElement,
        apply_pattern = true,
        trial = 0
    ) {
        console.log("[ChangeAttributes] start");
        if (!target_input) {
            if (trial < 2) {
                setTimeout(() => {
                    this.ChangeAttributes(target_input, target_form, apply_pattern, ++trial);
                }, 1000);
                console.log("[ChangeAttributes] input not found");
            }
            return;
        }

        // target_input.setAttribute("title", "EE123456789KR");
        target_input.setAttribute("placeholder", "등기번호를 입력하세요.");
        target_input.classList.add("uppercase");

        target_input.addEventListener("input", (e) => {
            const old_position = target_input.selectionStart ?? 0;
            const input = e.target as HTMLInputElement;
            const value = input.value;
            // console.log("value: " + value);

            if (apply_pattern) {
                target_input.setAttribute("maxlength", "13");
                target_input.setAttribute("pattern", String.raw`[A-Z]{2}\d{9}[A-Z]{2}`);
                if (value.length < 13) {
                    input.value = value;
                }
                const new_value = this.kr2en(value).toUpperCase();
                if (new_value.length >= 13) {
                    console.log("new_value: " + new_value);
                    if (new_value.length > 13) {
                        input.value = new_value.slice(0, 13);
                    } else {
                        input.value = new_value;
                    }
                }
            } else {
                input.value = value;
            }

            if (input.selectionStart !== old_position) {
                // console.log("position set from " + input.selectionStart + " to " + old_position);
                input.setSelectionRange(old_position, old_position);
            }
        });
        target_form.onsubmit = () => {
            target_input.value = target_input.value.toUpperCase();
        };
    }
    static async wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    static async TryQuerySelectFor(
        selector: string,
        maxTries: number = 50,
        waitTime: number = 100
    ): Promise<Element | null> {
        for (let i = 0; i < maxTries; i++) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
            await this.wait(waitTime);
        }
        console.warn(`Element with selector "${selector}" not found after ${maxTries} tries.`);
        return null;
    }
    static async InjectGcssIdSearchInput() {
        const input = (await this.TryQuerySelectFor("input#txtItemId")) as HTMLInputElement;
        if (input) {
            const form = document.querySelector("form:has(input#txtItemId)") as HTMLFormElement;
            this.ChangeAttributes(input, form);
        }
    }
    static async InjectGcssQueryInput() {
        const old_input = (await this.TryQuerySelectFor("input[name='itemId']")) as HTMLInputElement;
        if (old_input) {
            const form = document.querySelector("form:has(input[name='itemId'])") as HTMLFormElement;
            this.ChangeAttributes(old_input, form);
        }
    }
    static async InjectIcareIdSearchInput() {
        const old_input = (await this.TryQuerySelectFor("input[type='text']")) as HTMLInputElement;
        if (old_input) {
            const form = document.querySelector("form:has(input[type='text'])") as HTMLFormElement;
            this.ChangeAttributes(old_input, form, false);
        }
    }

    static async InjectIcarePersonalRemarks(type: string = "REQ") {
        let selector: string;
        switch (type) {
            case "REQ":
                selector = "div.request-fields > div > div > div.row.text-templates-row > div > div.input-container";
                break;
            case "REP":
                selector = "div.reply-fields > div > div > div.row.text-templates-row > div > div.input-container";
                break;
            case "SUM":
                selector = "div.update-message > form > div > div.row > div > div.input-container";
                break;
            default:
                selector = "div.row.text-templates-row > div > div.input-container";
        }
        const target = (await this.TryQuerySelectFor(selector)) as HTMLElement;
        if (!target) {
            console.log("cannot find: 'div.input-container'\nunable to inject personal remarks");
            return;
        }
        const new_div = this.InsertReact(<PersonalRemarksSelect type={type} />, target, "afterbegin");
        new_div?.setAttribute("style", "z-index: 1; top: 3px; position: absolute; width: 100%; background: white;");
    }

    static GcssSwitchValueForCurrency(
        original_element: HTMLInputElement,
        currency_element: HTMLSelectElement,
        change_to: string,
        manual: boolean = false
    ) {
        if (!change_to) manual = true;
        if (manual) {
            this.InsertReact(
                <FloatingHelper
                    target={original_element}
                    new_value={`${change_to} SDR`}
                    manual_change={manual}
                    currency_target={currency_element}
                />,
                original_element
            );
        } else {
            this.InsertReact(
                <FloatingHelper
                    target={original_element}
                    new_value={`${original_element.value} ${currency_element.selectedOptions[0].text}`}
                    manual_change={manual}
                    currency_target={currency_element}
                />,
                original_element
            );
            original_element.value = change_to;
        }
    }
    static GcssSwitchValue(original_element: HTMLInputElement, change_to: string, manual: boolean = false) {
        if (!change_to) manual = true;
        if (manual) {
            this.GcssInjectFor(original_element, change_to, manual);
        } else {
            this.GcssInjectFor(original_element, original_element.value);
            original_element.value = change_to;
        }
    }
    static IcareSwitchValue(original_element: HTMLInputElement, change_to: string, manual: boolean = false) {
        if (!change_to) manual = true;
        if (manual) {
            this.IcareInjectFor(original_element, change_to, manual);
        } else {
            this.IcareInjectFor(original_element, original_element.value);
            original_element.value = change_to;
        }
    }
}

export default InjectUtil;
