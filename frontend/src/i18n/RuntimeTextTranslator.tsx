import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getRuntimePhraseMap, getRuntimeReversePhraseMap } from "./runtimeTranslations";
import type { SupportedLanguage } from "./index";

const translatedAttributes = ["placeholder", "aria-label", "title"] as const;
const skippedTags = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION"]);
const reversePhrases = getRuntimeReversePhraseMap();

function normalizeLanguage(language: string): SupportedLanguage {
  const normalized = language.split("-")[0];
  return normalized === "ru" || normalized === "uz" ? normalized : "en";
}

function isDynamicValue(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || trimmed === "..." || /\d/.test(trimmed);
}

function translateStaticValue(value: string, phrases: Record<string, string>, language: SupportedLanguage): string {
  const trimmed = value.trim();
  if (isDynamicValue(trimmed)) return value;

  const canonical = reversePhrases[trimmed] ?? trimmed;
  const translated = language === "en" ? canonical : phrases[canonical];
  if (!translated || translated === trimmed) return value;

  return value.replace(trimmed, translated);
}

function translateTextNode(node: Text, phrases: Record<string, string>, language: SupportedLanguage) {
  const current = node.nodeValue ?? "";
  const nextValue = translateStaticValue(current, phrases, language);
  if (current !== nextValue) {
    node.nodeValue = nextValue;
  }
}

function translateElementAttributes(element: Element, phrases: Record<string, string>, language: SupportedLanguage) {
  translatedAttributes.forEach((attribute) => {
    const current = element.getAttribute(attribute);
    if (!current) return;

    const nextValue = translateStaticValue(current, phrases, language);
    if (current !== nextValue) {
      element.setAttribute(attribute, nextValue);
    }
  });
}

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return true;
  if (skippedTags.has(element.tagName)) return true;
  return Boolean(element.closest("[data-i18n-skip='true'], [data-i18n-dynamic='true']"));
}

function walkAndTranslate(root: ParentNode, phrases: Record<string, string>, language: SupportedLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldSkipElement(node.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
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
      if (!shouldSkipElement(element)) {
        translateElementAttributes(element, phrases, language);
      }
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

    let frameId = 0;
    const translate = () => walkAndTranslate(root, phrases, language);
    const scheduleTranslate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(translate);
    };

    translate();

    const observer = new MutationObserver((mutations) => {
      const shouldTranslate = mutations.some((mutation) => {
        if (mutation.type === "characterData") {
          return !isDynamicValue(mutation.target.textContent ?? "");
        }
        return mutation.type === "childList" || mutation.type === "attributes";
      });

      if (shouldTranslate) {
        scheduleTranslate();
      }
    });

    observer.observe(root, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: [...translatedAttributes],
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [i18n.language]);

  return null;
}
