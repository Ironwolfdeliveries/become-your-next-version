export type KaiOperatingMode = "GUIDED" | "LIVE_BETA";

export type KaiBetaAccess = {
  platform_role?: string | null;
  entitlement_status?: string | null;
  kai_live_beta_enabled?: boolean | null;
};

export type KaiOperationalSettings = {
  live_beta_enabled?: boolean | null;
  emergency_shutoff?: boolean | null;
};

export type KaiLiveConfig = {
  dailyAllowance: number;
  monthlyAllowance: number;
  perMinuteAllowance: number;
  maxInputChars: number;
  maxOutputTokens: number;
  monthlyBudgetMicroUsd: number;
  maxRequestCostMicroUsd: number;
  inputMicroUsdPerMillionTokens: number;
  outputMicroUsdPerMillionTokens: number;
  model: string;
};

function positiveInteger(name: string) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function configuredOrDefault(name: string, fallback: number) {
  return process.env[name] === undefined ? fallback : positiveInteger(name);
}

function within(value: number | null, maximum: number) {
  return value && value <= maximum ? value : null;
}

export function getKaiOperatingMode(): KaiOperatingMode {
  return process.env.KAI_MODE?.toUpperCase() === "GUIDED"
    ? "GUIDED"
    : "LIVE_BETA";
}

export function getKaiLiveConfig(): KaiLiveConfig | null {
  if (
    getKaiOperatingMode() !== "LIVE_BETA" ||
    process.env.KAI_LIVE_BETA_ENABLED === "false" ||
    process.env.KAI_EMERGENCY_SHUTOFF === "true" ||
    !process.env.OPENAI_API_KEY
  )
    return null;
  const dailyAllowance = within(
    configuredOrDefault("KAI_LIVE_BETA_DAILY_ALLOWANCE", 50),
    100,
  );
  const monthlyAllowance = within(
    configuredOrDefault("KAI_LIVE_BETA_MONTHLY_ALLOWANCE", 1_000),
    3_000,
  );
  const perMinuteAllowance = within(
    configuredOrDefault("KAI_LIVE_BETA_PER_MINUTE_ALLOWANCE", 4),
    10,
  );
  const maxInputChars = within(
    configuredOrDefault("KAI_LIVE_BETA_MAX_INPUT_CHARS", 12_000),
    20_000,
  );
  const maxOutputTokens = within(
    configuredOrDefault("KAI_LIVE_BETA_MAX_OUTPUT_TOKENS", 600),
    1_200,
  );
  const monthlyBudgetCents = within(
    configuredOrDefault("KAI_LIVE_BETA_MONTHLY_BUDGET_CENTS", 1_500),
    10_000,
  );
  const maxRequestCostMicroUsd = within(
    configuredOrDefault("KAI_LIVE_BETA_MAX_REQUEST_COST_MICRO_USD", 100_000),
    500_000,
  );
  const inputMicroUsdPerMillionTokens = configuredOrDefault(
    "KAI_LIVE_BETA_INPUT_MICRO_USD_PER_MILLION_TOKENS",
    250_000,
  );
  const outputMicroUsdPerMillionTokens = configuredOrDefault(
    "KAI_LIVE_BETA_OUTPUT_MICRO_USD_PER_MILLION_TOKENS",
    2_000_000,
  );
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  if (
    !dailyAllowance ||
    !monthlyAllowance ||
    !perMinuteAllowance ||
    !maxInputChars ||
    maxInputChars < 2_000 ||
    !maxOutputTokens ||
    maxOutputTokens < 100 ||
    !monthlyBudgetCents ||
    !maxRequestCostMicroUsd ||
    !inputMicroUsdPerMillionTokens ||
    !outputMicroUsdPerMillionTokens
  )
    return null;
  return {
    dailyAllowance,
    monthlyAllowance,
    perMinuteAllowance,
    maxInputChars,
    maxOutputTokens,
    monthlyBudgetMicroUsd: monthlyBudgetCents * 10_000,
    maxRequestCostMicroUsd,
    inputMicroUsdPerMillionTokens,
    outputMicroUsdPerMillionTokens,
    model,
  };
}

export function isKaiLiveBetaEntitled(
  access: KaiBetaAccess | null | undefined,
) {
  if (!access || access.entitlement_status !== "active") return false;
  return (
    access.platform_role === "owner" || access.kai_live_beta_enabled === true
  );
}

export function canAttemptKaiLiveBeta(args: {
  config: KaiLiveConfig | null;
  access: KaiBetaAccess | null | undefined;
  settings: KaiOperationalSettings | null | undefined;
}) {
  return Boolean(
    args.config &&
    args.settings?.live_beta_enabled === true &&
    args.settings?.emergency_shutoff === false &&
    isKaiLiveBetaEntitled(args.access),
  );
}
