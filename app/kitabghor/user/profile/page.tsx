"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import AccountMenu from "../AccountMenu";
import AccountHeader from "../AccountHeader";
import { Home, User } from "lucide-react";

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  image: string | null;
  note?: string | null;
  role?: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState("");

  const userEmail = session?.user?.email || profile?.email || "";
  const userName =
    session?.user?.name ||
    profile?.name ||
    (userEmail ? userEmail.split("@")[0] : "User");

  // ✅ message helpers (auto clear)
  const showSuccess = (msg: string) => {
    setError(null);
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (msg: string) => {
    setSuccess(null);
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  // ✅ Load profile from your route
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (res.status === 401) throw new Error("Unauthorized. Please login.");
        if (!res.ok) throw new Error("Failed to load profile.");

        const data: ProfileData = await res.json();
        setProfile(data);

        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setImage(data.image ?? "");
      } catch (e: any) {
        showError(e?.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Upload image using your upload route: /api/upload/[slug]
  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const folder = "userProfilePic";

    try {
      setUploadingImage(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/upload/${folder}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data?.message || "Image upload failed.");
        return;
      }

      const url: string | undefined = data?.url;
      if (!url) {
        showError("Upload succeeded but URL not returned.");
        return;
      }

      setImage(url);
      showSuccess("Image uploaded. Now click Save Changes ✅");
    } catch (e: any) {
      showError(e?.message || "Image upload error.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // ✅ Update profile using your PUT route
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: name || null,
        phone: phone || null,
        image: image || null,
      };

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        showError("Unauthorized. Please login.");
        return;
      }

      if (!res.ok) {
        showError(data?.error || "Failed to update profile.");
        return;
      }

      // ✅ success -> sync UI
      setProfile(data);
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setImage(data.image ?? "");

      showSuccess("Profile updated successfully ✅");
    } catch (e: any) {
      showError(e?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Breadcrumb */}
      <div className="px-6 pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>

          <span>›</span>

          <Link
            href="/kitabghor/user"
            className="hover:text-foreground transition-colors"
          >
            Account
          </Link>

          <span>›</span>

          <span className="text-foreground">Edit Account</span>
        </div>
      </div>

      {/* Shared Header */}
      <AccountHeader />

      {/* Menu */}
      <AccountMenu />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-medium mb-6">Edit Account</h2>

        {loading ? (
          <Card className="p-6 bg-card text-card-foreground border border-border">
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          </Card>
        ) : (
          <Card className="p-6 bg-card text-card-foreground border border-border rounded-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Messages */}
              {error && (
                <div className="text-sm border border-border bg-background rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm border border-border bg-background rounded-lg px-3 py-2">
                  {success}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Name */}
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Name
                  </p>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    className="w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Email
                  </p>
                  <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                    {userEmail || "—"}
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Mobile Number
                  </p>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="text"
                    className="w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter your mobile number"
                  />
                </div>

                {/* Image */}
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Profile Image
                  </p>

                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="text-sm text-muted-foreground"
                    />
                    {uploadingImage && (
                      <span className="text-sm text-muted-foreground">
                        Uploading...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                    <div className="h-16 w-16 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Image URL</p>
                      <p className="text-sm break-all">{image || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}