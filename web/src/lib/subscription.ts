import { prisma } from "./prisma";

export const FOUNDER_EMAIL = "max350457@gmail.com";

export type PlanTier = "free" | "month1" | "month2" | "month6" | "lifetime";

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Gratuit",
  month1: "1 mois",
  month2: "2 mois",
  month6: "6 mois",
  lifetime: "À vie",
};

export const PLAN_DAYS: Record<Exclude<PlanTier, "free">, number> = {
  month1: 30,
  month2: 60,
  month6: 180,
  lifetime: 0, // 0 = never expires
};

export function isFounder(email?: string | null): boolean {
  return !!email && email.toLowerCase() === FOUNDER_EMAIL;
}

export interface AccessUser {
  email?: string | null;
  role?: string | null;
  planTier?: string | null;
  planExpiresAt?: Date | null;
}

// Whether a user can watch (founder/admin bypass, active paid plan, or lifetime).
export function hasActiveAccess(user: AccessUser | null | undefined): boolean {
  if (!user) return false;
  if (isFounder(user.email) || user.role === "admin") return true;
  const tier = (user.planTier || "free") as PlanTier;
  if (tier === "free") return false;
  if (tier === "lifetime") return true;
  if (!user.planExpiresAt) return false;
  return new Date(user.planExpiresAt).getTime() > Date.now();
}

// Grant a plan to a user, stacking duration onto any remaining time.
export async function grantPlan(userId: string, tier: Exclude<PlanTier, "free">) {
  const days = PLAN_DAYS[tier];
  let planExpiresAt: Date | null = null;
  if (tier === "lifetime" || days === 0) {
    planExpiresAt = null;
  } else {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planExpiresAt: true, planTier: true },
    });
    const base =
      user?.planExpiresAt && new Date(user.planExpiresAt).getTime() > Date.now()
        ? new Date(user.planExpiresAt)
        : new Date();
    base.setDate(base.getDate() + days);
    planExpiresAt = base;
  }
  // lifetime always wins; otherwise set the new tier
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { planTier: true },
  });
  const finalTier = current?.planTier === "lifetime" ? "lifetime" : tier;
  const finalExpiry = current?.planTier === "lifetime" ? null : planExpiresAt;
  return prisma.user.update({
    where: { id: userId },
    data: { planTier: finalTier, planExpiresAt: finalExpiry },
  });
}

// Revoke a user's plan (e.g. after a refund): reset to free.
export async function revokePlan(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { planTier: "free", planExpiresAt: null },
  });
}

// Generate a Streamora-XXXXXXXX key code (no ambiguous chars).
export function generateKeyCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `Streamora-${s.slice(0, 4)}-${s.slice(4, 10)}`;
}
