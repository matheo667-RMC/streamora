import type { Metadata } from "next";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streamora - Films & Séries en Streaming",
  description: "Regardez et téléchargez vos films et séries préférés sur Streamora",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-black">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
