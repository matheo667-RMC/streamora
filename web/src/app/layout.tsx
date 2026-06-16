import type { Metadata } from "next";
import { SessionProvider } from "@/components/SessionProvider";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streamora - Streaming de Films",
  description: "Regardez et téléchargez vos films préférés sur Streamora",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="fr">
      <body>
        <SessionProvider session={session}>
          <Navbar />
          <main className="min-h-screen pt-16">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
