import React, { ChangeEvent, ChangeEventHandler, ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import FloatingHelper from "./DomInject";
import PersonalRemarksSelect from "./PersonalRemarks";
import { Input, TextField } from "@mui/material";

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

  static InjectGcssQueryInput() {
    const old_input = document.querySelector("input[name='itemId']") as HTMLInputElement;
    const form = document.querySelector("form:has(input[name='itemId'])") as HTMLFormElement;

    old_input.setAttribute("pattern", String.raw`[A-Z]{2}\d{9}[A-Z]{2}`);
    old_input.setAttribute("title", "EB123456789KR");
    old_input.classList.add("uppercase");
    old_input.onkeyup = (e) => {
      old_input.value = old_input.value.toUpperCase();
    };
    form.onsubmit = (e) => {
      old_input.value = old_input.value.toUpperCase();
    };
    // const target = old_input?.closest("div") as HTMLDivElement;
    // const new_div = this.InsertReact(<DomTextField old_input={old_input}/>, target, "beforebegin");
    // new_div?.setAttribute("style", "z-index: 1; position: absolute; width: 100%");
  }

  static InjectIcarePersonalRemarks(type: string = "REQ") {
    let selector: string;
    switch (type) {
      case "REQ":
        selector =
          "div.request-fields > div > div > div.row.text-templates-row > div > div.input-container";
        break;
      case "REP":
        selector =
          "div.reply-fields > div > div > div.row.text-templates-row > div > div.input-container";
        break;
      case "SUM":
        selector = "div.update-message > form > div > div.row > div > div.input-container";
        break;
      default:
        selector = "div.row.text-templates-row > div > div.input-container";
    }
    const target = document.querySelector(selector) as HTMLElement;
    if (!target) {
      console.log("cannot find: 'div.input-container'\nunable to inject personal remarks");
      return;
    }
    const new_div = this.InsertReact(<PersonalRemarksSelect type={type} />, target, "afterbegin");
    new_div?.setAttribute(
      "style",
      "z-index: 1; top: 3px; position: absolute; width: 100%; background: white;"
    );
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
