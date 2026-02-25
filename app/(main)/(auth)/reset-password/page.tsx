"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Password strength indicator
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  const validateForm = () => {
    if (password.length < 8) {
      setError("পাসওয়ার্ড কমপক্ষে 8 অক্ষর হতে হবে");
      return false;
    }

    if (password !== confirmPassword) {
      setError("পাসওয়ার্ড মিলছে না");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/signin");
      }, 2000);
    } catch {
      setError("নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0E4B4B]/5 to-[#086666]/5 p-4">
        <Card className="w-full max-w-md border-[#D1D8BE] shadow-lg">
          <CardContent className="pt-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">
                  অবৈধ রিসেট লিঙ্ক
                </h3>
                <p className="text-sm text-red-800">
                  এই রিসেট লিঙ্ক অবৈধ বা মেয়াদ উত্তীর্ণ হয়েছে।
                </p>
              </div>
            </div>
            <Link href="/forgot-password" className="block">
              <Button className="w-full bg-[#C0704D] hover:bg-[#A85D3F] text-white rounded-lg">
                নতুন লিঙ্ক অনুরোধ করুন
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md border-[#D1D8BE] shadow-lg">
      <CardHeader className="bg-gradient-to-r from-[#0E4B4B]/10 to-[#086666]/10 border-b border-[#D1D8BE]">
        <CardTitle className="text-2xl text-[#0D1414]">
          নতুন পাসওয়ার্ড সেট করুন
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {success ? (
          <div className="space-y-4">
            <div className="bg-[#A7C1A8]/10 border border-[#A7C1A8] rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-[#0E4B4B] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#0E4B4B] mb-1">সফল!</h3>
                <p className="text-sm text-[#2D4A3C]/80">
                  আপনার পাসওয়ার্ড সফলভাবে রিসেট হয়েছে। লগইন পৃষ্ঠায়
                  পুনর্নির্দেশিত হচ্ছে...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#0D1414] mb-2">
                নতুন পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-[#2D4A3C]/50" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="কমপক্ষে 8 অক্ষর"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414]"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#2D4A3C]/50 hover:text-[#2D4A3C]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          i < passwordStrength ? "bg-[#0E4B4B]" : "bg-[#D1D8BE]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#2D4A3C]/70">
                    {passwordStrength === 1 && "দুর্বল"}
                    {passwordStrength === 2 && "ন্যায্য"}
                    {passwordStrength === 3 && "ভাল"}
                    {passwordStrength === 4 && "শক্তিশালী"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0D1414] mb-2">
                পাসওয়ার্ড নিশ্চিত করুন
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-[#2D4A3C]/50" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="পাসওয়ার্ড পুনরায় প্রবেশ করুন"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414]"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-[#2D4A3C]/50 hover:text-[#2D4A3C]"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-gradient-to-r from-[#0E4B4B] to-[#086666] hover:from-[#0A3A3A] hover:to-[#065252] text-white rounded-lg disabled:opacity-50"
            >
              {loading ? "প্রসেস করা হচ্ছে..." : "পাসওয়ার্ড রিসেট করুন"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
