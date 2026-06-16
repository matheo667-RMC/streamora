"use client";

import { useState } from "react";

export function VideoPlayer({
  videoUrl,
  title,
}: {
  videoUrl: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <button
        onClick={() => setPlaying(false)}
        className="btn-secondary"
      >
        <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Fermer le lecteur
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        setPlaying(true);
        const videoEl = document.querySelector("video");
        if (videoEl) {
          videoEl.scrollIntoView({ behavior: "smooth" });
          videoEl.play();
        }
      }}
      className="btn-primary"
      title={`Regarder ${title}`}
    >
      <svg
        className="mr-2 h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Regarder
    </button>
  );
}
