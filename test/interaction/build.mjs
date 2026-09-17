import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const repo = fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "");
process.chdir(fileURLToPath(new URL(".", import.meta.url)));
await build({
  stdin: { contents: `export { createElement, act } from 'react';
export { createRoot } from 'react-dom/client';
export { NextVersionReset } from '${repo}/components/next-version-reset.tsx';
export { POST as resetPOST } from '${repo}/app/api/account/reset/route.ts';
export { AreaHelp } from '${repo}/components/area-help.tsx';
export { areaGuidance } from '${repo}/lib/area-guidance.ts';
export { DailyFocus } from '${repo}/components/daily-focus.tsx';
export { ArchitectCycle } from '${repo}/components/architect-cycle.tsx';
export { Orientation } from '${repo}/components/orientation.tsx';
export { GoalsWorkspace } from '${repo}/components/goals-workspace.tsx';
export { MomentumOverview } from '${repo}/components/momentum-overview.tsx';
export { MemberCommandCenter } from '${repo}/components/member-command-center.tsx';`, loader: "tsx", resolveDir: repo },
  bundle: true, platform: "node", format: "esm", jsx: "automatic", outfile: fileURLToPath(new URL("components.mjs", import.meta.url)),
  tsconfig: `${repo}/tsconfig.json`, nodePaths: [`${repo}/node_modules`],
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{ name: "component-only-stubs", setup(builder) {
    builder.onResolve({ filter: /lib\/supabase\/(client|server)$/ }, () => ({ path: "supabase", namespace: "supabase-stub" }));
    builder.onLoad({ filter: /.*/, namespace: "supabase-stub" }, () => ({ contents:"export function createClient(){return globalThis.__qaSupabase;}" }));
    builder.onResolve({ filter: /^next\/server$/ }, () => ({ path: "server", namespace: "server-stub" }));
    builder.onLoad({ filter: /.*/, namespace: "server-stub" }, () => ({ contents: "export const NextResponse={json:(body,init)=>Response.json(body,init)};" }));
    builder.onResolve({ filter: /^next\/(navigation|link|image)$/ }, args => ({ path: args.path, namespace: "next-stub" }));
    builder.onLoad({ filter: /.*/, namespace: "next-stub" }, args => ({ contents: args.path === "next/navigation" ? "export function useRouter(){ return globalThis.__qaRouter }" : args.path === "next/link" ? "import {createElement} from 'react'; export default function Link({children,...props}){ return createElement('a',props,children); }" : "import {createElement} from 'react'; export default function Image({priority,...props}){ return createElement('img',props); }", resolveDir: repo }));
    builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "js" }));
  } }],
});
