import { join } from "node:path";
import { pluginPlayground } from "@rspress/plugin-playground";
import { pluginPreview } from "@rspress/plugin-preview";
import { pluginShiki } from "@rspress/plugin-shiki";
import { defineConfig } from "rspress/config";

const rawDocsServiceBaseUrl = process.env.DOCS_SERVICE_BASE_URL?.trim();
const docsServiceBaseUrl =
  rawDocsServiceBaseUrl && rawDocsServiceBaseUrl.length > 0
    ? rawDocsServiceBaseUrl
    : "http://localhost:8787";

const enNav = [
  { text: "Tutorials", link: "/tutorials/" },
  { text: "How-to", link: "/how-to/" },
  { text: "Reference", link: "/reference/" },
  { text: "Explanation", link: "/explanation/" },
];

const enSidebar = {
  "/": [
    { text: "Overview", link: "/" },
    {
      text: "Tutorials",
      link: "/tutorials/",
      collapsible: true,
      items: [{ text: "Quickstart", link: "/tutorials/quickstart" }],
    },
    {
      text: "How-to",
      link: "/how-to/",
      collapsible: true,
      items: [
        { text: "Use the HTTP service", link: "/how-to/use-service" },
        { text: "Add another provider", link: "/how-to/add-provider" },
        {
          text: "Integrate legacy checkout (Bootstrap + vanilla JS)",
          link: "/how-to/legacy-js-integration",
        },
      ],
    },
    {
      text: "Reference",
      link: "/reference/",
      collapsible: true,
      items: [
        { text: "Service API", link: "/reference/service-api" },
        { text: "MCP tool", link: "/reference/mcp-tool" },
        { text: "Effect RPC", link: "/reference/rpc" },
        { text: "Runtime configuration", link: "/reference/config" },
        { text: "Core types", link: "/reference/core-types" },
        { text: "Clients and SDKs", link: "/reference/sdk" },
      ],
    },
    {
      text: "Explanation",
      link: "/explanation/",
      collapsible: true,
      items: [
        { text: "Architecture", link: "/explanation/architecture" },
        { text: "Strategies", link: "/explanation/strategies" },
        { text: "Caching", link: "/explanation/caching" },
        { text: "Data ownership", link: "/explanation/data-ownership" },
        { text: "AI-friendly docs", link: "/explanation/ai-docs" },
      ],
    },
  ],
};

const csNav = [
  { text: "Tutoriály", link: "/cs/tutorials/" },
  { text: "Jak na to", link: "/cs/how-to/" },
  { text: "Reference", link: "/cs/reference/" },
  { text: "Vysvětlení", link: "/cs/explanation/" },
];

const csSidebar = {
  "/cs/": [
    { text: "Přehled", link: "/cs/" },
    {
      text: "Tutoriály",
      link: "/cs/tutorials/",
      collapsible: true,
      items: [{ text: "Quickstart", link: "/cs/tutorials/quickstart" }],
    },
    {
      text: "Jak na to",
      link: "/cs/how-to/",
      collapsible: true,
      items: [
        { text: "Použití HTTP služby", link: "/cs/how-to/use-service" },
        { text: "Přidání dalšího providera", link: "/cs/how-to/add-provider" },
        {
          text: "Integrace legacy checkoutu (Bootstrap + vanilla JS)",
          link: "/cs/how-to/legacy-js-integration",
        },
      ],
    },
    {
      text: "Reference",
      link: "/cs/reference/",
      collapsible: true,
      items: [
        { text: "Service API", link: "/cs/reference/service-api" },
        { text: "MCP nástroj", link: "/cs/reference/mcp-tool" },
        { text: "Effect RPC", link: "/cs/reference/rpc" },
        { text: "Runtime konfigurace", link: "/cs/reference/config" },
        { text: "Core typy", link: "/cs/reference/core-types" },
        { text: "Klienti a SDK", link: "/cs/reference/sdk" },
      ],
    },
    {
      text: "Vysvětlení",
      link: "/cs/explanation/",
      collapsible: true,
      items: [
        { text: "Architektura", link: "/cs/explanation/architecture" },
        { text: "Strategie", link: "/cs/explanation/strategies" },
        { text: "Caching", link: "/cs/explanation/caching" },
        { text: "Vlastnictví dat", link: "/cs/explanation/data-ownership" },
        { text: "AI‑friendly docs", link: "/cs/explanation/ai-docs" },
      ],
    },
  ],
};

export default defineConfig({
  root: join(__dirname, "content"),
  title: "Smart Address",
  description: "Reliable address suggestions for checkout and onboarding.",
  lang: "en",
  logoText: "Smart Address",
  locales: [
    { lang: "en", label: "English" },
    { lang: "cs", label: "Čeština" },
  ],
  route: {
    cleanUrls: true,
  },
  plugins: [
    pluginShiki(),
    pluginPreview(),
    pluginPlayground({
      include: ["react", "react-dom", "@smart-address/sdk"],
    }),
  ],
  builderConfig: {
    server: {
      proxy: {
        "/demo": {
          target: docsServiceBaseUrl,
          changeOrigin: true,
        },
        "/suggest": {
          target: docsServiceBaseUrl,
          changeOrigin: true,
        },
      },
    },
  },
  themeConfig: {
    nav: enNav,
    sidebar: enSidebar,
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/NMIT-WR/new-engine",
      },
    ],
    locales: [
      {
        lang: "en",
        label: "English",
        nav: enNav,
        sidebar: enSidebar,
        outlineTitle: "ON THIS PAGE",
        searchPlaceholderText: "Search",
        searchNoResultsText: "No results found",
        searchSuggestedQueryText: "Try:",
      },
      {
        lang: "cs",
        label: "Čeština",
        nav: csNav,
        sidebar: csSidebar,
        outlineTitle: "NA TÉTO STRÁNCE",
        searchPlaceholderText: "Hledat",
        searchNoResultsText: "Nic jsme nenašli",
        searchSuggestedQueryText: "Zkuste:",
      },
    ],
  },
  llms: true,
});
