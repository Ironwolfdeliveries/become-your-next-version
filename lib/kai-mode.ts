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

export type KaiUsageSettlement = {
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicroUsd: number;
};

export type KaiUsageLedgerFields = {
  input_tokens?: number;
  output_tokens?: number;
  estimated_cost_micro_usd?: number;
};

const DEFAULT_KAI_MODEL = "gpt-5-mini";
const SUPPORTED_KAI_MODELS = new Set([DEFAULT_KAI_MODEL]);
const MIN_INPUT_MICRO_USD_PER_MILLION_TOKENS = 250_000;
const MIN_OUTPUT_MICRO_USD_PER_MILLION_TOKENS = 2_000_000;
// The request character budget excludes Kai's fixed instructions and message
// framing. Four tokens per character plus this fixed allowance deliberately
// over-reserves rather than allowing an underestimated request through.
const MAX_INPUT_TOKENS_PER_CHARACTER = 4;
const FIXED_INPUT_TOKEN_ALLOWANCE = 16_384;

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

function calculateCostMicroUsd(
  inputTokens: number,
  outputTokens: number,
  inputMicroUsdPerMillionTokens: number,
  outputMicroUsdPerMillionTokens: number,
) {
  if (
    !Number.isSafeInteger(inputTokens) ||
    inputTokens < 0 ||
    !Number.isSafeInteger(outputTokens) ||
    outputTokens < 0
  )
    return null;
  const inputCost = inputTokens * inputMicroUsdPerMillionTokens;
  const outputCost = outputTokens * outputMicroUsdPerMillionTokens;
  const combinedCost = inputCost + outputCost;
  if (
    !Number.isSafeInteger(inputCost) ||
    !Number.isSafeInteger(outputCost) ||
    !Number.isSafeInteger(combinedCost)
  )
    return null;
  return Math.ceil(combinedCost / 1_000_000);
}

export function getKaiOperatingMode(): KaiOperatingMode {
  return process.env.KAI_MODE?.toUpperCase() === "LIVE_BETA"
    ? "LIVE_BETA"
    : "GUIDED";
}

export function getKaiLiveConfig(): KaiLiveConfig | null {
  if (
    getKaiOperatingMode() !== "LIVE_BETA" ||
    process.env.KAI_LIVE_BETA_ENABLED !== "true" ||
    process.env.KAI_EMERGENCY_SHUTOFF !== "false" ||
    !process.env.OPENAI_API_KEY?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
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
    MIN_INPUT_MICRO_USD_PER_MILLION_TOKENS,
  );
  const outputMicroUsdPerMillionTokens = configuredOrDefault(
    "KAI_LIVE_BETA_OUTPUT_MICRO_USD_PER_MILLION_TOKENS",
    MIN_OUTPUT_MICRO_USD_PER_MILLION_TOKENS,
  );
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_KAI_MODEL;
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
    inputMicroUsdPerMillionTokens <
      MIN_INPUT_MICRO_USD_PER_MILLION_TOKENS ||
    !outputMicroUsdPerMillionTokens ||
    outputMicroUsdPerMillionTokens <
      MIN_OUTPUT_MICRO_USD_PER_MILLION_TOKENS ||
    !SUPPORTED_KAI_MODELS.has(model)
  )
    return null;
  const monthlyBudgetMicroUsd = monthlyBudgetCents * 10_000;
  const maximumInputTokens =
    maxInputChars * MAX_INPUT_TOKENS_PER_CHARACTER +
    FIXED_INPUT_TOKEN_ALLOWANCE;
  const minimumRequestReserveMicroUsd = calculateCostMicroUsd(
    maximumInputTokens,
    maxOutputTokens,
    inputMicroUsdPerMillionTokens,
    outputMicroUsdPerMillionTokens,
  );
  if (
    minimumRequestReserveMicroUsd === null ||
    maxRequestCostMicroUsd < minimumRequestReserveMicroUsd ||
    maxRequestCostMicroUsd > monthlyBudgetMicroUsd
  )
    return null;
  return {
    dailyAllowance,
    monthlyAllowance,
    perMinuteAllowance,
    maxInputChars,
    maxOutputTokens,
    monthlyBudgetMicroUsd,
    maxRequestCostMicroUsd,
    inputMicroUsdPerMillionTokens,
    outputMicroUsdPerMillionTokens,
    model,
  };
}

export function getKaiUsageSettlement(
  config: KaiLiveConfig,
  usage:
    | { input_tokens?: number | null; output_tokens?: number | null }
    | null
    | undefined,
): KaiUsageSettlement | null {
  if (
    !usage ||
    !Number.isSafeInteger(usage.input_tokens) ||
    !Number.isSafeInteger(usage.output_tokens)
  )
    return null;
  const inputTokens = usage.input_tokens as number;
  const outputTokens = usage.output_tokens as number;
  const estimatedCostMicroUsd = calculateCostMicroUsd(
    inputTokens,
    outputTokens,
    config.inputMicroUsdPerMillionTokens,
    config.outputMicroUsdPerMillionTokens,
  );
  if (estimatedCostMicroUsd === null) return null;
  return { inputTokens, outputTokens, estimatedCostMicroUsd };
}

export function getKaiUsageLedgerFields(
  settlement: KaiUsageSettlement | null,
  releaseUnsettledReserve: boolean,
): KaiUsageLedgerFields {
  if (settlement)
    return {
      input_tokens: settlement.inputTokens,
      output_tokens: settlement.outputTokens,
      estimated_cost_micro_usd: settlement.estimatedCostMicroUsd,
    };
  return releaseUnsettledReserve ? { estimated_cost_micro_usd: 0 } : {};
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
