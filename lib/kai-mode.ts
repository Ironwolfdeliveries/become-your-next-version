export type KaiOperatingMode = "GUIDED" | "LIVE";

export type KaiLiveConfig = {
  dailyAllowance: number;
  monthlyAllowance: number;
  maxInputChars: number;
  maxOutputTokens: number;
  monthlyBudgetMicroUsd: number;
  maxRequestCostMicroUsd: number;
  inputMicroUsdPerMillionTokens: number;
  outputMicroUsdPerMillionTokens: number;
  eligibleTiers: Set<string>;
};

function positiveInteger(name: string) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function getKaiOperatingMode(): KaiOperatingMode {
  return process.env.KAI_MODE?.toUpperCase() === "LIVE" ? "LIVE" : "GUIDED";
}

export function getKaiLiveConfig(): KaiLiveConfig | null {
  if (getKaiOperatingMode() !== "LIVE" || process.env.KAI_LIVE_ENABLED !== "true" || process.env.KAI_EMERGENCY_SHUTOFF !== "false" || !process.env.OPENAI_API_KEY) return null;
  const dailyAllowance = positiveInteger("KAI_LIVE_DAILY_ALLOWANCE");
  const monthlyAllowance = positiveInteger("KAI_LIVE_MONTHLY_ALLOWANCE");
  const maxInputChars = positiveInteger("KAI_LIVE_MAX_INPUT_CHARS");
  const maxOutputTokens = positiveInteger("KAI_LIVE_MAX_OUTPUT_TOKENS");
  const monthlyBudgetCents = positiveInteger("KAI_LIVE_MONTHLY_BUDGET_CENTS");
  const maxRequestCostMicroUsd = positiveInteger("KAI_LIVE_MAX_REQUEST_COST_MICRO_USD");
  const inputMicroUsdPerMillionTokens = positiveInteger("KAI_LIVE_INPUT_MICRO_USD_PER_MILLION_TOKENS");
  const outputMicroUsdPerMillionTokens = positiveInteger("KAI_LIVE_OUTPUT_MICRO_USD_PER_MILLION_TOKENS");
  const eligibleTiers = new Set((process.env.KAI_LIVE_ELIGIBLE_TIERS ?? "").split(",").map((tier) => tier.trim()).filter(Boolean));
  if (!dailyAllowance || !monthlyAllowance || !maxInputChars || !maxOutputTokens || !monthlyBudgetCents || !maxRequestCostMicroUsd || !inputMicroUsdPerMillionTokens || !outputMicroUsdPerMillionTokens || !eligibleTiers.size) return null;
  return { dailyAllowance, monthlyAllowance, maxInputChars, maxOutputTokens, monthlyBudgetMicroUsd: monthlyBudgetCents * 10_000, maxRequestCostMicroUsd, inputMicroUsdPerMillionTokens, outputMicroUsdPerMillionTokens, eligibleTiers };
}
