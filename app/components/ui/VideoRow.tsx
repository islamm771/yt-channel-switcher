import { formatBytes, formatProgressSize } from "@/lib/helper";
import { UploadStatus, VideoItem } from "@/types/types";
import Image from "next/image";
import ProgressBar from "./ProgressBar";
import StatusBadge from "./StatusBadge";

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 5000;
const TAGS_MAX = 500;

// حافة لونية جنب الكارت بتدل على حالة الفيديو بنظرة واحدة
const STATUS_ACCENT: Record<UploadStatus, string> = {
  waiting: "border-s-gray-200 dark:border-s-gray-700",
  uploading: "border-s-blue-400 dark:border-s-blue-500",
  done: "border-s-emerald-400 dark:border-s-emerald-500",
  error: "border-s-red-400 dark:border-s-red-500",
};

const STATUS_TINT: Record<UploadStatus, string> = {
  waiting: "bg-white dark:bg-gray-900",
  uploading: "bg-blue-50/30 dark:bg-blue-950/10",
  done: "bg-emerald-50/40 dark:bg-emerald-950/10",
  error: "bg-red-50/40 dark:bg-red-950/10",
};

// datetime-local محتاج فورمات "YYYY-MM-DDTHH:mm" بالتوقيت المحلي
function toDatetimeLocalValue(date: Date) {
  if (!date || isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function CharCounter({ length, max }: { length: number; max: number }) {
  const isNearLimit = length >= max * 0.9;
  const isAtLimit = length >= max;
  return (
    <span
      dir="ltr"
      className={`text-[11px] tabular-nums shrink-0 ${isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-gray-400 dark:text-gray-500"
        }`}
    >
      {length}/{max}
    </span>
  );
}

const fieldClasses =
  "w-full text-sm p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 outline-none resize-y text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-60 transition-colors focus:border-blue-400 dark:focus:border-blue-600 focus:bg-white dark:focus:bg-gray-900";

function VideoRow({
  item, index, onRemove, onTitleChange, onDescriptionChange, onTagsChange, onThumbnailChange,
  onPublishAtChange, onResetPublishAt, uploading,
}: {
  item: VideoItem; index: number;
  onRemove: (i: number) => void;
  onTitleChange: (i: number, v: string) => void;
  onDescriptionChange: (i: number, v: string) => void;
  onTagsChange: (i: number, v: string) => void;
  onThumbnailChange: (i: number, file: File | null) => void;
  onPublishAtChange: (i: number, value: Date) => void;
  onResetPublishAt: (i: number) => void;
  uploading: boolean;
}) {
  return (
    <div
      className={`group flex flex-col gap-3 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-700 ${STATUS_TINT[item.status]} `}
    >
      {/* الصف العلوي: رقم، صورة مصغرة، عنوان، حالة، إجراءات */}
      <div className="flex items-start gap-3">
        <span className="mt-1 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        {/* Thumbnail picker */}
        <label
          className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-800 ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {item.thumbnailPreview ? (
            <Image src={item.thumbnailPreview} alt="video-thumb" width={160} height={160} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-300 dark:text-gray-600 text-2xl">🖼️</span>
          )}
          {!uploading && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <span className="text-white text-lg">✎</span>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png"
            disabled={uploading}
            className="hidden"
            onChange={(e) => onThumbnailChange(index, e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="flex-1 min-w-0">
          {/* العنوان بشكل مختلف (underline) عن باقي الحقول عشان يبان إنه الأهم */}
          <input
            type="text"
            value={item.title}
            onChange={(e) => onTitleChange(index, e.target.value.slice(0, TITLE_MAX))}
            disabled={uploading}
            maxLength={TITLE_MAX}
            className="w-full text-sm font-medium p-1 border-0 border-b-2 border-gray-200 dark:border-gray-700 bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400 placeholder:font-normal disabled:opacity-60 transition-colors focus:border-blue-400 dark:focus:border-blue-500"
            placeholder="عنوان الفيديو"
          />
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{formatBytes(item.file.size)}</span>
            <CharCounter length={item.title.length} max={TITLE_MAX} />
          </div>

          {/* معاد النشر */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs shrink-0">📅</span>
            <input
              type="datetime-local"
              value={toDatetimeLocalValue(item.publishAt)}
              disabled={uploading}
              onChange={(e) => {
                if (!e.target.value) return;
                onPublishAtChange(index, new Date(e.target.value));
              }}
              className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 outline-none text-gray-600 dark:text-gray-300 disabled:opacity-60 transition-colors focus:border-blue-400 dark:focus:border-blue-500"
            />
            {item.manualDate ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => onResetPublishAt(index)}
                className="text-[11px] text-blue-500 hover:text-blue-600 hover:underline disabled:opacity-60 disabled:hover:no-underline shrink-0"
              >
                رجّع للتلقائي
              </button>
            ) : (
              <span className="text-[11px] text-gray-300 dark:text-gray-600 shrink-0">تلقائي</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={item.status} />
          <div className="flex items-center gap-2">
            {item.status === "done" && item.videoId && (
              <a href={`https://studio.youtube.com/video/${item.videoId}/edit`} target="_blank" rel="noreferrer"
                className="text-[11px] text-blue-500 hover:underline whitespace-nowrap">
                فتح ↗
              </a>
            )}
            {!uploading && item.status !== "done" && (
              <button onClick={() => onRemove(index)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors text-sm leading-none p-0.5">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* الوصف والتاجز */}
      <div className="ps-9 flex flex-col gap-2">
        <div>
          <textarea
            value={item.description}
            onChange={(e) => onDescriptionChange(index, e.target.value.slice(0, DESCRIPTION_MAX))}
            disabled={uploading}
            rows={3}
            maxLength={DESCRIPTION_MAX}
            className={fieldClasses}
            placeholder="وصف الفيديو"
          />
          <div className="flex justify-end mt-1">
            <CharCounter length={item.description.length} max={DESCRIPTION_MAX} />
          </div>
        </div>

        <div>
          <input
            type="text"
            value={item.tags}
            onChange={(e) => onTagsChange(index, e.target.value.slice(0, TAGS_MAX))}
            disabled={uploading}
            maxLength={TAGS_MAX}
            className={fieldClasses}
            placeholder="tags، مفصولة بفاصلة (مثال: تعليم, برمجة, يوتيوب)"
          />
          <div className="flex justify-end mt-1">
            <CharCounter length={item.tags.length} max={TAGS_MAX} />
          </div>
        </div>
      </div>

      {(item.status === "uploading" || item.status === "done" || item.status === "error") && (
        <div className="ps-9">
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500" dir="ltr">
            <span>{formatProgressSize(item.progress, item.file.size)}</span>
            <span className="tabular-nums">{item.progress}%</span>
          </div>
          <ProgressBar value={item.progress} status={item.status} />
          {item.status === "error" && <p className="text-xs text-red-500 mt-1">{item.error}</p>}
        </div>
      )}
    </div>
  );
}

export default VideoRow;