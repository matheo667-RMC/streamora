"use client";

import { useState, useRef } from "react";
import Image from "next/image";

export function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-4">
        {value && (
          <div className="relative h-32 w-22 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
            <Image
              src={value}
              alt="Poster"
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-sm"
          >
            {uploading ? "Upload en cours..." : value ? "Changer l'image" : "Choisir une image"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          {value && (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="input-field text-xs"
              placeholder="Ou collez une URL d'image"
            />
          )}
          {!value && (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="input-field text-xs"
              placeholder="Ou collez une URL d'image"
            />
          )}
        </div>
      </div>
    </div>
  );
}
