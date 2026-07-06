"use client";

import { useEffect } from "react";
import { addToHistory } from "@/lib/watch-history";

interface Props {
  id: string;
  type: "film" | "episode";
  title: string;
  posterUrl?: string;
  filmId?: string;
  seriesId?: string;
  seriesTitle?: string;
  season?: number;
  episodeNumber?: number;
  videoUrl: string;
}

export function TrackWatch(props: Props) {
  useEffect(() => {
    if (!props.videoUrl) return;
    addToHistory({
      id: props.id,
      type: props.type,
      title: props.title,
      posterUrl: props.posterUrl,
      filmId: props.filmId,
      seriesId: props.seriesId,
      seriesTitle: props.seriesTitle,
      season: props.season,
      episodeNumber: props.episodeNumber,
      videoUrl: props.videoUrl,
    });
  }, [props.id, props.type, props.videoUrl, props.title, props.posterUrl, props.filmId, props.seriesId, props.seriesTitle, props.season, props.episodeNumber]);

  return null;
}
