"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
}

const DEFAULT_AVATARS = [
  "/avatars/avatar1.svg",
  "/avatars/avatar2.svg",
  "/avatars/avatar3.svg",
  "/avatars/avatar4.svg",
  "/avatars/avatar5.svg",
  "/avatars/avatar6.svg",
  "/avatars/avatar7.svg",
  "/avatars/avatar8.svg",
];

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    const res = await fetch("/api/profiles");
    const data = await res.json();
    setProfiles(data);
    setLoading(false);
  }

  async function createProfile() {
    if (!newName.trim()) return;
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), avatarUrl: selectedAvatar }),
    });
    if (res.ok) {
      setNewName("");
      setSelectedAvatar(DEFAULT_AVATARS[0]);
      setCreating(false);
      fetchProfiles();
    }
  }

  async function updateProfile(id: string) {
    await fetch(`/api/profiles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), avatarUrl: selectedAvatar }),
    });
    setEditing(null);
    setNewName("");
    fetchProfiles();
  }

  async function deleteProfile(id: string) {
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    setEditing(null);
    fetchProfiles();
  }

  function selectProfile(profile: Profile) {
    document.cookie = `streamora-profile=${profile.id};path=/;max-age=${60 * 60 * 24 * 365}`;
    document.cookie = `streamora-profile-name=${encodeURIComponent(profile.name)};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.push("/");
    router.refresh();
  }

  function startEdit(profile: Profile) {
    setEditing(profile.id);
    setNewName(profile.name);
    setSelectedAvatar(profile.avatarUrl || DEFAULT_AVATARS[0]);
    setShowAvatarPicker(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setSelectedAvatar(data.url);
    }
    setUploadingAvatar(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (creating || editing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
        <h1 className="mb-10 text-4xl font-bold text-white">
          {editing ? "Modifier le profil" : "Créer un profil"}
        </h1>

        <div className="w-full max-w-lg space-y-8">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="group relative"
            >
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white/10 bg-gray-800 transition-all group-hover:border-purple-500">
                {selectedAvatar ? (
                  selectedAvatar.startsWith("/avatars/") ? (
                    <div className="flex h-full w-full items-center justify-center text-5xl">
                      {getEmojiForAvatar(selectedAvatar)}
                    </div>
                  ) : (
                    <Image src={selectedAvatar} alt="" fill className="object-cover" />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-500">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 rounded-full bg-purple-600 p-2">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </div>
            </button>

            {showAvatarPicker && (
              <div className="w-full rounded-xl border border-white/10 bg-gray-900 p-6">
                <p className="mb-4 text-sm font-medium text-gray-300">Choisir un avatar</p>
                <div className="grid grid-cols-4 gap-3">
                  {DEFAULT_AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => { setSelectedAvatar(avatar); setShowAvatarPicker(false); }}
                      className={`flex h-16 w-16 items-center justify-center rounded-xl text-3xl transition-all ${
                        selectedAvatar === avatar
                          ? "border-2 border-purple-500 bg-purple-500/20 scale-110"
                          : "border border-white/10 bg-gray-800 hover:bg-gray-700"
                      }`}
                    >
                      {getEmojiForAvatar(avatar)}
                    </button>
                  ))}
                </div>
                <div className="mt-4 border-t border-white/10 pt-4">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-gray-300 hover:border-purple-500 hover:text-white transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    {uploadingAvatar ? "Upload..." : "Importer une image"}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="Nom du profil"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            maxLength={20}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-5 py-4 text-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />

          <div className="flex gap-3">
            <button
              onClick={() => editing ? updateProfile(editing) : createProfile()}
              disabled={!newName.trim()}
              className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3.5 font-semibold text-white hover:from-purple-500 hover:to-pink-500 disabled:opacity-30 transition-all"
            >
              {editing ? "Enregistrer" : "Créer"}
            </button>
            <button
              onClick={() => { setCreating(false); setEditing(null); setNewName(""); setShowAvatarPicker(false); }}
              className="rounded-lg border border-white/10 bg-white/5 px-6 py-3.5 font-semibold text-gray-300 hover:bg-white/10 transition-colors"
            >
              Annuler
            </button>
          </div>

          {editing && (
            <button
              onClick={() => deleteProfile(editing)}
              className="w-full rounded-lg border border-red-500/20 bg-red-500/5 px-6 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Supprimer ce profil
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <Image src="/logo.png" alt="Streamora" width={80} height={80} className="mb-6 rounded-xl" />
      <h1 className="mb-12 text-4xl font-bold text-white">Qui regarde ?</h1>

      <div className="flex flex-wrap items-center justify-center gap-6">
        {profiles.map((profile) => (
          <div key={profile.id} className="group flex flex-col items-center gap-3">
            <button
              onClick={() => selectProfile(profile)}
              className="relative h-32 w-32 overflow-hidden rounded-2xl border-2 border-transparent bg-gray-800 transition-all hover:border-purple-500 hover:scale-110 group-hover:shadow-[0_0_30px_rgba(147,51,234,0.3)]"
            >
              {profile.avatarUrl && profile.avatarUrl.startsWith("/avatars/") ? (
                <div className="flex h-full w-full items-center justify-center text-5xl">
                  {getEmojiForAvatar(profile.avatarUrl)}
                </div>
              ) : profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 text-4xl font-bold text-white">
                  {profile.name[0]?.toUpperCase()}
                </div>
              )}
            </button>
            <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{profile.name}</span>
            <button
              onClick={() => startEdit(profile)}
              className="text-xs text-gray-600 hover:text-purple-400 transition-colors"
            >
              Modifier
            </button>
          </div>
        ))}

        {profiles.length < 5 && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => { setCreating(true); setSelectedAvatar(DEFAULT_AVATARS[profiles.length % DEFAULT_AVATARS.length]); }}
              className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-white/5 transition-all hover:border-purple-500 hover:bg-purple-500/10 hover:scale-110"
            >
              <svg className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            <span className="text-sm text-gray-500">Ajouter</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getEmojiForAvatar(path: string): string {
  const map: Record<string, string> = {
    "/avatars/avatar1.svg": "😎",
    "/avatars/avatar2.svg": "🦊",
    "/avatars/avatar3.svg": "🐱",
    "/avatars/avatar4.svg": "🦁",
    "/avatars/avatar5.svg": "🐻",
    "/avatars/avatar6.svg": "🦄",
    "/avatars/avatar7.svg": "🐲",
    "/avatars/avatar8.svg": "🎭",
  };
  return map[path] || "👤";
}
