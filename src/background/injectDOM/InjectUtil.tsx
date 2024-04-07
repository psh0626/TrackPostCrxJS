import React, { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import FloatingHelper from "./DomInject";

class InjectUtil {
  private static InsertReact(react_component: ReactNode, target: HTMLElement) {
    if (!target) {
      console.error("No target element found for: " + target);
      return;
    }

    const new_div = document.createElement("div");
    new_div.setAttribute("style", "display: flex; align-items: center;");

    const inject_react = createRoot(new_div);
    inject_react.render(react_component);

    (target.closest("div") as HTMLDivElement).style.position = "relative";

    target.insertAdjacentElement("afterend", new_div);    
  }
  private static GcssInjectFor(target_element: HTMLInputElement, val: string, manual: boolean = false) {
    this.InsertReact(<FloatingHelper target={target_element} new_value={val} manual_change={manual} />, target_element);
  }

  private static IcareInjectFor(target_elm: HTMLInputElement, val: string, manual: boolean = false) {
    this.InsertReact(<FloatingHelper target={target_elm} new_value={val} manual_change={manual} for_icare={true} />, target_elm);
  }

  static InjectIcarePersonalRemarks() {
    const target = document.querySelector("div.row.text-templates-row > div > div.input-container") as HTMLElement;
    if (!target) {
      console.log("cannot find: 'div.row.text-templates-row > div > div.input-container'\nunable to inject personal remarks");
      return;
    }
    //this.InsertReact(react_component, target);
    
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
