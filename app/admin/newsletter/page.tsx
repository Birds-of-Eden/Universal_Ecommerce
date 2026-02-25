"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import NewsletterManagement from "@/components/newsletter/NewsletterManager";
import SubscriberManagement from "@/components/newsletter/SubscriberManagement";

export default function NewsletterPage() {
  const [activeTab, setActiveTab] = useState<"newsletters" | "subscribers">("newsletters");
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  const handleTabChange = useCallback((tab: "newsletters" | "subscribers") => {
    if (tab === activeTab) return;
    
    setTabLoading(true);
    // Simulate tab switching delay for better UX
    setTimeout(() => {
      setActiveTab(tab);
      setTabLoading(false);
    }, 150);
  }, [activeTab]);

  // Initial loading state - moved to useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F4F8F7] to-[#EEEFE0] p-4 sm:p-6">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-64"></div>
          </div>

          {/* Tab Navigation Skeleton */}
          <div className="bg-white/90 border border-gray-200 rounded-2xl shadow-lg p-4">
            <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
              <div className="flex-1 h-12 bg-gray-300 rounded-xl animate-pulse"></div>
              <div className="flex-1 h-12 bg-gray-300 rounded-xl animate-pulse"></div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-6">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="bg-white/90 border border-gray-200 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                      <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table/List Skeleton */}
            <div className="bg-white/90 border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="p-6">
                    <div className="space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Skeleton */}
            <div className="bg-white/90 border border-gray-200 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="flex items-center space-x-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="w-10 h-10 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
                <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F8F7] to-[#EEEFE0] p-4 sm:p-6">
      <div>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0E4B4B] to-[#086666] rounded-2xl shadow-lg p-6 mb-8 border border-[#F4F8F7]/10">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F4F8F7] mb-2">
            Email Management
          </h1>
          <p className="text-[#F4F8F7]/70 text-sm">
            Manage newsletters and subscribers
          </p>
        </div>

        {/* Tab Navigation */}
        <Card className="bg-white/90 backdrop-blur-sm border border-[#D1D8BE] rounded-2xl shadow-lg mb-8">
          <CardContent className="p-4">
            <div className="flex space-x-1 bg-[#EEEFE0] rounded-xl p-1">
              <button
                onClick={() => handleTabChange("newsletters")}
                disabled={tabLoading}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === "newsletters"
                    ? "bg-[#0E4B4B] text-white shadow-lg"
                    : "text-[#2D4A3C] hover:bg-white/50"
                } ${tabLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {tabLoading && activeTab !== "newsletters" ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  "Newsletters"
                )}
              </button>
              <button
                onClick={() => handleTabChange("subscribers")}
                disabled={tabLoading}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === "subscribers"
                    ? "bg-[#0E4B4B] text-white shadow-lg"
                    : "text-[#2D4A3C] hover:bg-white/50"
                } ${tabLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {tabLoading && activeTab !== "subscribers" ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  "Subscribers"
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <div className={`transition-opacity duration-300 ${tabLoading ? "opacity-50" : "opacity-100"}`}>
          {activeTab === "newsletters" && <NewsletterManagement />}
          {activeTab === "subscribers" && <SubscriberManagement />}
        </div>
      </div>
    </div>
  );
}