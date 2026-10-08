"use client";

import { buildScheduleDates } from "@/lib/helper";
import { UploadStatus, VideoItem } from "@/types/types";
import { useCallback, useEffect, useState } from "react";

const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB

type Schedule = { startDate: string; pubTime: string; intervalDays: number };
type ThumbPoolItem = { file: File; url: string };

export function useVideoQueue(schedule: Schedule, setThumbError: (msg: string | null) => void) {
  const [videos, setVideos] = useState<VideoItem[]>([]);

  // بيعيد حساب تواريخ الفيديوهات "التلقائية" بس، ويسيب اللي معاها manualDate زي ما هي
  const recomputeAutoDates = useCallback((list: VideoItem[]): VideoItem[] => {
    const autoIndices = list.map((_, i) => i).filter((i) => !list[i].manualDate);
    const dates = buildScheduleDates(schedule.startDate, schedule.pubTime, autoIndices.length, schedule.intervalDays);
    return list.map((v, i) => {
      if (v.manualDate) return v;
      const autoIdx = autoIndices.indexOf(i);
      return { ...v, publishAt: dates[autoIdx] };
    });
  }, [schedule.startDate, schedule.pubTime, schedule.intervalDays]);
  

  // لما إعدادات الجدول تتغيّر (تاريخ/وقت/فاصل)، أعد حساب تواريخ الفيديوهات التلقائية بس
  useEffect(() => {
    const recompute = () => setVideos((prev) => recomputeAutoDates(prev));
    recompute();
  }, [schedule.startDate, schedule.pubTime, schedule.intervalDays,recomputeAutoDates]);

  const updateVideoAt = (index: number, patch: Partial<VideoItem>) => {
    setVideos((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const addFiles = (fileList: FileList, thumbPool: ThumbPoolItem[]) => {
    const existing = new Set(videos.map((v) => v.file.name));
    const newFiles = [...fileList].filter((f) => !existing.has(f.name));
    if (!newFiles.length) return;

    const currentCount = videos.length;

    setVideos((prev) => {
      const added = newFiles.map((f, i) => {
        const globalIndex = currentCount + i;
        const picked = thumbPool.length ? thumbPool[globalIndex % thumbPool.length] : undefined;
        return {
          file: f,
          title: f.name.replace(/\.[^.]+$/, ""),
          description: "",
          tags: "",
          thumbnail: picked?.file,
          thumbnailPreview: picked?.url,
          publishAt: new Date(),
          progress: 0,
          status: "waiting" as UploadStatus,
        };
      });
      return recomputeAutoDates([...prev, ...added]);
    });
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => recomputeAutoDates(prev.filter((_, i) => i !== index)));
  };

  const updatePublishAt = (index: number, isoValue: Date) => {
    updateVideoAt(index, { publishAt: isoValue, manualDate: true });
  };

  const resetPublishAt = (index: number) => {
    setVideos((prev) => recomputeAutoDates(prev.map((v, i) => (i === index ? { ...v, manualDate: false } : v))));
  };

  const updateTitle = (index: number, value: string) => updateVideoAt(index, { title: value });
  const updateDescription = (index: number, value: string) => updateVideoAt(index, { description: value });
  const updateTags = (index: number, value: string) => updateVideoAt(index, { tags: value });

  const applyTitleToAll = (value: string) => setVideos((prev) => prev.map((v) => ({ ...v, title: value })));
  const applyDescriptionToAll = (value: string) => setVideos((prev) => prev.map((v) => ({ ...v, description: value })));
  const applyTagsToAll = (value: string) => setVideos((prev) => prev.map((v) => ({ ...v, tags: value })));

  const updateThumbnail = (index: number, file: File | null) => {
    if (file && file.size > MAX_THUMBNAIL_SIZE) {
      setThumbError(`الصورة "${file.name}" أكبر من 2MB، اختار صورة أصغر`);
      return;
    }
    setThumbError(null);
    updateVideoAt(index, {
      thumbnail: file ?? undefined,
      thumbnailPreview: file ? URL.createObjectURL(file) : undefined,
    });
  };

  // بتتنادى من useThumbnailPool لما الـ pool يتغيّر عشان يعاد توزيع الصور على الفيديوهات
  const syncThumbnails = (pool: ThumbPoolItem[]) => {
    setVideos((prev) =>
      prev.map((v, i) => {
        const picked = pool.length ? pool[i % pool.length] : undefined;
        return { ...v, thumbnail: picked?.file, thumbnailPreview: picked?.url };
      })
    );
  };

  const clearAll = () => setVideos([]);

  return {
    videos,
    addFiles,
    removeVideo,
    updateTitle,
    updateDescription,
    updateTags,
    applyTitleToAll,
    applyDescriptionToAll,
    applyTagsToAll,
    updateThumbnail,
    updatePublishAt,
    resetPublishAt,
    syncThumbnails,
    updateVideoAt,
    clearAll,
  };
}