"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUploadThing } from "@/lib/uploadthing";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startUpload, isUploading } = useUploadThing("audioUploader", {
    onClientUploadComplete: (res) => {
      const meetingId = res?.[0]?.serverData?.meetingId;
      if (meetingId) {
        router.push(`/meetings/${meetingId}`);
      } else {
        router.refresh();
      }
    },
    onUploadError: (e) => setError(e.message),
  });

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    startUpload(Array.from(files));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition",
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-neutral-300 hover:border-neutral-400 bg-white"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      {isUploading ? (
        <div className="flex flex-col items-center gap-3 text-neutral-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Uploading…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-neutral-600">
          <Upload className="w-8 h-8" />
          <div>
            <p className="font-medium text-neutral-900">
              Drop an audio file or click to upload
            </p>
            <p className="text-sm mt-1">MP3, M4A, WAV up to 32MB</p>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
