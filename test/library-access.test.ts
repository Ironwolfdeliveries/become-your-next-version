import assert from "node:assert/strict";
import { effectiveLibraryTier, canReadLibraryResource } from "../lib/library-entitlement.ts";

assert.equal(effectiveLibraryTier(null, null), "free");
for (const status of ["free", "past_due", "canceled", "incomplete", "paused"]) {
  assert.equal(effectiveLibraryTier({ tier: "architect", status }, null), "free", `${status} must not grant protected library access`);
}
for (const status of ["active", "trialing"]) {
  assert.equal(effectiveLibraryTier({ tier: "foundation", status }, null), "foundation");
  assert.equal(effectiveLibraryTier({ tier: "builder", status }, null), "builder");
  assert.equal(effectiveLibraryTier({ tier: "architect", status }, null), "architect");
  assert.equal(effectiveLibraryTier({ tier: "graduate", status }, null), "foundation");
  assert.equal(effectiveLibraryTier({ tier: "unknown", status }, null), "free");
}
assert.equal(effectiveLibraryTier(null, { entitlement_tier: "architect_coaching", entitlement_status: "active" }), "architect");
assert.equal(effectiveLibraryTier(null, { entitlement_tier: "architect_coaching", entitlement_status: "paused" }), "free");
assert.equal(effectiveLibraryTier({ tier: "architect", status: "active" }, { entitlement_tier: "foundation", entitlement_status: "active" }), "foundation");
assert.equal(canReadLibraryResource("free", "free"), true);
assert.equal(canReadLibraryResource("free", "foundation"), false);
assert.equal(canReadLibraryResource("foundation", "builder"), false);
assert.equal(canReadLibraryResource("builder", "architect"), false);
assert.equal(canReadLibraryResource("architect", "foundation"), true);
assert.equal(canReadLibraryResource("architect", "architect"), true);
console.log("Library entitlement checks passed.");
