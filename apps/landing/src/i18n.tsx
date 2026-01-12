import { createLocaleContext } from "fbtee";
import type { ReactNode } from "react";

export const availableLanguages = new Map([
  ["en_US", "English"],
  ["cs_CZ", "Čeština"],
]);

const clientLocales =
  typeof navigator === "undefined"
    ? []
    : [
        ...new Set([
          ...(navigator.language ? [navigator.language] : []),
          ...(navigator.languages ?? []),
        ]),
      ];

const LocaleContext = createLocaleContext({
  availableLanguages,
  clientLocales,
  loadLocale: async (locale: string) => {
    if (locale === "cs_CZ") {
      return (await import("./translations/cs_CZ.json")).default.cs_CZ;
    }
    return {};
  },
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  return <LocaleContext>{children}</LocaleContext>;
}
