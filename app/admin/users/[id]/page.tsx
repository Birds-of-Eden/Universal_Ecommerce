"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Mail,
  Phone,
  User as UserIcon,
  Shield,
  ShoppingBag,
  Star,
  Heart,
  ShoppingCart,
  Calendar,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  address: {
    addresses?: string[];
    address_1?: string;
    address_2?: string;
    address_3?: string;
    [key: string]: unknown;
  } | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: number | null;
  note: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  orders: Array<{
    id: number;
    status: string;
    grandTotal: number;
    orderDate: Date;
  }>;
  _count: {
    orders: number;
    reviews: number;
    cart: number;
    wishlist: number;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"ban" | "unban" | null>(
    null
  );
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "user",
    phone: "",
    note: "",
    addresses: [""],
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${params.id}`);
        if (response.ok) {
          const userData = await response.json();

          const normalizedUser: UserDetail = {
            ...userData,
            orders: (userData.orders ?? []).map((order: {
              id: number;
              status: string;
              grand_total: number | string;
              order_date: Date;
            }) => ({
              id: order.id,
              status: order.status,
              grandTotal: Number(order.grand_total),
              orderDate: order.order_date,
            })),
          };

          // Normalize addresses array from Json
          const rawAddress = (userData.address || {}) as {
            addresses?: unknown;
            address_1?: string;
            address_2?: string;
            address_3?: string;
          };
          let addresses: string[] = [];
          if (Array.isArray(rawAddress.addresses)) {
            addresses = rawAddress.addresses.filter(
              (a): a is string => typeof a === "string" && a.trim().length > 0
            );
          } else {
            if (rawAddress.address_1) addresses.push(rawAddress.address_1);
            if (rawAddress.address_2) addresses.push(rawAddress.address_2);
            if (rawAddress.address_3) addresses.push(rawAddress.address_3);
          }
          if (addresses.length === 0) {
            addresses = [""];
          }

          setUser(normalizedUser);
          setFormData({
            name: userData.name || "",
            role: userData.role,
            phone: userData.phone || "",
            note: userData.note || "",
            addresses,
          });
        } else {
          toast.error("ব্যবহারকারী লোড করতে ব্যর্থ হয়েছে");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("ব্যবহারকারী ডেটা লোড করতে ত্রুটি হয়েছে");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchUser();
    }
  }, [params.id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const loadingId = toast.loading("ব্যবহারকারী আপডেট করা হচ্ছে...");

      const trimmedAddresses = formData.addresses
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      if (trimmedAddresses.length === 0) {
        toast.error("কমপক্ষে একটি ঠিকানা দিন");
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/users/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          phone: formData.phone,
          note: formData.note,
          address: {
            addresses: trimmedAddresses,
          },
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();

        const normalizedUser: UserDetail = {
          ...updatedUser,
          orders: (updatedUser.orders ?? []).map((order: {
            id: number;
            status: string;
            grand_total: number | string;
            order_date: Date;
          }) => ({
            id: order.id,
            status: order.status,
            grandTotal: Number(order.grand_total),
            orderDate: order.order_date,
          })),
        };

        setUser(normalizedUser);
        setEditing(false);
        toast.dismiss(loadingId);
        toast.success("ব্যবহারকারী সফলভাবে আপডেট হয়েছে");
      } else {
        toast.error("ব্যবহারকারী আপডেট করতে ব্যর্থ হয়েছে");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("ব্যবহারকারী আপডেট করতে ত্রুটি হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handleBanUser = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          banned: true,
          banReason: "ম্যানুয়ালি নিষিদ্ধ",
          banExpires: null,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        toast.success("ব্যবহারকারী সফলভাবে নিষিদ্ধ হয়েছে");
      } else {
        toast.error("ব্যবহারকারী নিষিদ্ধ করতে ব্যর্থ হয়েছে");
      }
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("ব্যবহারকারী নিষিদ্ধ করতে ত্রুটি হয়েছে");
    }
  };

  const handleUnbanUser = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          banned: false,
          banReason: null,
          banExpires: null,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        toast.success("ব্যবহারকারীর নিষেধাজ্ঞা সফলভাবে তুলে নেওয়া হয়েছে");
      } else {
        toast.error("নিষেধাজ্ঞা তুলতে ব্যর্থ হয়েছে");
      }
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("নিষেধাজ্ঞা তুলতে ত্রুটি হয়েছে");
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("উভয় পাসওয়ার্ড ফিল্ড পূরণ করুন");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("পাসওয়ার্ডগুলো মেলে না");
      return;
    }

    try {
      setChangingPassword(true);
      const loadingId = toast.loading("পাসওয়ার্ড পরিবর্তন করা হচ্ছে...");

      const response = await fetch(`/api/users/${params.id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: passwordData.newPassword,
        }),
      });

      toast.dismiss(loadingId);

      if (response.ok) {
        toast.success("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে");
        setShowPasswordModal(false);
        setPasswordData({ newPassword: "", confirmPassword: "" });
      } else {
        const data = await response.json().catch(() => ({}));
        setPasswordError(data?.error || "পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("পাসওয়ার্ড পরিবর্তন করতে ত্রুটি হয়েছে");
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      DELIVERED: "bg-green-100 text-green-800 border-green-200",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
      PROCESSING: "bg-purple-100 text-purple-800 border-purple-200",
      SHIPPED: "bg-indigo-100 text-indigo-800 border-indigo-200",
    };
    return (
      colors[status as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const getStatusText = (status: string) => {
    const texts = {
      DELIVERED: "ডেলিভার্ড",
      CANCELLED: "বাতিল",
      PENDING: "পেন্ডিং",
      CONFIRMED: "কনফার্মড",
      PROCESSING: "প্রসেসিং",
      SHIPPED: "শিপড",
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fffffd] to-[#e5ffd6] p-6">
        <div>
          <div className="flex flex-col justify-center items-center h-96 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-[#2C4A3B] to-[#819A91] rounded-2xl flex items-center justify-center shadow-lg">
                <UserIcon className="h-8 w-8 text-[#EEEFE0]" />
              </div>
              <div className="absolute -inset-2 bg-[#819A91] rounded-2xl opacity-20 animate-pulse"></div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-xl font-semibold text-[#2C4A3B]">
                ব্যবহারকারী ডেটা লোড হচ্ছে...
              </div>
              <div className="text-[#819A91] text-sm">
                অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন
              </div>
            </div>
            <RefreshCw className="h-6 w-6 text-[#819A91] animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#ffffff] to-[#ebffe2] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
            <div className="flex items-center space-x-3">
              <XCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  ব্যবহারকারী পাওয়া যায়নি
                </h3>
                <p className="text-red-600 mt-1">
                  আপনি যে ব্যবহারকারী খুঁজছেন তা পাওয়া যায়নি।
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEEFE0] to-[#F5F6E9] p-4 sm:p-6">
      <div>
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-[#D1D8BE] text-[#819A91] hover:bg-[#819A91] hover:text-[#EEEFE0] transition-all duration-300 mb-6 shadow-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>ব্যবহারকারী তালিকায় ফিরে যান</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-[#2C4A3B] to-[#819A91] rounded-2xl flex items-center justify-center shadow-lg">
                  <UserIcon className="h-8 w-8 text-[#EEEFE0]" />
                </div>
                {user.banned && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full">
                    <Ban className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#2C4A3B]">
                  {user.name || "নাম নেই"}
                </h1>
                <p className="text-[#819A91] mt-1 flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-800 border-purple-200"
                        : "bg-blue-100 text-blue-800 border-blue-200"
                    }`}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {user.role === "admin" ? "অ্যাডমিন" : "ব্যবহারকারী"}
                  </span>
                  {user.banned && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                      <Ban className="h-3 w-3 mr-1" />
                      নিষিদ্ধ
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {user.banned ? (
                <button
                  onClick={() => setConfirmAction("unban")}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-all duration-300 shadow-sm font-medium"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>নিষেধাজ্ঞা তুলুন</span>
                </button>
              ) : (
                <button
                  onClick={() => setConfirmAction("ban")}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all duration-300 shadow-sm font-medium"
                >
                  <Ban className="h-4 w-4" />
                  <span>নিষিদ্ধ করুন</span>
                </button>
              )}

              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 shadow-sm font-medium"
              >
                <Lock className="h-4 w-4" />
                <span>পাসওয়ার্ড পরিবর্তন</span>
              </button>

              <button
                onClick={() => setEditing(!editing)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all duration-300 shadow-sm font-medium ${
                  editing
                    ? "bg-gray-100 text-gray-700 border-gray-300"
                    : "bg-[#819A91] text-[#EEEFE0] border-[#819A91] hover:bg-[#2C4A3B]"
                }`}
              >
                {editing ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Edit className="h-4 w-4" />
                )}
                <span>{editing ? "বাতিল" : "এডিট"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Profile Information */}
            <div className="bg-white rounded-2xl shadow-lg border border-[#D1D8BE] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#2C4A3B] flex items-center space-x-2">
                  <UserIcon className="h-5 w-5" />
                  <span>প্রোফাইল তথ্য</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-[#2C4A3B] mb-2 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    ইমেইল
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-[#D1D8BE] bg-gray-50 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C4A3B] mb-2">
                    নাম
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={!editing}
                    className="w-full px-4 py-3 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent transition-all duration-300"
                    placeholder="ব্যবহারকারীর নাম"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#2C4A3B] mb-2 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    ভূমিকা
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, role: e.target.value }))
                    }
                    disabled={!editing}
                    className="w-full px-4 py-3 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent transition-all duration-300"
                  >
                    <option value="user">ব্যবহারকারী</option>
                    <option value="admin">অ্যাডমিন</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#2C4A3B] mb-2 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    ফোন নম্বর
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    disabled={!editing}
                    className="w-full px-4 py-3 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent transition-all duration-300"
                    placeholder="ফোন নম্বর"
                  />
                </div>

                {/* Addresses - dynamic list */}
                <div className="md:col-span-2 space-y-3">
                  {formData.addresses.map((addr, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-[#2C4A3B] mb-2">
                          {index === 0
                            ? "ঠিকানা (কমপক্ষে একটি)"
                            : `অতিরিক্ত ঠিকানা ${index + 1}`}
                        </label>
                        <input
                          type="text"
                          value={addr}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData((prev) => {
                              const copy = [...prev.addresses];
                              copy[index] = value;
                              return { ...prev, addresses: copy };
                            });
                          }}
                          disabled={!editing}
                          className="w-full px-4 py-3 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent transition-all duration-300"
                          placeholder="বাড়ি/রাস্তা/এলাকা"
                        />
                      </div>
                      {editing && formData.addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              addresses: prev.addresses.filter((_, i) => i !== index),
                            }))
                          }
                          className="mt-7 text-xs px-2 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                        >
                          মুছুন
                        </button>
                      )}
                    </div>
                  ))}

                  {editing && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          addresses: [...prev.addresses, ""],
                        }))
                      }
                      className="text-xs px-3 py-2 rounded-xl border border-[#D1D8BE] text-[#2C4A3B] hover:bg-[#EEEFE0]"
                    >
                      + আরো ঠিকানা যোগ করুন
                    </button>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#2C4A3B] mb-2">
                    নোট
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, note: e.target.value }))
                    }
                    disabled={!editing}
                    className="w-full px-4 py-3 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent transition-all duration-300 resize-none"
                    rows={4}
                    placeholder="ব্যবহারকারী সম্পর্কে নোট..."
                  />
                </div>
              </div>

              {editing && (
                <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-[#D1D8BE]">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-6 py-2 rounded-xl border border-[#D1D8BE] text-[#819A91] hover:bg-gray-50 transition-all duration-300 font-medium"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-[#2C4A3B] text-[#EEEFE0] hover:bg-[#1A3325] transition-all duration-300 font-medium disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{saving ? "সেভ হচ্ছে..." : "সেভ করুন"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-lg border border-[#D1D8BE] p-6">
              <h2 className="text-xl font-semibold text-[#2C4A3B] mb-6 flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5" />
                <span>সাম্প্রতিক অর্ডার</span>
              </h2>

              {user.orders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">কোনো অর্ডার পাওয়া যায়নি</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {user.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border border-[#D1D8BE] rounded-xl hover:bg-gray-50 transition-all duration-300"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="font-semibold text-[#2C4A3B]">
                            অর্ডার #{order.id}
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                          >
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-[#819A91]">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(order.orderDate)}</span>
                          </div>
                          <div className="font-medium text-[#2C4A3B]">
                            {formatCurrency(order.grandTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Statistics */}
            <div className="bg-white rounded-2xl shadow-lg border border-[#D1D8BE] p-6">
              <h3 className="font-semibold text-[#2C4A3B] mb-4 flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5" />
                <span>ব্যবহারকারী পরিসংখ্যান</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <ShoppingBag className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-800">মোট অর্ডার</span>
                  </div>
                  <span className="text-lg font-bold text-blue-900">
                    {user._count.orders}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <Star className="h-5 w-5 text-green-600" />
                    <span className="text-green-800">রিভিউ</span>
                  </div>
                  <span className="text-lg font-bold text-green-900">
                    {user._count.reviews}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                    <span className="text-purple-800">কার্ট আইটেম</span>
                  </div>
                  <span className="text-lg font-bold text-purple-900">
                    {user._count.cart}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="flex items-center space-x-3">
                    <Heart className="h-5 w-5 text-pink-600" />
                    <span className="text-pink-800">উইশলিস্ট</span>
                  </div>
                  <span className="text-lg font-bold text-pink-900">
                    {user._count.wishlist}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-white rounded-2xl shadow-lg border border-[#D1D8BE] p-6">
              <h3 className="font-semibold text-[#2C4A3B] mb-4 flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>অ্যাকাউন্ট অবস্থা</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#819A91]">ইমেইল যাচাইকৃত</span>
                  <div
                    className={`flex items-center space-x-1 ${
                      user.emailVerified ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {user.emailVerified ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">হ্যাঁ</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">না</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#819A91]">নিষিদ্ধ</span>
                  <div
                    className={`flex items-center space-x-1 ${
                      user.banned ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {user.banned ? (
                      <>
                        <Ban className="h-4 w-4" />
                        <span className="text-sm font-medium">হ্যাঁ</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">না</span>
                      </>
                    )}
                  </div>
                </div>

                {user.banned && user.banReason && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start space-x-2">
                      <Ban className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          নিষিদ্ধ করার কারণ
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          {user.banReason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-[#D1D8BE] space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#819A91] flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>সদস্য sejak</span>
                    </span>
                    <span className="text-[#2C4A3B] font-medium">
                      {formatDate(user.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#819A91]">সর্বশেষ আপডেট</span>
                    <span className="text-[#2C4A3B] font-medium">
                      {formatDate(user.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ban/Unban Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D1D8BE] max-w-md w-full mx-4 p-6">
            <div className="flex items-start space-x-3">
              <div
                className={`p-2 rounded-full ${
                  confirmAction === "ban"
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                }`}
              >
                {confirmAction === "ban" ? (
                  <Ban className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#2C4A3B] mb-1">
                  {confirmAction === "ban"
                    ? "ব্যবহারকারী নিষিদ্ধ করবেন?"
                    : "নিষেধাজ্ঞা তুলবেন?"}
                </h3>
                <p className="text-sm text-[#819A91]">
                  {confirmAction === "ban"
                    ? "এই ব্যবহারকারী সিস্টেমে লগইন করতে বা নতুন অর্ডার দিতে পারবে না। আপনি কি নিশ্চিত যে আপনি এই ব্যবহারকারীকে নিষিদ্ধ করতে চান?"
                    : "এই ব্যবহারকারীর নিষেধাজ্ঞা তুলে দিলে সে পুনরায় সিস্টেম ব্যবহার করতে পারবে। আপনি কি নিশ্চিত?"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl border border-[#D1D8BE] text-[#819A91] hover:bg-gray-50 transition-all duration-300 text-sm font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={async () => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  if (action === "ban") {
                    await handleBanUser();
                  } else if (action === "unban") {
                    await handleUnbanUser();
                  }
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-300 ${
                  confirmAction === "ban"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {confirmAction === "ban" ? "নিষিদ্ধ করুন" : "নিষেধাজ্ঞা তুলুন"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D1D8BE] max-w-md w-full mx-4 p-6">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Lock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#2C4A3B] mb-1">
                  পাসওয়ার্ড পরিবর্তন করুন
                </h3>
                <p className="text-sm text-[#819A91]">
                  {user.name || user.email} এর জন্য নতুন পাসওয়ার্ড সেট করুন
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError("");
                  setPasswordData({ newPassword: "", confirmPassword: "" });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2C4A3B] mb-2">
                  নতুন পাসওয়ার্ড
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent pr-12"
                    placeholder="কমপক্ষে ৬ অক্ষর"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#819A91] hover:text-[#2C4A3B]"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C4A3B] mb-2">
                  পাসওয়ার্ড নিশ্চিত করুন
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent pr-12"
                    placeholder="পাসওয়ার্ড আবার লিখুন"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#819A91] hover:text-[#2C4A3B]"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600">{passwordError}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError("");
                  setPasswordData({ newPassword: "", confirmPassword: "" });
                }}
                className="px-4 py-2 rounded-xl border border-[#D1D8BE] text-white bg-green-600 hover:bg-green-500 transition-all duration-300 text-sm font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-all duration-300 text-sm font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                {changingPassword && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
                <span>{changingPassword ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
