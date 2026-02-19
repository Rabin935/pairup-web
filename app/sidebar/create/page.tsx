"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import apiClient from "@/lib/api";

export default function CreatePage() {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const previewUrls = useMemo(() => selectedFiles.map((file) => URL.createObjectURL(file)), [selectedFiles]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setSelectedFiles(files);
        setError(null);
        setSuccessMessage(null);
    };

    const handleUpload = async () => {
        if (!selectedFiles.length) {
            setError("Select at least one image.");
            return;
        }

        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("images", file));

        setIsUploading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { data } = await apiClient.post("api/users/upload-images", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const nextImages = (data?.images as string[]) || [];
            setUploadedImages(nextImages);
            setSelectedFiles([]);
            setSuccessMessage("Images uploaded successfully.");
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "Failed to upload images.";
            setError(message);
        } finally {
            setIsUploading(false);
        }
    };

    const hasPreviews = previewUrls.length > 0;

    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-slate-50 py-16">
                <div className="mx-auto max-w-4xl px-4">
                    <section className="rounded-3xl bg-white p-8 shadow-xl shadow-rose-100/60">
                        <header className="mb-8">
                            <p className="text-xs uppercase tracking-[0.3em] text-rose-400">Create</p>
                            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Showcase your moments</h1>
                            <p className="mt-3 text-sm text-slate-500">
                                Upload multiple photos to let potential matches experience your vibe.
                            </p>
                        </header>

                        <div className="space-y-6">
                            <label className="flex flex-col gap-3 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-slate-500">
                                <span className="text-base font-semibold text-slate-700">Upload images</span>
                                <span className="text-xs text-slate-400">PNG, JPG up to 5MB each</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                                <span className="inline-flex justify-center text-sm font-medium text-rose-500">Click to choose files</span>
                            </label>

                            {hasPreviews && (
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Preview</p>
                                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {previewUrls.map((url) => (
                                            <div key={url} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                                                <img src={url} alt="Preview" className="h-48 w-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                    {successMessage}
                                </div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="w-full rounded-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isUploading ? "Uploading..." : "Upload images"}
                            </button>
                        </div>
                    </section>

                    {!!uploadedImages.length && (
                        <section className="mt-10 rounded-3xl bg-white p-8 shadow-xl shadow-rose-100/60">
                            <h2 className="text-lg font-semibold text-slate-900">Uploaded gallery</h2>
                            <p className="text-sm text-slate-500">Images stored on the server.</p>
                            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {uploadedImages.map((url) => (
                                    <div key={url} className="group relative overflow-hidden rounded-2xl border border-slate-100">
                                        <img src={url} alt="Uploaded" className="h-48 w-full object-cover transition duration-300 group-hover:scale-105" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
