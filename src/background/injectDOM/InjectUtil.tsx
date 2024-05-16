import React, { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import FloatingHelper from "./DomInject";
import PersonalRemarksSelect from "./PersonalRemarks";

class InjectUtil {
  private static InsertReact(
    react_component: ReactNode,
    target: HTMLElement,
    where: InsertPosition = "afterend"
  ) {
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
  private static GcssInjectFor(
    target_element: HTMLInputElement,
    val: string,
    manual: boolean = false
  ) {
    this.InsertReact(
      <FloatingHelper target={target_element} new_value={val} manual_change={manual} />,
      target_element
    );
  }

  private static IcareInjectFor(
    target_elm: HTMLInputElement,
    val: string,
    manual: boolean = false
  ) {
    this.InsertReact(
      <FloatingHelper
        target={target_elm}
        new_value={val}
        manual_change={manual}
        for_icare={true}
      />,
      target_elm
    );
  }

  static InjectIcarePersonalRemarks(type: string = "REQ") {
    const target = document.querySelector(
      "div.row.text-templates-row > div > div.input-container"
    ) as HTMLElement;
    if (!target) {
      console.log(
        "cannot find: 'div.row.text-templates-row > div > div.input-container'\nunable to inject personal remarks"
      );
      return;
    }
    const new_div = this.InsertReact(<PersonalRemarksSelect type={type} />, target, "afterbegin");
    new_div?.setAttribute(
      "style",
      "z-index: 1; top: 3px; position: absolute; width: 100%; background: white;"
    );
  }

  static GcssSwitchValue(
    original_element: HTMLInputElement,
    change_to: string,
    manual: boolean = false
  ) {
    if (!change_to) manual = true;
    if (manual) {
      this.GcssInjectFor(original_element, change_to, manual);
    } else {
      this.GcssInjectFor(original_element, original_element.value);
      original_element.value = change_to;
    }
  }
  static IcareSwitchValue(
    original_element: HTMLInputElement,
    change_to: string,
    manual: boolean = false
  ) {
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
