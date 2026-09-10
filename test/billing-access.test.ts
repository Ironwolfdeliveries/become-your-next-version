import assert from "node:assert/strict";
import { subscriptionAccess } from "../lib/billing-access.ts";

for (const status of ["active", "trialing"]) {
  assert.equal(subscriptionAccess("builder", status), "priority");
  assert.equal(subscriptionAccess("architect", status), "mastermind");
  assert.equal(subscriptionAccess("architect_coaching", status), "mastermind");
  assert.equal(subscriptionAccess("foundation", status), "community");
  assert.equal(subscriptionAccess("graduate", status), "community");
}
for (const status of ["past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"]) {
  for (const tier of ["builder", "architect", "architect_coaching"] as const) {
    assert.equal(subscriptionAccess(tier, status), "community", `${tier}/${status} must not retain paid community access`);
  }
}
console.log("Subscription access checks passed for active, trial, failed, and canceled memberships.");
