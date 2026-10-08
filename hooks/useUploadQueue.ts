"use client";

import { uploadWithProgress } from "@/lib/uploadWithProgress";
import { VideoItem } from "@/types/types";
import { useRef, useState } from "react";

export function useUploadQueue(videos: VideoItem[], updateVideo: (index: number, patch: Partial<VideoItem>) => void) {
  const [uploading, setUploading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startUpload = async () => {
    if (!videos.length || uploading) return;
    setUploading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    for (let i = 0; i < videos.length; i++) {
      if (controller.signal.aborted) break;
      if (videos[i].status === "done") continue;

      updateVideo(i, { status: "uploading" });

      try {
        const result = await uploadWithProgress(
          videos[i],
          (pct) => updateVideo(i, { progress: pct }),
          controller.signal
        );
        updateVideo(i, { status: "done", progress: 100, videoId: result.videoId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "خطأ غير معروف";
        updateVideo(i, { status: "error", error: msg });
      }
    }

    setUploading(false);
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    setUploading(false);
  };

  return { uploading, startUpload, cancelUpload };
}