"use client";

import { useSchedule } from "@/hooks/useSchedule";
import { useThumbnailPool } from "@/hooks/useThumbnailPool";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { useVideoQueue } from "@/hooks/useVideoQueue";
import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import BulkApply from "../components/ui/BulkApply";
import ErrorSummary from "../components/ui/ErrorSummary";
import PublishSettings from "../components/ui/PublishSettings";
import StepHeader from "../components/ui/StepHeader";
import ThumbnailUploader from "../components/ui/ThumbnailUploader";
import UploadActions from "../components/ui/UploadActions";
import UploadProgress from "../components/ui/UploadProgress";
import VideoDropzone from "../components/ui/VideoDropzone";
import VideoRow from "../components/ui/VideoRow";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const schedule = useSchedule();
  const videoQueue = useVideoQueue(
    { startDate: schedule.startDate, pubTime: schedule.pubTime, intervalDays: schedule.intervalDays },
    setThumbError
  );
  const thumbnailPool = useThumbnailPool(videoQueue.syncThumbnails, setThumbError);
  const uploadQueue = useUploadQueue(videoQueue.videos, videoQueue.updateVideoAt);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    videoQueue.addFiles(e.dataTransfer.files, thumbnailPool.pool);
  };

  const onFilesSelected = (files: FileList) => videoQueue.addFiles(files, thumbnailPool.pool);

  const total = videoQueue.videos.length;
  const done = videoQueue.videos.filter((v) => v.status === "done").length;
  const errors = videoQueue.videos.filter((v) => v.status === "error").length;
  const overallPct = total > 0
    ? Math.round(videoQueue.videos.reduce((a, v) => a + v.progress, 0) / total)
    : 0;
  const lastDate = videoQueue.videos.at(-1)?.publishAt;

  const connectChannel = async () => {
    setConnecting(true);
    await signIn("google-channel");
  };

  // لسه مفيش قناة نشطة — منوريش الداشبورد لحد ما يربط أو يختار قناة
  if (status !== "loading" && !session?.channelId) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-16 space-y-4">
          <div className="text-4xl">📺</div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            لسه معندكش قناة مربوطة
          </h1>
          <p className="text-sm text-gray-400">
            اربط قناة اليوتيوب بتاعتك الأول عشان تقدر تبدأ تجدول فيديوهاتك
          </p>
          <button
            onClick={connectChannel}
            disabled={connecting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <span>＋</span>
            {connecting ? "جاري التحويل..." : "ربط قناة يوتيوب"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">جدولة فيديوهات يوتيوب</h1>
          <p className="text-sm text-gray-400 mt-1">اتبع الخطوات دي بالترتيب — كل فيديو هينزل في يومه أوتوماتيك</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* الخطوة 1: جدول النشر */}
          <section className="space-y-3">
            <StepHeader step={1} title="جدول النشر" description="حدّد إمتى أول فيديو ينزل، وكل قد إيه بين فيديو وفيديو" />
            <div className="pr-9">
              <PublishSettings
                startDate={schedule.startDate}
                pubTime={schedule.pubTime}
                intervalDays={schedule.intervalDays}
                uploading={uploadQueue.uploading}
                total={total}
                lastDate={lastDate}
                onStartDateChange={schedule.setStartDate}
                onPubTimeChange={schedule.setPubTime}
                onIntervalChange={schedule.setIntervalDays}
              />
            </div>
          </section>

          {/* الخطوة 2: أضف الفيديوهات */}
          <section className="space-y-3">
            <StepHeader step={2} title="أضف فيديوهاتك" description="اسحب الملفات أو اختارها من جهازك" badge={total > 0 ? `${total} مُضاف` : undefined} />
            <div className="pr-9">
              <VideoDropzone uploading={uploadQueue.uploading} onDrop={onDrop} onFilesSelected={onFilesSelected} />
            </div>
          </section>
        </div>

        {/* الخطوة 3: تخصيص جماعي (اختياري) */}
        <section className="space-y-3">
          <StepHeader step={3} title="تخصيص جماعي" description="اختياري — طبّق صورة أو وصف أو tags على كل الفيديوهات دفعة واحدة" />
          <div className="pr-9 grid grid-cols-1 md:grid-cols-2 gap-3">
            <ThumbnailUploader
              thumbPool={thumbnailPool.pool}
              thumbError={thumbError}
              uploading={uploadQueue.uploading}
              onFilesSelected={thumbnailPool.applyThumbnails}
              onRemove={thumbnailPool.removeThumbnail}
              onClearAll={thumbnailPool.clearThumbnails}
            />
            <BulkApply
              uploading={uploadQueue.uploading}
              onApplyTitle={videoQueue.applyTitleToAll}
              onApplyDescription={videoQueue.applyDescriptionToAll}
              onApplyTags={videoQueue.applyTagsToAll}
            />
          </div>
        </section>

        {/* الخطوة 4: مراجعة كل فيديو */}
        {total > 0 && (
          <section className="space-y-3">
            <StepHeader step={4} title="راجع كل فيديو" description="عدّل العنوان أو الوصف أو التاجز أو الصورة لأي فيديو لوحده" />
            <div className="pr-9 space-y-2">
              <div className="flex items-center justify-end">
                {!uploadQueue.uploading && (
                  <button onClick={videoQueue.clearAll} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
                    مسح الكل
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                {videoQueue.videos.map((item, i) => (
                  <VideoRow key={item.file.name} item={item} index={i}
                    onRemove={videoQueue.removeVideo}
                    onTitleChange={videoQueue.updateTitle}
                    onDescriptionChange={videoQueue.updateDescription}
                    uploading={uploadQueue.uploading}
                    onThumbnailChange={videoQueue.updateThumbnail}
                    onTagsChange={videoQueue.updateTags}
                    onPublishAtChange={videoQueue.updatePublishAt}
                    onResetPublishAt={videoQueue.resetPublishAt} />
                ))}
              </div>
            </div>
          </section>
        )}

      </div>

      {/* شريط تحكم ثابت أسفل عمود المحتوى */}
      {total > 0 && (
        <div className="sticky bottom-0 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto p-4 space-y-3">
            {uploadQueue.uploading && <UploadProgress done={done} total={total} overallPct={overallPct} />}
            {!uploadQueue.uploading && <ErrorSummary errors={errors} />}
            <UploadActions uploading={uploadQueue.uploading} total={total} done={done} onStart={uploadQueue.startUpload} onCancel={uploadQueue.cancelUpload} />
          </div>
        </div>
      )}
    </>
  );
}