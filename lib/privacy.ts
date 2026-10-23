/** Which Gemini plan the deployment uses; only GEMINI_BILLING="paid" counts as paid (shown on /privacy). */
export function aiPlanIsPaid(env: string | undefined = process.env.GEMINI_BILLING): boolean {
  return env?.trim().toLowerCase() === "paid";
}
