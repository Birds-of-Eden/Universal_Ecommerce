import { Shield, Lock, Eye, User, CreditCard, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-r from-[#0E4B4B] to-[#086666]">
        <div className="container mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-[#F4F8F7] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-[#F4F8F7]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#F4F8F7] mb-4">
            গোপনীয়তা নীতি
          </h1>
          <p className="text-lg text-[#F4F8F7]/90">
            আপনার গোপনীয়তা আমাদের অগ্রাধিকার
          </p>
        </div>
      </section>

      {/* Quick Overview */}
      <section className="py-12 bg-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-[#5FA3A3] border-opacity-30">
              <Lock className="h-8 w-8 text-[#0E4B4B] mx-auto mb-3" />
              <h3 className="font-semibold text-[#0D1414] mb-2">
                ডেটা সুরক্ষা
              </h3>
              <p className="text-sm text-[#0D1414]">
                আপনার তথ্য SSL এনক্রিপশন দ্বারা সুরক্ষিত
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-[#5FA3A3] border-opacity-30">
              <Eye className="h-8 w-8 text-[#0E4B4B] mx-auto mb-3" />
              <h3 className="font-semibold text-[#0D1414] mb-2">স্বচ্ছতা</h3>
              <p className="text-sm text-[#0D1414]">
                আমরা কী তথ্য সংগ্রহ করি তা জানিয়ে দিই
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-[#5FA3A3] border-opacity-30">
              <User className="h-8 w-8 text-[#0E4B4B] mx-auto mb-3" />
              <h3 className="font-semibold text-[#0D1414] mb-2">নিয়ন্ত্রণ</h3>
              <p className="text-sm text-[#0D1414]">
                আপনি আপনার তথ্য নিয়ন্ত্রণ করতে পারেন
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Collection */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-[#0D1414] mb-8 text-center">
            আমরা তথ্য সংগ্রহ করি
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <User className="h-6 w-6 text-[#0E4B4B] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-[#0D1414] mb-2">
                    ব্যক্তিগত তথ্য
                  </h3>
                  <ul className="text-sm text-[#0D1414] space-y-1">
                    <li>• নাম এবং ইমেইল ঠিকানা</li>
                    <li>• ফোন নম্বর</li>
                    <li>• ডেলিভারি ঠিকানা</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CreditCard className="h-6 w-6 text-[#0E4B4B] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-[#0D1414] mb-2">
                    অর্ডার তথ্য
                  </h3>
                  <ul className="text-sm text-[#0D1414] space-y-1">
                    <li>• বইয়ের পছন্দ</li>
                    <li>• অর্ডার হিস্টোরি</li>
                    <li>• পেমেন্ট মেথড</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <Eye className="h-6 w-6 text-[#0E4B4B] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-[#0D1414] mb-2">
                    ব্যবহারের তথ্য
                  </h3>
                  <ul className="text-sm text-[#0D1414] space-y-1">
                    <li>• ব্রাউজিং হিস্টোরি</li>
                    <li>• Wishlist আইটেম</li>
                    <li>• পেজ ভিউ</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Shield className="h-6 w-6 text-[#0E4B4B] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-[#0D1414] mb-2">
                    আমরা না
                  </h3>
                  <ul className="text-sm text-[#0D1414] space-y-1">
                    <li>• ব্যাংক তথ্য (সুরক্ষিত)</li>
                    <li>• ক্রেডিট কার্ড নম্বর</li>
                    <li>• পাসওয়ার্ড (এনক্রিপ্টেড)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Usage */}
      <section className="py-12 bg-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-[#0D1414] mb-8 text-center">
            তথ্য
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 border border-[#5FA3A3] border-opacity-30">
              <h3 className="font-semibold mb-4 text-green-600">
                প্রয়োজনীয়
              </h3>
              <ul className="space-y-3 text-sm text-[#0D1414]">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>অর্ডার প্রসেস এবং ডেলিভারি</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>অ্যাকাউন্ট ম্যানেজমেন্ট</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>কাস্টমার সাপোর্ট</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>বই রিকমেন্ডেশন</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-[#5FA3A3] border-opacity-30">
              <h3 className="font-semibold mb-4 text-amber-600">
                অনুমতিসাপেক্ষ
              </h3>
              <ul className="space-y-3 text-sm text-[#0D1414]">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>মার্কেটিং ইমেইল</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>স্পেশাল অফার</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>নতুন বই নোটিফিকেশন</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>সার্ভে এবং ফিডব্যাক</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Your Rights */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-[#0D1414] mb-8 text-center">
            আপনার অধিকার
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center p-6 bg-[#F4F8F7] rounded-xl border border-[#5FA3A3] border-opacity-30">
              <div className="w-12 h-12 bg-[#0E4B4B] rounded-full flex items-center justify-center mx-auto mb-3">
                <Eye className="h-6 w-6 text-[#F4F8F7]" />
              </div>
              <h3 className="font-semibold text-[#0D1414] mb-2">তথ্য দেখুন</h3>
              <p className="text-sm text-[#0D1414]">
                আপনার সকল তথ্য দেখতে এবং ডাউনলোড করতে পারেন
              </p>
            </div>

            <div className="text-center p-6 bg-[#F4F8F7] rounded-xl border border-[#5FA3A3] border-opacity-30">
              <div className="w-12 h-12 bg-[#0E4B4B] rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="h-6 w-6 text-[#F4F8F7]" />
              </div>
              <h3 className="font-semibold text-[#0D1414] mb-2">তথ্য আপডেট</h3>
              <p className="text-sm text-[#0D1414]">
                যেকোনো সময় আপনার তথ্য সংশোধন করতে পারেন
              </p>
            </div>

            <div className="text-center p-6 bg-[#F4F8F7] rounded-xl border border-[#5FA3A3] border-opacity-30">
              <div className="w-12 h-12 bg-[#0E4B4B] rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="h-6 w-6 text-[#F4F8F7]" />
              </div>
              <h3 className="font-semibold text-[#0D1414] mb-2">
                অনুমতি পরিবর্তন
              </h3>
              <p className="text-sm text-[#0D1414]">
                মার্কেটিং কমিউনিকেশন manage করতে পারেন
              </p>
            </div>

            <div className="text-center p-6 bg-[#F4F8F7] rounded-xl border border-[#5FA3A3] border-opacity-30">
              <div className="w-12 h-12 bg-[#0E4B4B] rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-[#F4F8F7]" />
              </div>
              <h3 className="font-semibold text-[#0D1414] mb-2">
                অ্যাকাউন্ট ডিলিট
              </h3>
              <p className="text-sm text-[#0D1414]">
                আপনার অ্যাকাউন্ট এবং তথ্য ডিলিট করতে পারেন
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Updates */}
      <section className="py-12 bg-gradient-to-r from-[#0E4B4B] to-[#086666] text-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">প্রশ্ন আছে?</h2>
          <p className="mb-6 opacity-90">
            গোপনীয়তা সম্পর্কিত যেকোনো প্রশ্নে আমাদের সাথে যোগাযোগ করুন
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-[#F4F8F7] text-[#0E4B4B] hover:bg-[#F4F8F7]/90"
            >
              <a href="mailto:privacy@hilfulfujul.com">
                <Mail className="h-4 w-4 mr-2" />
                গোপনীয়তা টিম
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#F4F8F7] text-[#F4F8F7] hover:bg-[#F4F8F7] hover:text-[#0E4B4B]"
            >
              <Link href="/contact">যোগাযোগ করুন</Link>
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-[#F4F8F7] border-opacity-20">
            <p className="text-sm opacity-80">
              <strong>সর্বশেষ আপডেট:</strong> জানুয়ারি ২০২৪
              <br />
              আমরা আমাদের গোপনীয়তা নীতি নিয়মিত আপডেট করি
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
