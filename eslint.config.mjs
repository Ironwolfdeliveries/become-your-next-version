import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const eslintConfig = [{ ignores: [".next/**", "next-env.d.ts", "test/interaction/components.mjs"] }, ...compat.extends("next/core-web-vitals", "next/typescript")];

export default eslintConfig;
