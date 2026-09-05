import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FOUNDATION_FREE_DAYS, FOUNDATION_INTRO_DAYS, hasBillingConfig } from "../lib/membership.ts";

const billingEnvironmentNames = [
  "BILLING_LIVE_ENABLED",
  "STRIPE_TAX_ENABLED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_FOUNDATION_INTRO_PRICE_ID",
  "STRIPE_FOUNDATION_PRICE_ID",
  "STRIPE_BUILDER_PRICE_ID",
  "STRIPE_ARCHITECT_PRICE_ID",
] as const;

const originalEnvironment = Object.fromEntries(
  billingEnvironmentNames.map((name) => [name, process.env[name]]),
);

function configureBillingEnvironment() {
  Object.assign(process.env, {
    BILLING_LIVE_ENABLED: "true",
    STRIPE_TAX_ENABLED: "true",
    STRIPE_SECRET_KEY: "configured",
    STRIPE_WEBHOOK_SECRET: "configured",
    SUPABASE_SERVICE_ROLE_KEY: "configured",
    STRIPE_FOUNDATION_INTRO_PRICE_ID: "price_foundation_intro",
    STRIPE_FOUNDATION_PRICE_ID: "price_foundation",
    STRIPE_BUILDER_PRICE_ID: "price_builder",
    STRIPE_ARCHITECT_PRICE_ID: "price_architect",
  });
}

try {
  assert.equal(FOUNDATION_FREE_DAYS, 30, "Foundation launch access must provide exactly 30 free days");
  assert.equal(FOUNDATION_INTRO_DAYS, 60, "Foundation introductory pricing must last exactly 60 days");

  for (const name of billingEnvironmentNames) delete process.env[name];
  assert.equal(hasBillingConfig("foundation"), false);
  assert.equal(hasBillingConfig("builder"), false);
  assert.equal(hasBillingConfig("architect"), false);

  configureBillingEnvironment();
  assert.equal(hasBillingConfig("foundation"), true);
  assert.equal(hasBillingConfig("builder"), true);
  assert.equal(hasBillingConfig("architect"), true);

  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(
    hasBillingConfig("builder"),
    false,
    "Checkout must stay closed without server-side membership administration",
  );

  configureBillingEnvironment();
  process.env.BILLING_LIVE_ENABLED = "false";
  assert.equal(hasBillingConfig("builder"), false);

  configureBillingEnvironment();
  process.env.STRIPE_TAX_ENABLED = "false";
  assert.equal(hasBillingConfig("builder"), false);

  configureBillingEnvironment();
  delete process.env.STRIPE_WEBHOOK_SECRET;
  assert.equal(hasBillingConfig("builder"), false);

  configureBillingEnvironment();
  delete process.env.STRIPE_FOUNDATION_PRICE_ID;
  assert.equal(
    hasBillingConfig("foundation"),
    false,
    "Foundation Checkout requires both the introductory and standard prices",
  );
  assert.equal(
    hasBillingConfig("builder"),
    true,
    "A missing Foundation price must not disable an independently configured tier",
  );

  const checkoutSource = readFileSync(new URL("../app/api/billing/checkout/route.ts", import.meta.url), "utf8");
  for (const operation of [
    "Billing authentication",
    "Membership lookup",
    "Membership customer persistence",
  ]) {
    assert.match(
      checkoutSource,
      new RegExp(`assertSupabaseSucceeded\\(\"${operation}\"`),
      `${operation} must fail Checkout when Supabase reports an error`,
    );
  }

  const webhookSource = readFileSync(new URL("../app/api/billing/webhook/route.ts", import.meta.url), "utf8");
  for (const operation of [
    "Foundation schedule persistence",
    "Subscription membership lookup",
    "Subscription membership persistence",
    "Subscription entitlement persistence",
    "Invoice membership lookup",
    "Invoice failure persistence",
    "Architect invitation persistence",
    "Checkout analytics persistence",
    "Cancellation analytics persistence",
  ]) {
    assert.match(
      webhookSource,
      new RegExp(`assertSupabaseSucceeded\\(\"${operation}\"`),
      `${operation} must fail webhook processing when Supabase reports an error`,
    );
  }
} finally {
  for (const name of billingEnvironmentNames) {
    const originalValue = originalEnvironment[name];
    if (originalValue === undefined) delete process.env[name];
    else process.env[name] = originalValue;
  }
}

console.log(
  "Billing checks passed: launch configuration and checkout/webhook persistence fail closed.",
);
