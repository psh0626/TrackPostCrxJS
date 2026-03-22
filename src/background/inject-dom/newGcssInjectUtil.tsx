import FloatingHelper from "./floatingHelper";
import InjectUtil from "./injectUtil";

export default class NewGcssInjectUtil {
    private static InjectFor(target_element: HTMLInputElement, val: string, manual: boolean = false) {
        InjectUtil.InsertReact(
            <FloatingHelper target={target_element} new_value={val} manual_change={manual} platform={"NewGCSS"} />,
            target_element,
        );
    }

    static async InjectIdSearchInput() {
        const input = (await InjectUtil.TryQuerySelectFor("input[name='search']")) as HTMLInputElement;
        if (input && !input.dataset.isInjected) {
            // form.action = "/CSS/gcss/multiview/singleItemTracking";
            InjectUtil.ChangeAttributes(input, null, false);
            input.dataset.isInjected = "true";
        }
    }

    static SwitchValueForCurrency(
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
    static SwitchValue(original_element: HTMLInputElement, change_to: string, manual: boolean = false) {
        if (!change_to) manual = true;
        if (manual) {
            this.InjectFor(original_element, change_to, manual);
        } else {
            this.InjectFor(original_element, original_element.value);
            original_element.value = change_to;
        }
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