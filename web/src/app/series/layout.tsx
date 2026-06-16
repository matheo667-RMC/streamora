import { Suspense } from "react";

export default function SeriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div className="p-8 text-center text-gray-400">Chargement...</div>}>{children}</Suspense>;
}
