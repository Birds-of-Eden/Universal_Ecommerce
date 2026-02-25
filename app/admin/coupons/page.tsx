"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Tag } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  isValid: boolean;
  expiresAt?: string;
  createdAt: string;
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "",
    discountValue: "",
    minOrderValue: "",
    maxDiscount: "",
    usageLimit: "",
    isValid: true,
    expiresAt: "",
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch("/api/admin/coupons");
      if (response.ok) {
        const data = await response.json();
        setCoupons(data);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch coupons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCoupon
        ? `/api/admin/coupons/${editingCoupon.id}`
        : "/api/admin/coupons";
      const method = editingCoupon ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Coupon ${editingCoupon ? "updated" : "created"} successfully`,
        });
        fetchCoupons();
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setEditingCoupon(null);
        setFormData({
          code: "",
          discountType: "",
          discountValue: "",
          minOrderValue: "",
          maxDiscount: "",
          usageLimit: "",
          isValid: true,
          expiresAt: "",
        });
      } else {
        throw new Error("Failed to save coupon");
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save coupon",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast({ title: "Success", description: "Coupon deleted successfully" });
        fetchCoupons();
      } else {
        throw new Error("Failed to delete coupon");
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete coupon",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderValue: coupon.minOrderValue?.toString() || "",
      maxDiscount: coupon.maxDiscount?.toString() || "",
      usageLimit: coupon.usageLimit?.toString() || "",
      isValid: coupon.isValid,
      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().split("T")[0]
        : "",
    });
    setIsEditDialogOpen(true);
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F4F8F7] to-[#EEEFE0] p-4 sm:p-6">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl shadow-lg p-6 mb-8 animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="h-8 bg-gray-300 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-64"></div>
              </div>
              <div className="h-12 bg-gray-300 rounded-full w-32"></div>
            </div>
          </div>

          {/* Coupon Grid Skeleton */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-white/90 border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                {/* Card Header Skeleton */}
                <div className="bg-gray-100 border-b border-gray-200 p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Card Content Skeleton */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <div className="h-3 bg-gray-200 rounded w-12 mb-1 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                    <div>
                      <div className="h-3 bg-gray-200 rounded w-12 mb-1 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-14 animate-pulse"></div>
                    </div>
                    <div>
                      <div className="h-3 bg-gray-200 rounded w-12 mb-1 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </div>
                    <div>
                      <div className="h-3 bg-gray-200 rounded w-12 mb-1 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F8F7] to-[#EEEFE0] p-4 sm:p-6">
      <div>
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#0E4B4B] to-[#086666] rounded-2xl shadow-lg p-6 mb-8 border border-[#F4F8F7]/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#F4F8F7] mb-2">Coupon Management</h1>
              <p className="text-[#F4F8F7]/70 text-sm">Create and manage discount coupons for your customers</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#C0704D] hover:bg-[#A85D3F] text-white font-semibold px-6 py-3 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-105 border border-[#C0704D] hover:border-[#A85D3F]">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Coupon
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border border-[#D1D8BE] rounded-2xl shadow-2xl">
                <DialogHeader className="border-b border-[#D1D8BE] pb-4">
                  <DialogTitle className="text-xl font-semibold text-[#0D1414]">Create New Coupon</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="code" className="text-[#0D1414] font-medium">Coupon Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="SAVE20"
                      className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] placeholder-[#2D4A3C]/50 transition-colors duration-300"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="discountType" className="text-[#0D1414] font-medium">Discount Type</Label>
                    <Select
                      value={formData.discountType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, discountType: value })
                      }
                    >
                      <SelectTrigger className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414]">
                        <SelectValue placeholder="Select discount type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D1D8BE]">
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="discountValue" className="text-[#0D1414] font-medium">Discount Value</Label>
                    <Input
                      id="discountValue"
                      type="number"
                      step="0.01"
                      value={formData.discountValue}
                      onChange={(e) =>
                        setFormData({ ...formData, discountValue: e.target.value })
                      }
                      placeholder={
                        formData.discountType === "percentage" ? "10" : "100"
                      }
                      className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] placeholder-[#2D4A3C]/50 transition-colors duration-300"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="minOrderValue" className="text-[#0D1414] font-medium">
                      Minimum Order Value (Optional)
                    </Label>
                    <Input
                      id="minOrderValue"
                      type="number"
                      step="0.01"
                      value={formData.minOrderValue}
                      onChange={(e) =>
                        setFormData({ ...formData, minOrderValue: e.target.value })
                      }
                      placeholder="500"
                      className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] placeholder-[#2D4A3C]/50 transition-colors duration-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDiscount" className="text-[#0D1414] font-medium">Maximum Discount (Optional)</Label>
                    <Input
                      id="maxDiscount"
                      type="number"
                      step="0.01"
                      value={formData.maxDiscount}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDiscount: e.target.value })
                      }
                      placeholder="100"
                      className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] placeholder-[#2D4A3C]/50 transition-colors duration-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="usageLimit" className="text-[#0D1414] font-medium">Usage Limit (Optional)</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      value={formData.usageLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, usageLimit: e.target.value })
                      }
                      placeholder="100"
                      className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] placeholder-[#2D4A3C]/50 transition-colors duration-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiresAt" className="text-[#0D1414] font-medium">Expiry Date (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) =>
                        setFormData({ ...formData, expiresAt: e.target.value })
                      }
                      className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] transition-colors duration-300"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-[#0E4B4B] to-[#086666] hover:from-[#0A3A3A] hover:to-[#065252] text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border border-[#0E4B4B]">
                    Create Coupon
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Coupon Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <Card
              key={coupon.id}
              className="bg-white/90 backdrop-blur-sm border border-[#D1D8BE] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
            >
              <CardHeader className="bg-gradient-to-r from-[#0E4B4B]/5 to-[#086666]/5 border-b border-[#D1D8BE]">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-[#0D1414] flex items-center gap-2">
                      <Tag className="h-5 w-5 text-[#0E4B4B]" />
                      {coupon.code}
                    </CardTitle>
                    <p className="text-[#2D4A3C]/70 text-sm mt-1">
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}% off`
                        : `৳${coupon.discountValue} off`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        coupon.isValid
                          ? "bg-[#A7C1A8]/20 text-[#0E4B4B] border-[#A7C1A8]/30"
                          : "bg-[#C0704D]/20 text-[#C0704D] border-[#C0704D]/30"
                      }`}
                    >
                      {coupon.isValid ? "সক্রিয়" : "নিষ্ক্রিয়"}
                    </div>
                    {isExpired(coupon.expiresAt) && (
                      <div className="px-3 py-1 rounded-full text-xs font-semibold bg-[#C0704D]/20 text-[#C0704D] border border-[#C0704D]/30">
                        মেয়াদোত্তীর্ণ
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-[#2D4A3C]/50">ব্যবহৃত:</span>
                    <p className="font-medium text-[#0D1414]">
                      {coupon.usedCount} / {coupon.usageLimit || "∞"}
                    </p>
                  </div>
                  {coupon.minOrderValue && (
                    <div>
                      <span className="text-[#2D4A3C]/50">সর্বনিম্ন:</span>
                      <p className="font-medium text-[#0D1414]">৳{coupon.minOrderValue}</p>
                    </div>
                  )}
                  {coupon.maxDiscount && (
                    <div>
                      <span className="text-[#2D4A3C]/50">সর্বোচ্চ:</span>
                      <p className="font-medium text-[#0D1414]">৳{coupon.maxDiscount}</p>
                    </div>
                  )}
                  {coupon.expiresAt && (
                    <div>
                      <span className="text-[#2D4A3C]/50">মেয়াদ:</span>
                      <p className="font-medium text-[#0D1414]">
                        {new Date(coupon.expiresAt).toLocaleDateString("bn-BD")}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-[#D1D8BE]">
                  <div className="text-xs text-[#2D4A3C]/50">
                    তৈরি: {new Date(coupon.createdAt).toLocaleDateString("bn-BD")}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(coupon)}
                      className="border-[#D1D8BE] text-[#0D1414] hover:bg-[#EEEFE0] hover:border-[#819A91] rounded-lg transition-all duration-300"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(coupon.id)}
                      className="bg-[#C0704D] hover:bg-[#A85D3F] text-white border-[#C0704D] hover:border-[#A85D3F] rounded-lg transition-all duration-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {coupons.length === 0 && (
          <div className="bg-white/90 backdrop-blur-sm border border-[#D1D8BE] rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-[#EEEFE0] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tag className="w-10 h-10 text-[#819A91]" />
            </div>
            <h3 className="text-xl font-semibold text-[#0D1414] mb-2">No coupons yet</h3>
            <p className="text-[#2D4A3C]/70 mb-6">Create your first discount coupon to get started</p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#C0704D] hover:bg-[#A85D3F] text-white font-semibold px-6 py-3 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-105 border border-[#C0704D] hover:border-[#A85D3F]">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Coupon
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border border-[#D1D8BE] rounded-2xl shadow-2xl">
            <DialogHeader className="border-b border-[#D1D8BE] pb-4">
              <DialogTitle className="text-xl font-semibold text-[#0D1414]">Edit Coupon</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="edit-code" className="text-[#0D1414] font-medium">Coupon Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] transition-colors duration-300"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-discountType" className="text-[#0D1414] font-medium">Discount Type</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414]">
                    <SelectValue placeholder="Select discount type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D1D8BE]">
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-discountValue" className="text-[#0D1414] font-medium">Discount Value</Label>
                <Input
                  id="edit-discountValue"
                  type="number"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: e.target.value })
                  }
                  className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] transition-colors duration-300"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-minOrderValue" className="text-[#0D1414] font-medium">Minimum Order Value</Label>
                <Input
                  id="edit-minOrderValue"
                  type="number"
                  step="0.01"
                  value={formData.minOrderValue}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrderValue: e.target.value })
                  }
                  className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] transition-colors duration-300"
                />
              </div>
              <div>
                <Label htmlFor="edit-maxDiscount" className="text-[#0D1414] font-medium">Maximum Discount</Label>
                <Input
                  id="edit-maxDiscount"
                  type="number"
                  step="0.01"
                  value={formData.maxDiscount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxDiscount: e.target.value })
                  }
                  className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] transition-colors duration-300"
                />
              </div>
              <div>
                <Label htmlFor="edit-usageLimit" className="text-[#0D1414] font-medium">Usage Limit</Label>
                <Input
                  id="edit-usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, usageLimit: e.target.value })
                  }
                  className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] transition-colors duration-300"
                />
              </div>
              <div>
                <Label htmlFor="edit-expiresAt" className="text-[#0D1414] font-medium">Expiry Date</Label>
                <Input
                  id="edit-expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  className="bg-[#EEEFE0] border-[#D1D8BE] focus:border-[#819A91] text-[#0D1414] transition-colors duration-300"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isValid"
                  checked={formData.isValid}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isValid: checked as boolean })
                  }
                  className="border-[#D1D8BE] data-[state=checked]:bg-[#0E4B4B] data-[state=checked]:border-[#0E4B4B]"
                />
                <Label htmlFor="edit-isValid" className="text-[#0D1414] font-medium">Active</Label>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-[#0E4B4B] to-[#086666] hover:from-[#0A3A3A] hover:to-[#065252] text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border border-[#0E4B4B]">
                Update Coupon
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
