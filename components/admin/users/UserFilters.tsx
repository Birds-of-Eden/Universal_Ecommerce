'use client';

import { Search, Filter, RotateCcw, User, Shield } from 'lucide-react';

interface UserFiltersProps {
  search: string;
  role: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onReset: () => void;
}

export default function UserFilters({
  search,
  role,
  onSearchChange,
  onRoleChange,
  onReset,
}: UserFiltersProps) {
  return (
    <div className="bg-gradient-to-r from-[#EEEFE0] to-[#F5F6E9] p-6 rounded-2xl shadow-lg border border-[#D1D8BE] mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-2">
          <label className="text-sm font-medium text-[#2C4A3B] mb-3 flex items-center">
            <Search className="h-4 w-4 mr-2" />
            অনুসন্ধান
          </label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ইমেইল বা নাম দ্বারা অনুসন্ধান করুন..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D1D8BE] bg-white focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent transition-all duration-300 text-gray-700 placeholder-gray-500 shadow-sm"
            />
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#819A91]" />
          </div>
        </div>
        
        {/* Role Filter */}
        <div>
          <label className="text-sm font-medium text-[#2C4A3B] mb-3 flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            ভূমিকা
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D1D8BE] bg-white focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent transition-all duration-300 text-gray-700 appearance-none shadow-sm"
            >
              <option value="">সকল ভূমিকা</option>
              <option value="user">ব্যবহারকারী</option>
              <option value="admin">অ্যাডমিন</option>
            </select>
            <User className="absolute left-3 top-3.5 h-4 w-4 text-[#819A91]" />
            <div className="absolute right-3 top-3.5 pointer-events-none">
              <svg className="h-4 w-4 text-[#819A91]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Reset Button */}
        <div className="flex items-end">
          <button
            onClick={onReset}
            className="w-full py-3 px-4 rounded-xl bg-white border border-[#D1D8BE] text-[#819A91] hover:bg-[#819A91] hover:text-[#EEEFE0] hover:border-[#819A91] transition-all duration-300 font-medium shadow-sm hover:shadow-md flex items-center justify-center space-x-2 group"
          >
            <RotateCcw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            <span>ফিল্টার রিসেট</span>
          </button>
        </div>
      </div>

      {/* Active Filters Indicator */}
      {(search || role) && (
        <div className="mt-4 p-3 bg-[#D1D8BE] bg-opacity-30 rounded-lg border border-[#D1D8BE]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-[#2C4A3B] font-medium">সক্রিয় ফিল্টার:</span>
              {search && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#819A91] bg-opacity-20 text-[#2C4A3B] text-xs border border-[#819A91] border-opacity-30">
                  <Search className="h-3 w-3 mr-1" />
                  "{search}"
                </span>
              )}
              {role && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#819A91] bg-opacity-20 text-[#2C4A3B] text-xs border border-[#819A91] border-opacity-30">
                  <Shield className="h-3 w-3 mr-1" />
                  {role === 'admin' ? 'অ্যাডমিন' : 'ব্যবহারকারী'}
                </span>
              )}
            </div>
            <button
              onClick={onReset}
              className="text-xs text-[#819A91] hover:text-[#2C4A3B] transition-colors duration-200 flex items-center space-x-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>সব মুছুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}