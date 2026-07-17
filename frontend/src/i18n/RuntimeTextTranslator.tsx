import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getRuntimePhraseMap } from "./runtimeTranslations";
import type { SupportedLanguage } from "./index";

const textOriginals = new WeakMap<Text, string>();
const translatedAttributes = ["placeholder", "aria-label", "title"];

function normalizeLanguage(language: string): SupportedLanguage {
  const normalized = language.split("-")[0];
  return normalized === "ru" || normalized === "uz" ? normalized : "en";
}

function translateTextValue(value: string, phrases: Record<string, string>): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const translated = phrases[trimmed];
  if (translated) {
    return value.replace(trimmed, translated);
  }

  const showingMatch = trimmed.match(/^Showing\s+(.+)\s+of\s+(.+)\s+universities$/);
  if (showingMatch) {
    const [, current, total] = showingMatch;
    if (phrases["__showingUniversities"]) {
      return value.replace(trimmed, phrases["__showingUniversities"].replace("{{current}}", current).replace("{{total}}", total));
    }
  }

  const pageMatch = trimmed.match(/^Page\s+(.+)\s+of\s+(.+)$/);
  if (pageMatch) {
    const [, current, total] = pageMatch;
    if (phrases["__pageOf"]) {
      return value.replace(trimmed, phrases["__pageOf"].replace("{{current}}", current).replace("{{total}}", total));
    }
  }

  const submissionsMatch = trimmed.match(/^(.+)\s+submissions available$/);
  if (submissionsMatch && phrases["__submissionsAvailable"]) {
    return value.replace(trimmed, phrases["__submissionsAvailable"].replace("{{count}}", submissionsMatch[1]));
  }

  return value;
}

function translateTextNode(node: Text, phrases: Record<string, string>, language: SupportedLanguage) {
  if (!textOriginals.has(node)) {
    textOriginals.set(node, node.nodeValue ?? "");
  }

  const original = textOriginals.get(node) ?? "";
  const nextValue = language === "en" ? original : translateTextValue(original, phrases);
  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue;
  }
}

function translateElementAttributes(element: Element, phrases: Record<string, string>, language: SupportedLanguage) {
  translatedAttributes.forEach((attribute) => {
    const originalAttribute = `data-i18n-original-${attribute}`;
    const current = element.getAttribute(attribute);
    if (!current) return;

    if (!element.hasAttribute(originalAttribute)) {
      element.setAttribute(originalAttribute, current);
    }

    const original = element.getAttribute(originalAttribute) ?? current;
    const nextValue = language === "en" ? original : translateTextValue(original, phrases);
    if (element.getAttribute(attribute) !== nextValue) {
      element.setAttribute(attribute, nextValue);
    }
  });
}

function walkAndTranslate(root: ParentNode, phrases: Record<string, string>, language: SupportedLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest("[data-i18n-skip='true']")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    translateTextNode(node as Text, phrases, language);
    node = walker.nextNode();
  }

  if (root instanceof Element) {
    translateElementAttributes(root, phrases, language);
    root.querySelectorAll(translatedAttributes.map((attribute) => `[${attribute}]`).join(",")).forEach((element) => {
      translateElementAttributes(element, phrases, language);
    });
  }
}

export function RuntimeTextTranslator() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const language = normalizeLanguage(i18n.language);
    const phrases = getRuntimePhraseMap(language);
    const root = document.getElementById("root");
    if (!root) return;

    const translate = () => walkAndTranslate(root, phrases, language);
    translate();

    const observer = new MutationObserver((mutations) => {
      let shouldTranslate = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList" || mutation.type === "characterData" || mutation.type === "attributes") {
          shouldTranslate = true;
          break;
        }
      }
      if (shouldTranslate) {
        window.requestAnimationFrame(translate);
      }
    });

    observer.observe(root, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: translatedAttributes,
    });

    return () => observer.disconnect();
  }, [i18n.language]);

  return null;
}
