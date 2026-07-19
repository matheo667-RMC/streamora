import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getNpPaymentStatus, deliverOrder } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Polled by the client while waiting for payment. Also acts as a safety net
// that delivers the key even if the IPN webhook was missed.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const paymentId = req.nextUrl.searchParams.get("paymentId") || "";
  const order = await prisma.order.findUnique({ where: { paymentId } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  if (!order.delivered) {
    try {
      const status = await getNpPaymentStatus(paymentId);
      await deliverOrder(paymentId, status);
    } catch {
      // network hiccup — return last known state
    }
  }

  const fresh = await prisma.order.findUnique({ where: { paymentId } });
  return NextResponse.json({
    status: fresh?.status || "waiting",
    delivered: fresh?.delivered || false,
    keyCode: fresh?.delivered ? fresh?.keyCode : "",
  });
}
