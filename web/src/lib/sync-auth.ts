import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FOUNDER_EMAIL } from "@/lib/subscription";

/** Admin connecte, ou serveur du PC qui s'authentifie avec la cle de synchro. */
export async function allowedFromAdminOrServer(req: NextRequest): Promise<boolean> {
  const session = await auth();
  if (session?.user?.email === FOUNDER_EMAIL || (session?.user as { role?: string })?.role === "admin") {
    return true;
  }
  const key = req.headers.get("x-sync-key") || "";
  if (!key) return false;
  const s = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  return !!s?.serverSyncKey && s.serverSyncKey === key;
}
