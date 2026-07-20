import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public: payment tiers + wallet addresses + contact for the "Payer" page.
export async function GET() {
  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    return NextResponse.json({
      telegramHandle: s?.telegramHandle ?? "",
      paypalEmail: s?.paypalEmail ?? "",
      wallets: {
        BTC: s?.btcAddress ?? "",
        ETH: s?.ethAddress ?? "",
        USDT: s?.usdtAddress ?? "",
        LTC: s?.ltcAddress ?? "",
        TRX: s?.trxAddress ?? "",
        SOL: s?.solAddress ?? "",
      },
      prices: {
        month1: s?.priceMonth1 ?? 5,
        month2: s?.priceMonth2 ?? 8,
        month6: s?.priceMonth6 ?? 20,
        lifetime: s?.priceLifetime ?? 99.99,
      },
      paywallEnabled: s?.paywallEnabled ?? false,
      autoPayEnabled: !!process.env.STRIPE_SECRET_KEY,
    });
  } catch {
    return NextResponse.json({
      telegramHandle: "",
      paypalEmail: "",
      wallets: {},
      prices: { month1: 5, month2: 8, month6: 20, lifetime: 99.99 },
      paywallEnabled: false,
    });
  }
}
