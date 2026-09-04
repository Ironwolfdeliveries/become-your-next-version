import { NextResponse } from "next/server";
import { buildGuidedKaiResponse } from "@/lib/kai-guided";
import { canAttemptKaiLiveBeta, getKaiLiveConfig } from "@/lib/kai-mode";
import type {
  KaiBetaAccess,
  KaiLiveConfig,
  KaiOperationalSettings,
} from "@/lib/kai-mode";
import { getKaiMemberContext, KAI_SYSTEM_PROMPT } from "@/lib/kai-server";
import { getKaiPageContext } from "@/lib/kai-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type KaiPayload = {
  message?: string;
  route?: string;
  intent?: string;
  conversationId?: string | null;
};
type AuthenticatedUser = { id: string };

async function saveConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string | null,
  message: string,
  answer: string,
  route: string,
) {
  let id = conversationId;
  if (id) {
    const { data } = await supabase
      .from("kai_conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) id = null;
  }
  if (!id) {
    const { data } = await supabase
      .from("kai_conversations")
      .insert({ user_id: userId, title: message.slice(0, 80) })
      .select("id")
      .single();
    id = data?.id ?? null;
  }
  if (id) {
    await supabase.from("kai_messages").insert([
      {
        conversation_id: id,
        user_id: userId,
        role: "user",
        content: message,
        route,
      },
      {
        conversation_id: id,
        user_id: userId,
        role: "assistant",
        content: answer,
        route,
      },
    ]);
  }
  return id;
}

async function logGuidedUsage(userId: string, fallbackReason: string | null) {
  const { error } = await createAdminClient()
    .from("kai_usage_events")
    .insert({
      user_id: userId,
      mode: "guided",
      request_status: "completed",
      fallback_reason: fallbackReason,
    });
  if (error) console.error("kai_guided_usage_log_failed", error);
}

async function reserveLiveRequest(config: KaiLiveConfig, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_kai_live_beta", {
    p_user_id: userId,
    p_model: config.model,
    p_per_minute_allowance: config.perMinuteAllowance,
    p_daily_allowance: config.dailyAllowance,
    p_monthly_allowance: config.monthlyAllowance,
    p_monthly_budget_micro_usd: config.monthlyBudgetMicroUsd,
    p_request_reserve_micro_usd: config.maxRequestCostMicroUsd,
  });
  if (error) {
    console.error("kai_live_beta_reservation_failed", error);
    return null;
  }
  return typeof data === "string" ? data : null;
}

function boundedHistory(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  characterBudget: number,
) {
  const selected: typeof history = [];
  let used = 0;
  for (const item of [...history].reverse()) {
    if (used + item.content.length > characterBudget) continue;
    selected.unshift(item);
    used += item.content.length;
  }
  return selected;
}

async function runLiveKai(args: {
  config: KaiLiveConfig;
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: AuthenticatedUser;
  message: string;
  route: string;
  conversationId: string | null;
}) {
  const { config, supabase, user, message, route } = args;
  const reservationId = await reserveLiveRequest(config, user.id);
  if (!reservationId) return null;
  const admin = createAdminClient();
  try {
    const [{ default: OpenAI }, context] = await Promise.all([
      import("openai"),
      getKaiMemberContext(supabase, user.id),
    ]);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: message,
    });
    if (moderation.results[0]?.flagged) {
      await admin
        .from("kai_usage_events")
        .update({
          request_status: "blocked",
          estimated_cost_micro_usd: 0,
          fallback_reason: "safety_moderation",
        })
        .eq("id", reservationId);
      return { blocked: true as const };
    }

    const page = getKaiPageContext(route);
    let conversationId = args.conversationId;
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (conversationId) {
      const { data: valid } = await supabase
        .from("kai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (valid) {
        const { data } = await supabase
          .from("kai_messages")
          .select("role,content")
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(12);
        history = (data ?? []) as Array<{
          role: "user" | "assistant";
          content: string;
        }>;
      } else conversationId = null;
    }

    const contextJson = JSON.stringify(context);
    const contextBudget = Math.max(
      500,
      Math.floor(config.maxInputChars * 0.55),
    );
    const contextText =
      contextJson.length > contextBudget
        ? `${contextJson.slice(0, contextBudget)}…`
        : contextJson;
    const framing = `Current page: ${page.title}. Page purpose: ${page.purpose}. Permitted private member context: ${contextText}. Journal entries are deliberately excluded.`;
    const historyBudget = Math.max(
      0,
      config.maxInputChars - framing.length - message.length,
    );
    const input = [
      { role: "system" as const, content: framing },
      ...boundedHistory(history, historyBudget),
      { role: "user" as const, content: message },
    ];
    const response = await openai.responses.create({
      model: config.model,
      instructions: KAI_SYSTEM_PROMPT,
      input,
      max_output_tokens: config.maxOutputTokens,
    });
    const answer = response.output_text.trim();
    if (!answer) throw new Error("Kai returned an empty response.");
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const estimatedCost = Math.ceil(
      (inputTokens * config.inputMicroUsdPerMillionTokens +
        outputTokens * config.outputMicroUsdPerMillionTokens) /
        1_000_000,
    );
    const { error: usageError } = await admin
      .from("kai_usage_events")
      .update({
        request_status: "completed",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_micro_usd: estimatedCost,
      })
      .eq("id", reservationId);
    if (usageError)
      console.error("kai_live_beta_usage_finalize_failed", usageError);
    conversationId = await saveConversation(
      supabase,
      user.id,
      conversationId,
      message,
      answer,
      route,
    ).catch(() => conversationId);
    return { answer, conversationId, mode: "LIVE_BETA" as const };
  } catch (error) {
    await admin
      .from("kai_usage_events")
      .update({
        request_status: "failed",
        estimated_cost_micro_usd: 0,
        fallback_reason: "provider_or_runtime_error",
      })
      .eq("id", reservationId);
    throw error;
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as KaiPayload;
  const message = payload.message?.trim() ?? "";
  const route = payload.route?.startsWith("/")
    ? payload.route.slice(0, 300)
    : "/";
  if (!message || message.length > 1_000)
    return NextResponse.json(
      { error: "Enter a question of 1,000 characters or fewer." },
      { status: 400 },
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const assessmentMode =
    route === "/assessment" || route === "/architect-assessment";
  const liveConfig = getKaiLiveConfig();
  let fallbackReason: string | null = assessmentMode
    ? "assessment_safeguard"
    : null;

  if (liveConfig && user && !assessmentMode) {
    const admin = createAdminClient();
    const [accessResult, settingsResult] = await Promise.all([
      admin
        .from("account_access")
        .select("platform_role,entitlement_status,kai_live_beta_enabled")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("kai_operational_settings")
        .select("live_beta_enabled,emergency_shutoff")
        .eq("singleton", true)
        .maybeSingle(),
    ]);
    const access = accessResult.data as KaiBetaAccess | null;
    const settings = settingsResult.data as KaiOperationalSettings | null;
    if (canAttemptKaiLiveBeta({ config: liveConfig, access, settings })) {
      try {
        const live = await runLiveKai({
          config: liveConfig,
          supabase,
          user,
          message,
          route,
          conversationId: payload.conversationId ?? null,
        });
        if (live?.blocked)
          return NextResponse.json(
            {
              error:
                "Kai cannot help with that request. If this involves immediate danger, contact local emergency services.",
            },
            { status: 400 },
          );
        if (live) return NextResponse.json(live);
        fallbackReason = "operational_limit_or_budget";
      } catch (error) {
        console.error("kai_live_beta_failed_falling_back_to_guided", error);
        fallbackReason = "provider_or_runtime_error";
      }
    } else if (settings?.emergency_shutoff)
      fallbackReason = "emergency_shutoff";
    else if (!settings?.live_beta_enabled) fallbackReason = "owner_switch_off";
    else fallbackReason = "not_beta_approved";
  } else if (!fallbackReason)
    fallbackReason = liveConfig
      ? "sign_in_or_approval_required"
      : "live_beta_not_configured";

  const page = getKaiPageContext(route);
  const context = user
    ? await getKaiMemberContext(supabase, user.id).catch(() => null)
    : null;
  const guided = buildGuidedKaiResponse({
    message,
    intent: payload.intent,
    page,
    context,
    assessmentMode,
  });
  let conversationId = payload.conversationId ?? null;
  if (user) {
    [conversationId] = await Promise.all([
      saveConversation(
        supabase,
        user.id,
        conversationId,
        message,
        guided.answer,
        route,
      ).catch(() => conversationId),
      logGuidedUsage(user.id, fallbackReason),
    ]);
  }
  return NextResponse.json({
    ...guided,
    conversationId,
    mode: "GUIDED" as const,
  });
}
