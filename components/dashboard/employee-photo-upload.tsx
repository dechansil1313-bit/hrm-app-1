"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";

interface EmployeePhotoUploadProps {
  employeeId: string;
  initialPhoto: string | null;
  employeeName: string;
}

export function EmployeePhotoUpload({
  employeeId,
  initialPhoto,
  employeeName,
}: EmployeePhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`/api/employees/${employeeId}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: base64 }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload photo");
      }

      setPhoto(base64);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to upload photo",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/employees/${employeeId}/photo`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove photo");
      }

      setPhoto(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to remove photo",
      );
    } finally {
      setUploading(false);
    }
  };

  const initials = employeeName
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="flex items-center space-x-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {/* Avatar / Photo */}
      <div className="relative group">
        {photo ? (
          <Image
            src={photo}
            alt={employeeName}
            width={64}
            height={64}
            className="h-16 w-16 rounded-xl object-cover shadow-md"
            unoptimized
          />
        ) : (
          <div className="h-16 w-16 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-2xl shadow-md shadow-blue-200">
            {initials}
          </div>
        )}

        {/* Camera overlay on hover */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          title="Upload photo"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Info + Actions */}
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {employeeName}
          </h1>
          {/* Status badge is rendered in the parent */}
        </div>

        {/* Status messages */}
        {error && (
          <p className="text-xs text-red-600 font-medium mt-1">{error}</p>
        )}
        {success && (
          <p className="text-xs text-emerald-600 font-medium mt-1">
            Photo updated successfully!
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
          {photo && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
