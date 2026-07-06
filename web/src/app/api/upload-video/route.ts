export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ success: false, message: "Aucun fichier" }, { status: 400 });
    }

    const res = await fetch(
      `https://pixeldrain.com/api/file/${encodeURIComponent(file.name)}`,
      {
        method: "PUT",
        body: file,
      }
    );

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { success: false, message: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
