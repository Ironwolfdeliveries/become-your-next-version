import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#080808", charcoal: "#151515", cream: "#f4efe5", gold: "#c9a45c", muted: "#aaa49a" }, fontFamily: { sans: ["var(--font-inter)"], serif: ["var(--font-cormorant)"] } } }, plugins: [] } satisfies Config;
