import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Billing is not configured.");
  return new Stripe(key, { typescript: true });
}
