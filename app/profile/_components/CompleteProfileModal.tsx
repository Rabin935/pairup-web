"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";

type InitialProfileData = {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    gender?: string;
    age?: number;
    location?: string;
    interests?: string[] | string;
    bio?: string;
    profileImage?: string;
};

interface CompleteProfileModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: InitialProfileData | null;
}

export default function CompleteProfileModal({ open, onClose, onSuccess, initialData }: CompleteProfileModalProps) {
    const router = useRouter();
    const isEditMode = Boolean(initialData);
    const [firstname, setFirstname] = useState(initialData?.firstname || "");
    const [lastname, setLastname] = useState(initialData?.lastname || "");
    const [email, setEmail] = useState(initialData?.email || "");
    const [phone, setPhone] = useState(initialData?.phone || "");
    const [gender, setGender] = useState(initialData?.gender || "");
    const [age, setAge] = useState(initialData?.age?.toString() || "");
    const [location, setLocation] = useState(initialData?.location || "");
    const [interests, setInterests] = useState<string>("");
    const [bio, setBio] = useState(initialData?.bio || "");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(initialData?.profileImage || null);
    const [removeExistingImage, setRemoveExistingImage] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const normalizedInterests = useMemo(() => {
        if (!initialData?.interests) return "";
        if (Array.isArray(initialData.interests)) return initialData.interests.join(", ");
        return initialData.interests;
    }, [initialData]);

    useEffect(() => {
        if (open) {
            setFirstname(initialData?.firstname || "");
            setLastname(initialData?.lastname || "");
            setEmail(initialData?.email || "");
            setPhone(initialData?.phone || "");
            setGender(initialData?.gender || "");
            setAge(initialData?.age ? String(initialData.age) : "");
            setLocation(initialData?.location || "");
            setBio(initialData?.bio || "");
            setInterests(normalizedInterests);
            setPreview(initialData?.profileImage || null);
            setImageFile(null);
            setRemoveExistingImage(false);
            setError(null);
        }
    }, [open, initialData, normalizedInterests]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setImageFile(file);

        if (file) {
            const nextPreview = URL.createObjectURL(file);
            setPreview(nextPreview);
            setRemoveExistingImage(false);
        } else {
            setPreview(initialData?.profileImage || null);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const formData = new FormData();
            if (firstname) formData.append("firstname", firstname);
            if (lastname) formData.append("lastname", lastname);
            if (email) formData.append("email", email);
            if (phone) formData.append("phone", phone);
            if (gender) formData.append("gender", gender);
            if (age) formData.append("age", age);
            if (location) formData.append("location", location);
            const formattedInterests = interests
                .split(",")
                .map((interest) => interest.trim())
                .filter(Boolean)
                .join(", ");
            if (formattedInterests) formData.append("interests", formattedInterests);
            if (bio) formData.append("bio", bio);
            if (imageFile) formData.append("profileImage", imageFile);
            if (removeExistingImage && !imageFile) formData.append("removeProfileImage", "true");

            await apiClient.put("api/users/update-profile", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            router.refresh();
            onSuccess?.();
            onClose();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "Failed to update profile";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur px-4">
            <div className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
                    aria-label="Close"
                >
                    ×
                </button>
                <div className="mb-6">
                    <p className="text-xs uppercase tracking-[0.4em] text-rose-400">Profile</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                        {isEditMode ? "Update your profile" : "Complete your profile"}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {isEditMode
                            ? "Keep your details fresh so members always see the real you."
                            : "Share a little more so we can help you pair up faster."}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            First name
                            <input
                                type="text"
                                value={firstname}
                                onChange={(event) => setFirstname(event.target.value)}
                                placeholder="e.g. Jordan"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                            />
                        </label>

                        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Last name
                            <input
                                type="text"
                                value={lastname}
                                onChange={(event) => setLastname(event.target.value)}
                                placeholder="e.g. Avery"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Email
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@example.com"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                            />
                        </label>

                        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Phone
                            <input
                                type="tel"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                placeholder="+1 555 123 4567"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Gender
                            <select
                                value={gender}
                                onChange={(event) => setGender(event.target.value)}
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                            >
                                <option value="">Select gender</option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Non-binary">Non-binary</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                        </label>

                        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Age
                            <input
                                type="number"
                                min={18}
                                value={age}
                                onChange={(event) => setAge(event.target.value)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                            />
                        </label>
                    </div>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Location
                        <input
                            type="text"
                            value={location}
                            onChange={(event) => setLocation(event.target.value)}
                            placeholder="City, Country"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Interests
                        <input
                            type="text"
                            value={interests}
                            onChange={(event) => setInterests(event.target.value)}
                            placeholder="Travel, Art, Coffee..."
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Bio
                        <textarea
                            value={bio}
                            onChange={(event) => setBio(event.target.value)}
                            rows={4}
                            placeholder="Let the community know what makes you, you."
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                        />
                    </label>

                    <div>
                        <p className="text-sm font-medium text-slate-700">Profile image</p>
                        {preview ? (
                            <div className="mt-3 flex items-center gap-4">
                                <img src={preview} alt="Preview" className="h-20 w-20 rounded-2xl object-cover shadow-md" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPreview(null);
                                        setImageFile(null);
                                        setRemoveExistingImage(true);
                                    }}
                                    className="text-sm font-semibold text-rose-500"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <p className="mt-2 text-xs text-slate-400">Upload a clear photo for better matches.</p>
                        )}
                        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-6 text-center text-sm text-slate-500 hover:border-rose-200">
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            <span className="font-semibold text-slate-700">Click to upload</span>
                            <span className="text-xs text-slate-400">PNG, JPG up to 5MB</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-full bg-[#8B5CF6] from-rose-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? (isEditMode ? "Updating..." : "Saving...") : isEditMode ? "Update Profile" : "Save & Continue"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
