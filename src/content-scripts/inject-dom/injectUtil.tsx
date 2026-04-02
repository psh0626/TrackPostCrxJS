import { wait } from "@/common/utils";
import { ReactNode } from "react";
import { createRoot } from "react-dom/client";

class InjectUtil {
    public static InsertReact(react_component: ReactNode, target: HTMLElement, where: InsertPosition = "afterend") {
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
        target_form: HTMLFormElement | null,
        one_item_only = true,
        trial = 0,
    ) {
        console.log("[ChangeAttributes] start");
        if (!target_input) {
            if (trial < 2) {
                setTimeout(() => {
                    this.ChangeAttributes(target_input, target_form, one_item_only, ++trial);
                }, 1000);
                console.log("[ChangeAttributes] input not found");
            }
            return;
        }

        target_input.setAttribute("placeholder", "등기번호를 입력하세요.");
        target_input.classList.add("uppercase");

        const getProcessedValue = (value: string, maxLen: number) => {
            const newValue = this.kr2en(value).toUpperCase();
            if (newValue.length > maxLen) return newValue.slice(0, maxLen);
            if (newValue.length === maxLen) return newValue;
            return value;
        };

        target_input.addEventListener("input", (e) => {
            const old_position = target_input.selectionStart ?? 0;
            const input = e.target as HTMLInputElement;
            let value = input.value.toUpperCase();

            if (one_item_only) {
                target_input.setAttribute("maxlength", "13");
                target_input.setAttribute("pattern", String.raw`[A-Z]{2}\d{9}[A-Z]{2}`);
                input.value = getProcessedValue(value, 13);
            } else {
                target_input.removeAttribute("maxlength");
                target_input.setAttribute(
                    "pattern",
                    target_form ? String.raw`([A-Z]{2}\d{9}[A-Z]{2}\s?)+` : String.raw`([A-Z]{2}\d{9}[A-Z]{2};?\s?)+`,
                );

                const endsWithSpace = /;?\s$/.test(value);
                let items = value.split(/;?\s+/).filter(Boolean);
                let processed = items.map((item) => getProcessedValue(item, target_form ? 13 : 999));
                let newValue = processed.join(target_form ? " " : "; ");
                if (endsWithSpace) newValue += target_form ? " " : "; ";

                if (input.value !== newValue) {
                    input.value = newValue;
                    input.setSelectionRange(old_position, old_position);
                }
            }
        });

        if (target_form) {
            target_form.onsubmit = () => {
                target_input.value = target_input.value.toUpperCase();
            };
        } else {
            target_input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    target_input.value = target_input.value.toUpperCase();
                }
            });
        }
    }
    static async waitUntil<T>(
        condition: () => T | null,
        maxTries: number = 50,
        waitTime: number = 100,
    ): Promise<T | null> {
        for (let i = 0; i < maxTries; i++) {
            const result = await Promise.resolve(condition()).catch((e) => {
                console.warn("[waitUntil] Error occured", e);
                return null;
            });
            if (result) {
                return result;
            }
            await wait(waitTime);
        }
        // console.log(
        //     `[waitUntil] Condition not met after ${maxTries} tries.\n`,
        //     new Error().stack
        //         ?.split("\n")
        //         .map((line) => line.trim())
        //         .slice(3)
        //         .join("\n")
        //         .replaceAll("(", "\n("),
        // );
        return null;
    }
    static async TryQuerySelectFor<T>(
        selector: string,
        maxTries: number = 50,
        waitTime: number = 100,
    ): Promise<T | null> {
        const query = await this.waitUntil(() => document.querySelector(selector) as T | null, maxTries, waitTime);
        if (query === null) {
            console.log(
                `[TryQuerySelectFor] Element with selector "${selector}" not found after ${maxTries} tries.`,
                // new Error().stack
                //     ?.split("\n")
                //     .map((line) => line.trim())
                //     .slice(1)
                //     .join("\n")
                //     .replaceAll("(", "\n("),
            );
        }
        return query;
    }
}

export default InjectUtil;
