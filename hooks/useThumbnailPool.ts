"use client";

import { useState } from "react";

const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB

type ThumbPoolItem = { file: File; url: string };

export function useThumbnailPool(
  onPoolChange: (pool: ThumbPoolItem[]) => void,
  setError: (msg: string | null) => void
) {
  const [pool, setPool] = useState<ThumbPoolItem[]>([]);

  const applyThumbnails = (files: File[]) => {
    const tooLarge = files.filter((f) => f.size > MAX_THUMBNAIL_SIZE);
    const valid = files.filter((f) => f.size <= MAX_THUMBNAIL_SIZE);

    setError(
      tooLarge.length
        ? `الصور دي أكبر من 2MB ومش هتترفع: ${tooLarge.map((f) => f.name).join("، ")}`
        : null
    );

    if (!valid.length) return;

    const next = [...pool, ...valid.map((f) => ({ file: f, url: URL.createObjectURL(f) }))];
    setPool(next);
    onPoolChange(next);
  };

  const removeThumbnail = (index: number) => {
    const removed = pool[index];
    if (removed) URL.revokeObjectURL(removed.url);
    const next = pool.filter((_, i) => i !== index);
    setPool(next);
    onPoolChange(next);
  };

  const clearThumbnails = () => {
    pool.forEach((t) => URL.revokeObjectURL(t.url));
    setPool([]);
    onPoolChange([]);
  };

  return { pool, applyThumbnails, removeThumbnail, clearThumbnails };
}