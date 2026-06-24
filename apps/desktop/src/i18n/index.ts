import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import fr from "./fr.json";

const saved = (typeof localStorage !== "undefined" && localStorage.getItem("bo_lang")) || "fr";

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: saved,
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem("bo_lang", lng);
  } catch {
    /* ignore */
  }
});

export default i18n;
