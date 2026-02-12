import type { PlanLimits } from "@/types"

export interface Plan {
  id: string
  name: string
  description: string
  price: number
  priceId: string | null // Stripe Price ID — null for free tier
  features: string[]
  popular?: boolean
  cta: string
  ctaLink: string
}

const planLimitsMap: Record<string, PlanLimits> = {
  free: {
    runsPerMonth: 50,
    maxConcurrent: 2,
    maxWorkflows: 5,
    maxApiKeys: 2,
  },
  pro: {
    runsPerMonth: 1000,
    maxConcurrent: 10,
    maxWorkflows: 50,
    maxApiKeys: 10,
  },
  enterprise: {
    runsPerMonth: Infinity,
    maxConcurrent: 50,
    maxWorkflows: Infinity,
    maxApiKeys: 50,
  },
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "For personal projects",
    price: 0,
    priceId: null,
    features: [
      "50 workflow runs/month",
      "2 concurrent jobs",
      "5 saved workflows",
      "2 API keys",
      "Community support",
    ],
    cta: "Get Started",
    ctaLink: "/login",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For professionals and teams",
    price: 49,
    priceId: null, // TODO: Add Stripe Price ID (e.g., "price_xxx")
    features: [
      "1,000 workflow runs/month",
      "10 concurrent jobs",
      "50 saved workflows",
      "10 API keys",
      "Priority support",
      "Headless API access",
    ],
    popular: true,
    cta: "Start Free Trial",
    ctaLink: "/login",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For scale",
    price: 199,
    priceId: null, // TODO: Add Stripe Price ID (e.g., "price_xxx")
    features: [
      "Unlimited workflow runs",
      "50 concurrent jobs",
      "Unlimited saved workflows",
      "50 API keys",
      "Dedicated support",
      "Headless API access",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    ctaLink: "/login",
  },
]

export function getPlanByPriceId(priceId: string | null): Plan | undefined {
  if (!priceId) return plans.find(p => p.id === "free")
  return plans.find(p => p.priceId === priceId)
}

export function getPlanName(priceId: string | null): string {
  const plan = getPlanByPriceId(priceId)
  return plan?.name ?? "Pro"
}

export function getPlanById(id: string): Plan | undefined {
  return plans.find(p => p.id === id)
}

export function getPaidPlans(): Plan[] {
  return plans.filter(p => p.price > 0)
}

export function getPlanLimits(planId: string): PlanLimits {
  return planLimitsMap[planId] ?? planLimitsMap.free
}
