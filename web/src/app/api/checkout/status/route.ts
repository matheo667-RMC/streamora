import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { captureOrder, getOrderStatus, deliverOrder } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Polled by the client after returning from PayPal. Captures the approved
// order (the reliable delivery path) and hands out the key.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const paymentId = req.nextUrl.searchParams.get("paymentId") || "";
  const orderId = req.nextUrl.searchParams.get("orderId") || "";
  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId } })
    : await prisma.order.findUnique({ where: { paymentId } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  if (!order.delivered && order.status !== "refunded") {
    try {
      const st = await getOrderStatus(order.paymentId);
      if (st === "APPROVED" || st === "COMPLETED") {
        const { paid, captureId } = await captureOrder(order.paymentId);
        await deliverOrder(order.paymentId, paid, captureId);
      }
    } catch {
      // network hiccup — return last known state
    }
  }

  const fresh = await prisma.order.findUnique({ where: { id: order.id } });
  return NextResponse.json({
    status: fresh?.status || "waiting",
    delivered: fresh?.delivered || false,
    keyCode: fresh?.delivered ? fresh?.keyCode : "",
  });
}
