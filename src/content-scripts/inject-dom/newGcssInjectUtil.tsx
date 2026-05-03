import ExchangeRateUtil from "@/common/exchangeRateUtil";
import { CMD, MSG } from "@/common/message-hub/Message";
import { PostElement } from "@/common/PostUtil";
import { wait } from "@/common/utils";
import { GcssPrefillObject } from "../pending-replies/newGcssWrapper";
import FloatingHelper from "./floatingHelper";
import InjectUtil from "./injectUtil";
import GcssLoadingMask from "./newGcssLoadingMask";

function InjectFor(target_element: HTMLInputElement, val: string, manual: boolean = false) {
    InjectUtil.InsertReact(
        <FloatingHelper target={target_element} new_value={val} manual_change={manual} platform={"NewGCSS"} />,
        target_element,
    );
}

function SwitchValue(original_element: HTMLInputElement, change_to: string, manual: boolean = false) {
    if (!change_to) manual = true;
    if (manual) {
        InjectFor(original_element, change_to, manual);
    } else {
        InjectFor(original_element, original_element.value);
        original_element.value = change_to;
    }
}
function SwitchValueForCurrency(
    original_element: HTMLInputElement,
    currency_element: HTMLInputElement,
    change_to: string,
    manual: boolean = false,
) {
    if (!change_to) manual = true;
    if (manual) {
        return InjectUtil.InsertReact(
            <FloatingHelper
                target={original_element}
                new_value={`${change_to} SDR`}
                manual_change={manual}
                currency_target={currency_element}
            />,
            original_element,
        );
    } else {
        return InjectUtil.InsertReact(
            <FloatingHelper
                target={original_element}
                new_value={`${original_element.value} ${currency_element.value}`}
                manual_change={manual}
                currency_target={currency_element}
                platform="NewGCSS"
            />,
            original_element,
        );
    }
}
export async function InjectIdSearchInput() {
    const input = (await InjectUtil.TryQuerySelectFor("input[name='search']")) as HTMLInputElement;
    if (input && !input.dataset.isInjected) {
        // form.action = "/CSS/gcss/multiview/singleItemTracking";
        InjectUtil.ChangeAttributes(input, null, false);
        input.dataset.isInjected = "true";
    }
}
export type ResolvedFormElements = {
    [K in keyof FormElements]: Awaited<ReturnType<NonNullable<FormElements[K]>>>;
};
export interface FormElements {
    itemDestinationCountry?: () => Promise<HTMLInputElement | null>;
    contentType?: () => Promise<HTMLInputElement | null>;
    itemType?: () => Promise<HTMLInputElement | null>;
    physicalDescription?: () => Promise<HTMLInputElement | null>;
    dateOfPosting?: () => Promise<HTMLInputElement | null>;
    destinationPostcode?: () => Promise<HTMLInputElement | null>;
    contents?: () => Promise<HTMLInputElement | null>;
    itemWeight?: () => Promise<HTMLInputElement | null>;
    itemValue?: () => Promise<HTMLInputElement | null>;
    itemValueCurrency?: () => Promise<HTMLInputElement | null>;
    postagePaid?: () => Promise<HTMLInputElement | null>;
    postagePaidCurrency?: () => Promise<HTMLInputElement | null>;
    indemnityAmount?: () => Promise<HTMLInputElement | null>;
    indemnityAmountCurrency?: () => Promise<HTMLInputElement | null>;
    podRequired?: () => Promise<HTMLInputElement | null>;
    addresseeName?: () => Promise<HTMLInputElement | null>;
    addresseeStreet?: () => Promise<HTMLInputElement | null>;
    addresseePostcode?: () => Promise<HTMLInputElement | null>;
    addresseeCity?: () => Promise<HTMLInputElement | null>;
    addresseeTelephone?: () => Promise<HTMLInputElement | null>;
    addresseeEmail?: () => Promise<HTMLInputElement | null>;
    senderName?: () => Promise<HTMLInputElement | null>;
    senderStreet?: () => Promise<HTMLInputElement | null>;
    senderPostcode?: () => Promise<HTMLInputElement | null>;
    senderCity?: () => Promise<HTMLInputElement | null>;
    senderTelephone?: () => Promise<HTMLInputElement | null>;
    senderEmail?: () => Promise<HTMLInputElement | null>;
}

type CurrentRequestInfo = ReturnType<typeof getCurrentRequestInfo>;
type RequestFormElementKey = keyof FormElements;
type RequestFormValues = Partial<ResolvedFormElements>;

function createRequestFormElements(): FormElements {
    return {
        itemDestinationCountry: () => getInput("itemDestinationCountry"),
        contentType: () => getInput("itemDetails.contentType"),
        itemType: () => getInput("itemDetails.itemType"),
        physicalDescription: () => getInput("itemDetails.physicalDescription"),
        dateOfPosting: () => getInput("itemDetails.dateOfPosting"),
        destinationPostcode: () => getInput("itemDetails.destinationPostcode"),
        contents: () => getInput("itemDetails.contents"),
        itemWeight: () => getInput("itemDetails.itemWeight"),
        itemValue: () => getInput("itemDetails.itemValue"),
        itemValueCurrency: () => getInput("itemDetails.itemValueCurrency"),
        postagePaid: () => getInput("itemDetails.postagePaid"),
        postagePaidCurrency: () => getInput("itemDetails.postagePaidCurrency"),
        indemnityAmount: () => getInput("itemDetails.indemnityAmount"),
        indemnityAmountCurrency: () => getInput("itemDetails.indemnityAmountCurrency"),
        podRequired: () => getInputByName("itemDetails.podRequired"),
        addresseeName: () => getInput("addresseeDetails.addresseeName"),
        addresseeStreet: () => getInput("addresseeDetails.addresseeStreet"),
        addresseePostcode: () => getInput("addresseeDetails.addresseePostcode"),
        addresseeCity: () => getInput("addresseeDetails.addresseeCity"),
        addresseeTelephone: () => getInput("addresseeDetails.addresseeTelephone"),
        addresseeEmail: () => getInput("addresseeDetails.addresseeEmail"),
        senderName: () => getInput("senderDetails.senderName"),
        senderStreet: () => getInput("senderDetails.senderStreet"),
        senderPostcode: () => getInput("senderDetails.senderPostcode"),
        senderCity: () => getInput("senderDetails.senderCity"),
        senderTelephone: () => getInput("senderDetails.senderTelephone"),
        senderEmail: () => getInput("senderDetails.senderEmail"),
    };
}

function getInputByName(name: string) {
    return InjectUtil.TryQuerySelectFor<HTMLInputElement>(`input[name='${name}']`);
}
export function getInput(name: string, maxTries: number = 10, waitTime: number = 200) {
    return InjectUtil.TryQuerySelectFor<HTMLInputElement>(`input[aria-labelledby='${name}']`, maxTries, waitTime);
}
function tryGetSelect(name: string) {
    return InjectUtil.TryQuerySelectFor<HTMLDivElement>(`div[aria-labelledby='${name}']`);
}
function simulateSelectClick(select: HTMLDivElement) {
    select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
}
async function setSelect(name: string | HTMLInputElement, value: string) {
    const select = name instanceof HTMLInputElement ? name : await tryGetSelect(name);
    if (!select) {
        console.log(`Select element with aria-labelledby='${name}' not found`);
        return;
    }
    simulateSelectClick(select);
    const liValue = await InjectUtil.TryQuerySelectFor<HTMLLIElement>(`li[data-value='${value}']`, 10, 100);
    if (!liValue) {
        console.log(`Option with data-value='${value}' not found for select '${name}'`);
        return;
    }
    liValue.click();
}
async function selectAutoCompleteOption(input: HTMLInputElement, optionText: string) {
    simulateSelectClick(input);
    const option: HTMLLIElement | null = await new Promise(async (resolve) => {
        const maxTrial = 30;
        const waitTime = 100;
        wait(100);
        for (let i = 0; i < maxTrial; i++) {
            const foundOption = Array.from(document.querySelectorAll("li")).find((el) => el.textContent === optionText);
            if (foundOption) {
                console.log(
                    `[selectAutoCompleteOption] ${input.getAttribute("aria-labelledby")} Option with text='${optionText}' found after ${i + 1} trial(s)`,
                );
                resolve(foundOption);
                return;
            }
            input.value = optionText;
            simulateSelectClick(input);
            await wait(waitTime);
        }
        console.log(
            `[selectAutoCompleteOption] ${input.getAttribute("aria-labelledby")} Auto-complete option with text='${optionText}' not found after waiting ${(maxTrial * waitTime) / 1000} seconds`,
        );
        resolve(null);
    });
    if (option) {
        option.click();
        return;
    }
}

export function getPostElement(item_id: string): Promise<PostElement> {
    return new MSG(CMD.FETCH_POST_ELEMENT, item_id).fromContent.toServiceWaitResponse<PostElement>();
}

export async function injectConvertedValue(
    targetElements: { valueInput: HTMLInputElement; currencyInput: HTMLInputElement },
    prefill?: { value?: string; currency?: string },
) {
    const { valueInput, currencyInput } = targetElements;
    if (!valueInput || !currencyInput) {
        console.log("Value or currency element not found, cannot inject converted value.");
        return;
    }

    if (!valueInput.value && prefill?.value) {
        valueInput.value = prefill.value;
    }
    if (!currencyInput.value && prefill?.currency) {
        await selectAutoCompleteOption(currencyInput, prefill.currency);
    }

    const sdrValue = ExchangeRateUtil.calculateSDR(
        prefill?.value || valueInput.value,
        prefill?.currency || currencyInput.value,
    );
    // const inputLabel = valueInput.getAttribute("aria-labelledby")?.replaceAll(".", "-");
    // const currencyLabel = currencyInput.getAttribute("aria-labelledby")?.replaceAll(".", "-");

    SwitchValueForCurrency(valueInput, currencyInput, sdrValue);

    // Retry setting value until it sticks
    for (let i = 0; i < 5; i++) {
        valueInput.value = sdrValue;
        await wait(100);
        if (valueInput.value === sdrValue) break;
    }

    await selectAutoCompleteOption(currencyInput, "SDR");
}
export async function injectValueInputs(
    thisForm: Partial<ResolvedFormElements>,
    prefillValues: Partial<GcssPrefillObject>,
) {
    const promises = [];
    if (thisForm.itemValue && thisForm.itemValueCurrency) {
        const targetInputs = {
            valueInput: thisForm.itemValue,
            currencyInput: thisForm.itemValueCurrency!,
        } as const;
        const targetPrefill = {
            value: prefillValues.itemValue || undefined,
            currency: prefillValues.itemValueCurrency || undefined,
        } as const;
        const itemValuePromise = injectConvertedValue(targetInputs, targetPrefill);
        promises.push(itemValuePromise);
    }
    if (thisForm.postagePaid && thisForm.postagePaidCurrency) {
        const targetInputs = {
            valueInput: thisForm.postagePaid,
            currencyInput: thisForm.postagePaidCurrency,
        } as const;
        const targetPrefill = {
            value: prefillValues.postagePaid || undefined,
            currency: prefillValues.postagePaidCurrency || undefined,
        } as const;
        const postagePaidPromise = injectConvertedValue(targetInputs, targetPrefill);
        promises.push(postagePaidPromise);
    }
    const perfStart = performance.now();
    await Promise.all(promises);
    const perfDuration = performance.now() - perfStart;
    if (perfDuration > 1000) {
        console.log(`[injectValueInputs] Injecting converted values took ${perfDuration.toFixed(2)}ms`);
    }

    if (thisForm.indemnityAmount && !thisForm.indemnityAmount.value) {
        const indemnityValue = parseFloat(thisForm.itemValue!.value) + parseFloat(thisForm.postagePaid!.value);
        SwitchValueForCurrency(thisForm.indemnityAmount!, thisForm.indemnityAmountCurrency!, indemnityValue.toString());
        thisForm.indemnityAmount.value = indemnityValue.toString();
        selectAutoCompleteOption(thisForm.indemnityAmountCurrency!, "SDR");
    }
}
export async function waitUntilRequestTypeSelected(): Promise<boolean> {
    const requestType = await InjectUtil.TryQuerySelectFor<HTMLInputElement>(
        "input[aria-labelledby='requestType']",
        300,
        100,
    );
    if (!requestType) {
        console.log("Request type input not found");
        return false;
    }
    do {
        await wait(100);
    } while (!requestType.value);
    console.log("Request type selected:", requestType.value);
    return true;
}
export async function waitUntilRequestTypeChanged(): Promise<boolean> {
    const requestType = await InjectUtil.TryQuerySelectFor<HTMLInputElement>("input[aria-labelledby='requestType']");
    if (!requestType) {
        console.log("Request type input not found");
        return false;
    }
    const initialValue = requestType.value;
    do {
        await wait(100);
    } while (requestType.value === initialValue);
    console.log("Request type changed to:", requestType.value);
    return true;
}
export function getCurrentRequestInfo() {
    const url = new URL(location.href.replace("/#", ""));
    const form = {
        itemId: url.pathname.split("/items/")[1]?.split("/")[0] || null,
        level: url.searchParams.get("form"),
        serviceType: url.searchParams.get("qualifiedProduct"),
        requestType: url.searchParams.get("requestType"),
    };
    return form;
}

function includesAny(str: string | null, substrings: string[] | string) {
    if (!str) return false;
    if (!Array.isArray(substrings)) {
        substrings = [substrings];
    }
    return substrings.some((substring) => str.includes(substring));
}

function getExcludedRequestFormElements(formInfo: CurrentRequestInfo): RequestFormElementKey[] {
    const excludeGroups: { condition: boolean; elements: RequestFormElementKey[] }[] = [
        {
            condition: !includesAny(formInfo.serviceType, ["REG", "EXPRES"]),
            elements: ["itemType", "destinationPostcode"],
        },
        {
            condition: includesAny(formInfo.requestType, "COD"),
            elements: ["contentType"],
        },
        {
            condition:
                formInfo.level === "L1Q" && includesAny(formInfo.requestType, ["WPOD", "COD", "RETURN", "ADVICE"]),
            elements: [
                "itemValue",
                "itemValueCurrency",
                "postagePaid",
                "postagePaidCurrency",
                "indemnityAmount",
                "indemnityAmountCurrency",
                "podRequired",
            ],
        },
        {
            condition: formInfo.level === "L1Q" && includesAny(formInfo.requestType, ["COD", "RETURN"]),
            elements: ["physicalDescription", "contents", "itemWeight"],
        },
        {
            condition:
                formInfo.level === "L1Q" &&
                includesAny(formInfo.requestType, ["UPDATE", "CUSTOMS", "MISSENT", "CHANGE", "DELAYED"]),
            elements: ["indemnityAmount", "indemnityAmountCurrency"],
        },
        {
            condition: formInfo.level === "L1Q" && includesAny(formInfo.requestType, "RETURN"),
            elements: ["contentType", "senderTelephone", "senderEmail"],
        },
        {
            condition: includesAny(formInfo.requestType, ["CHANGE", "DELAYED"]),
            elements: [
                "contentType",
                "contents",
                "itemValue",
                "itemValueCurrency",
                "postagePaid",
                "postagePaidCurrency",
            ],
        },
        {
            condition: includesAny(formInfo.requestType, "DELAYED"),
            elements: ["physicalDescription", "podRequired", "senderTelephone", "senderEmail"],
        },
        {
            condition: includesAny(formInfo.requestType, "DISPUTE"),
            elements: ["itemType", "destinationPostcode"],
        },
        {
            condition: includesAny(formInfo.requestType, "ADVICE"),
            elements: ["contentType", "physicalDescription", "contents", "itemWeight"],
        },
    ];

    const excludedElements = new Set<RequestFormElementKey>();
    excludeGroups
        .filter(({ condition: shouldExclude }) => shouldExclude)
        .forEach(({ elements }) => {
            elements.forEach((elementKey) => excludedElements.add(elementKey));
        });

    return Array.from(excludedElements);
}

export async function resolveRequestFormElements(formInfo: CurrentRequestInfo) {
    const elements = createRequestFormElements();
    const excludedElements = getExcludedRequestFormElements(formInfo);
    const excludedElementSet = new Set(excludedElements);
    const activeElements = Object.entries(elements).filter(
        ([key]) => !excludedElementSet.has(key as RequestFormElementKey),
    ) as [RequestFormElementKey, NonNullable<FormElements[RequestFormElementKey]>][];

    console.log("[InjectRequestForm] Exclude conditions for elements in", formInfo.requestType, excludedElements);

    const elementPromises = await Promise.allSettled(
        activeElements.map(async ([key, resolveElement]) => {
            const perfStart = performance.now();
            const element = await resolveElement();
            const perfDuration = performance.now() - perfStart;
            if (perfDuration > 1000) {
                console.log(`[InjectRequestForm] Finding "${key}" took ${perfDuration.toFixed(2)}ms`);
            }
            return [key, element] as const;
        }),
    );

    const fulfilledElements = elementPromises
        .filter((result) => result.status === "fulfilled")
        .map((result) => [result.value[0], result.value[1]] as const);
    const missingElements = activeElements
        .filter((_, index) => {
            const result = elementPromises[index];
            return result.status === "rejected" || !result.value[1];
        })
        .map(([key]) => key);

    console.log("[InjectRequestForm] Element promises fulfilled", fulfilledElements);

    if (missingElements.length > 0) {
        console.log("[InjectRequestForm] Current form info:", formInfo);
        console.log("[InjectRequestForm] Elements not found:", missingElements);
    }

    return {
        excludedElements,
        formValues: Object.fromEntries(fulfilledElements) as RequestFormValues,
        missingElements,
    };
}

function fillBlankInputs(inputs: (HTMLInputElement | null | undefined)[] | HTMLInputElement | null | undefined) {
    if (Array.isArray(inputs)) {
        inputs.forEach((input) => {
            if (input && !input.value) {
                input.value = "-";
            }
        });
    } else if (inputs && !inputs.value) {
        inputs.value = "-";
    }
}

export async function applyRequestFormDefaults(formValues: RequestFormValues) {
    fillBlankInputs([
        formValues.physicalDescription,
        formValues.destinationPostcode,
        formValues.addresseeName,
        formValues.addresseeStreet,
        formValues.addresseePostcode,
        formValues.addresseeCity,
        formValues.senderName,
        formValues.senderStreet,
        formValues.senderPostcode,
        formValues.senderCity,
    ]);

    if (formValues.contentType) await setSelect("itemDetails.contentType", "OTHER_VARIOUS");
    if (formValues.itemType) await setSelect("itemDetails.itemType", "PACKET");

    if (formValues.itemWeight && !formValues.itemWeight.value) {
        formValues.itemWeight.value = "0.00";
    }

    if (formValues.podRequired && formValues.podRequired.checked === false) {
        formValues.podRequired.parentElement?.click();
    }
}

function applyPostElementValue(pairs: Array<[HTMLInputElement | null | undefined, string]>) {
    pairs.forEach(([input, value]) => {
        if (input) {
            SwitchValue(input, value);
        }
    });
}

export async function applyPostElementFormValues(
    formInfo: CurrentRequestInfo,
    formValues: RequestFormValues,
    postElement: PostElement | null,
) {
    if (formInfo.level !== "L1Q") {
        wait(500).then(async () => {
            document.querySelector(".overflow-auto")?.scrollTo({ behavior: "smooth", top: 2480 });
        });
        return;
    }

    if (!postElement) {
        return;
    }

    if (formValues.dateOfPosting && !formValues.dateOfPosting.value) {
        const date = postElement.ApplicationDate;
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        formValues.dateOfPosting.value = `${year}-${month}-${day}`;
    }

    if (formValues.itemDestinationCountry && !formValues.itemDestinationCountry.value) {
        SwitchValue(formValues.itemDestinationCountry, postElement.Destination);
    }

    if (formValues.destinationPostcode && formValues.destinationPostcode.value === "-") {
        SwitchValue(formValues.destinationPostcode, postElement.AddresseeZipcode);
    }

    applyPostElementValue([
        [formValues.contents, postElement.Contents],
        [formValues.addresseeName, postElement.AddresseeName],
        [formValues.addresseeStreet, postElement.AddresseeAddress],
        [formValues.addresseeTelephone, postElement.AddresseePhone],
        [formValues.addresseePostcode, postElement.AddresseeZipcode],
        [formValues.senderName, postElement.SenderName],
        [formValues.senderStreet, postElement.SenderAddress],
        [formValues.senderTelephone, postElement.SenderPhone],
    ]);

    const callCenterSelect = await tryGetSelect("messageRouting.receivingCallCenterUpuCode");

    wait(500).then(async () => {
        if (callCenterSelect?.textContent === "Select Destination Call Center") {
            document.querySelector(".overflow-auto")?.scrollTo({ behavior: "smooth", top: 200 });
            await wait(500);
            simulateSelectClick(callCenterSelect);
        }
    });
}

export function finalizeInjectRequestForm(perfMarks: PerformanceMark[]) {
    wait(1000).then(() => {
        GcssLoadingMask.hideLoadingMask();
        perfMarks.push(performance.mark("End Loading Mask"));
        const perfMeasures = perfMarks.map((currentMark, idx, marks) => {
            if (idx === 0) return null;
            return performance.measure(
                `Time from '${marks[idx - 1]?.name || "start"}' to '${currentMark.name}'`,
                marks[idx - 1]?.name || marks[0].name,
                currentMark.name,
            );
        });
        perfMeasures.forEach((measure) => {
            if (measure) {
                console.log(`[InjectRequestForm] ${measure.name}: ${measure.duration.toFixed(2)}ms`);
            }
        });
        console.log(
            `[InjectRequestForm] Total injection time: ${(performance.now() - perfMarks[0].startTime).toFixed(2)}ms`,
        );
    });
}
