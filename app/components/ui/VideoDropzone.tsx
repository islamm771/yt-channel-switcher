import { useState } from "react";

function VideoDropzone({
  uploading, onDrop, onFilesSelected,
}: {
  uploading: boolean;
  onDrop: (e: React.DragEvent) => void;
  onFilesSelected: (files: FileList) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragging(false);
    onDrop(e);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && document.getElementById("fileInput")?.click()}
      className={`border-2 border-dashed rounded-2xl p-8 py-24 text-center cursor-pointer transition-colors ${uploading
        ? "border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed"
        : isDragging
          ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
        }`}
    >
      <div className="text-3xl mb-2">☁️</div>
      <p className="text-md font-medium text-gray-700 dark:text-gray-300">اسحب الفيديوهات هنا أو اضغط للاختيار</p>
      <p className="text-sm text-gray-400 mt-1">MP4 · MOV · AVI — حتى 30 فيديو</p>
      <input
        id="fileInput"
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            onFilesSelected(e.target.files);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

export default VideoDropzone;