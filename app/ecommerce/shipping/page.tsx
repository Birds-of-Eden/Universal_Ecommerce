import {
  Truck,
  Clock,
  MapPin,
  Shield,
  Package,
  Home,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ShippingPolicyPage() {
  const shippingRates = [
    {
      area: "ঢাকা সিটি কর্পোরেশন",
      minAmount: "৫০০৳+",
      charge: "ফ্রি",
      time: "১-২ কার্যদিবস",
      note: "এক্সপ্রেস ডেলিভারি available",
    },
    {
      area: "ঢাকা জেলা (বাইরে)",
      minAmount: "৫০০৳+",
      charge: "৮০৳",
      time: "২-৩ কার্যদিবস",
      note: "সব এলাকায় available",
    },
    {
      area: "বিভাগীয় শহর",
      minAmount: "৫০০৳+",
      charge: "১২০৳",
      time: "৩-৪ কার্যদিবস",
      note: "চট্টগ্রাম, রাজশাহী, খুলনা, etc.",
    },
    {
      area: "জেলা সদর",
      minAmount: "৫০০৳+",
      charge: "১৫০৳",
      time: "৪-৫ কার্যদিবস",
      note: "সকল জেলা সদরে",
    },
    {
      area: "উপজেলা/গ্রামীণ",
      minAmount: "৫০০৳+",
      charge: "২০০৳",
      time: "৫-৭ কার্যদিবস",
      note: "প্রত্যন্ত এলাকায় সময় বেশি লাগতে পারে",
    },
  ];

  const serviceAreas = [
    {
      division: "ঢাকা বিভাগ",
      coverage: "সমস্ত জেলা এবং উপজেলা",
      time: "১-৫ কার্যদিবস",
      status: "সক্রিয়",
    },
    {
      division: "চট্টগ্রাম বিভাগ",
      coverage: "সমস্ত জেলা এবং উপজেলা",
      time: "৩-৬ কার্যদিবস",
      status: "সক্রিয়",
    },
    {
      division: "রাজশাহী বিভাগ",
      coverage: "সমস্ত জেলা এবং উপজেলা",
      time: "৪-৭ কার্যদিবস",
      status: "সক্রিয়",
    },
    {
      division: "খুলনা বিভাগ",
      coverage: "সমস্ত জেলা এবং উপজেলা",
      time: "৪-৭ কার্যদিবস",
      status: "সক্রিয়",
    },
    {
      division: "বরিশাল বিভাগ",
      coverage: "সমস্ত জেলা এবং উপজেলা",
      time: "৫-৮ কার্যদিবস",
      status: "সক্রিয়",
    },
    {
      division: "সিলেট বিভাগ",
      coverage: "সমস্ত জেলা এবং উপজেলা",
      time: "৫-৮ কার্যদিবস",
      status: "সক্রিয়",
    },
    {
      division: "রংপুর বিভাগ",
      coverage: "সমস্ত জেলা এবং উপজেলা",
      time: "৬-৯ কার্যদিবস",
      status: "সক্রিয়",
    },
    {
      division: "ময়মনসিংহ বিভাগ",
      coverage: "সমস্ত জেলা এবং উপজেলা",
      time: "৪-৭ কার্যদিবস",
      status: "সক্রিয়",
    },
  ];

  const expressDelivery = [
    {
      service: "সাধারণ ডেলিভারি",
      areas: "সমস্ত বাংলাদেশ",
      time: "১-৭ কার্যদিবস",
      charge: "ফ্রি/নির্ধারিত",
      note: "স্ট্যান্ডার্ড সার্ভিস",
    },
    {
      service: "এক্সপ্রেস ডেলিভারি",
      areas: "ঢাকা সিটি কর্পোরেশন",
      time: "৬-১২ ঘন্টা",
      charge: "১৫০৳ অতিরিক্ত",
      note: "অর্ডার দিন ১২টার আগে",
    },
    {
      service: "প্রায়োরিটি ডেলিভারি",
      areas: "বিভাগীয় শহর",
      time: "২৪-৪৮ ঘন্টা",
      charge: "২০০৳ অতিরিক্ত",
      note: "শুধু বড় শহরগুলোতে",
    },
  ];

  const restrictions = [
    {
      type: "বইয়ের ধরন",
      items: ["সকল ধরনের বাংলা বই", "শিক্ষামূলক বই", "ধর্মীয় বই", "সাহিত্য"],
      allowed: true,
    },
    {
      type: "বিশেষ বই",
      items: ["দুর্লভ বই", "প্রথম সংস্করণ", "অটোগ্রাফ কপি"],
      allowed: true,
    },
    {
      type: "নিষিদ্ধ বই",
      items: ["ভুয়া বই", "পাইরেসি কপি", "অনুমতিবিহীন প্রকাশনা"],
      allowed: false,
    },
    {
      type: "বড় সংগ্রহ",
      items: ["১০+ বই একসাথে", "বক্স সেট", "এনসাইক্লোপিডিয়া"],
      allowed: "শর্তসাপেক্ষ",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-[#0E4B4B] to-[#086666]">
        <div className="container mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-[#F4F8F7] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Truck className="h-10 w-10 text-[#F4F8F7]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#F4F8F7] mb-4">
            শিপিং নীতিমালা
          </h1>
          <p className="text-xl text-[#F4F8F7]/90 max-w-2xl mx-auto">
            হিলফুল-ফুযুল প্রকাশনীর ডেলিভারি সম্পর্কিত সম্পূর্ণ তথ্য
          </p>
        </div>
      </section>

      {/* Quick Overview */}
      <section className="py-16 bg-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-[#5FA3A3] border-opacity-30">
              <div className="w-16 h-16 bg-[#0E4B4B] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-[#0E4B4B]" />
              </div>
              <h3 className="text-xl font-bold text-[#0D1414] mb-3">
                ফ্রি ডেলিভারি
              </h3>
              <p className="text-[#0D1414]">
                ৫০০৳+ অর্ডারে সমগ্র ঢাকায় সম্পূর্ণ ফ্রি ডেলিভারি
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-[#5FA3A3] border-opacity-30">
              <div className="w-16 h-16 bg-[#0E4B4B] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-[#0E4B4B]" />
              </div>
              <h3 className="text-xl font-bold text-[#0D1414] mb-3">
                দ্রুত ডেলিভারি
              </h3>
              <p className="text-[#0D1414]">
                ঢাকায় ১-২ দিনে, অন্যান্য বিভাগে ৩-৭ কার্যদিবসে
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-[#5FA3A3] border-opacity-30">
              <div className="w-16 h-16 bg-[#0E4B4B] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-[#0E4B4B]" />
              </div>
              <h3 className="text-xl font-bold text-[#0D1414] mb-3">
                সুরক্ষিত প্যাকেজিং
              </h3>
              <p className="text-[#0D1414]">
                বইগুলি বিশেষ প্যাকেজিংয়ে সম্পূর্ণ সুরক্ষিতভাবে পাঠানো হয়
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shipping Rates & Times */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0D1414] mb-4">
              ডেলিভারি চার্জ এবং সময়
            </h2>
            <div className="w-24 h-1 bg-[#C0704D] mx-auto mb-4"></div>
            <p className="text-lg text-[#0D1414] max-w-2xl mx-auto">
              ৫০০৳+ অর্ডারে ফ্রি ডেলিভারি - সমগ্র বাংলাদেশে
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl shadow-lg border border-[#5FA3A3] border-opacity-30">
            <table className="w-full">
              <thead className="bg-[#0E4B4B] text-[#F4F8F7]">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">এলাকা</th>
                  <th className="px-6 py-4 text-center font-semibold">
                    ন্যূনতম অর্ডার
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    ডেলিভারি চার্জ
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">সময়</th>
                  <th className="px-6 py-4 text-center font-semibold">
                    মন্তব্য
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#5FA3A3] divide-opacity-20">
                {shippingRates.map((rate, index) => (
                  <tr
                    key={index}
                    className="hover:bg-[#F4F8F7] transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-[#0D1414]">
                      {rate.area}
                    </td>
                    <td className="px-6 py-4 text-center text-[#0D1414]">
                      {rate.minAmount}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`font-semibold ${
                          rate.charge === "ফ্রি"
                            ? "text-green-600"
                            : "text-[#0D1414]"
                        }`}
                      >
                        {rate.charge}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-[#0D1414]">
                      {rate.time}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-[#5FA3A3]">
                      {rate.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Delivery Options */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0D1414] mb-4">
              ডেলিভারি অপশন
            </h2>
            <div className="w-24 h-1 bg-[#C0704D] mx-auto mb-4"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {expressDelivery.map((service, index) => (
              <div
                key={index}
                className={`rounded-2xl p-6 border-2 ${
                  index === 0
                    ? "border-[#5FA3A3] bg-[#F4F8F7]"
                    : index === 1
                      ? "border-[#C0704D] bg-orange-50"
                      : "border-[#0E4B4B] bg-teal-50"
                }`}
              >
                <div className="text-center mb-6">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                      index === 0
                        ? "bg-[#5FA3A3] text-white"
                        : index === 1
                          ? "bg-[#C0704D] text-white"
                          : "bg-[#0E4B4B] text-white"
                    }`}
                  >
                    <Truck className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0D1414]">
                    {service.service}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-opacity-20">
                    <span className="text-[#0D1414] font-medium">এলাকা</span>
                    <span className="text-[#0D1414]">{service.areas}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-opacity-20">
                    <span className="text-[#0D1414] font-medium">সময়</span>
                    <span className="text-[#0D1414] font-semibold">
                      {service.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-opacity-20">
                    <span className="text-[#0D1414] font-medium">চার্জ</span>
                    <span
                      className={`font-bold ${
                        service.charge.includes("ফ্রি")
                          ? "text-green-600"
                          : "text-[#C0704D]"
                      }`}
                    >
                      {service.charge}
                    </span>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-[#5FA3A3] text-center">
                      {service.note}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Restrictions & Limitations */}
      <section className="py-16 bg-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0D1414] mb-4">
              বিধিনিষেধ এবং সীমাবদ্ধতা
            </h2>
            <div className="w-24 h-1 bg-[#C0704D] mx-auto mb-4"></div>
          </div>

          <div className="space-y-6">
            {restrictions.map((restriction, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-md border border-[#5FA3A3] border-opacity-30"
              >
                <div className="flex items-center space-x-3 mb-4">
                  {restriction.allowed === true && (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  )}
                  {restriction.allowed === false && (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                  {restriction.allowed === "শর্তসাপেক্ষ" && (
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  )}
                  <h3 className="text-xl font-bold text-[#0D1414]">
                    {restriction.type}
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-2">
                  {restriction.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center space-x-2 py-1"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          restriction.allowed === true
                            ? "bg-green-600"
                            : restriction.allowed === false
                              ? "bg-red-600"
                              : "bg-amber-600"
                        }`}
                      ></div>
                      <span className="text-[#0D1414]">{item}</span>
                    </div>
                  ))}
                </div>

                {restriction.allowed === "শর্তসাপেক্ষ" && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800">
                      * বিশেষ ব্যবস্থাপনার প্রয়োজন। দয়া করে অর্ডারের আগে
                      আমাদের সাথে যোগাযোগ করুন।
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notes */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gradient-to-r from-[#0E4B4B] to-[#086666] rounded-2xl p-8 text-[#F4F8F7]">
            <h2 className="text-2xl font-bold mb-6 text-center">
              গুরুত্বপূর্ণ নির্দেশিকা
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">ঠিকানা যাচাই</h4>
                    <p className="text-sm opacity-90">
                      অর্ডার দেওয়ার আগে আপনার সম্পূর্ণ ঠিকানা সঠিকভাবে দিন
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">যোগাযোগ নম্বর</h4>
                    <p className="text-sm opacity-90">
                      সঠিক মোবাইল নম্বর প্রদান করুন ডেলিভারি স্ট্যাটাসের জন্য
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">প্যাকেজিং</h4>
                    <p className="text-sm opacity-90">
                      বইগুলি বিশেষ বাবল র্যাপে সুরক্ষিতভাবে প্যাকেজ করা হয়
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">ট্র্যাকিং</h4>
                    <p className="text-sm opacity-90">
                      SMS এবং ইমেইলের মাধ্যমে রিয়েল-টাইম ট্র্যাকিং
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">হোল্ডে অর্ডার</h4>
                    <p className="text-sm opacity-90">
                      বিশেষ প্রয়োজনে অর্ডার হোল্ড করার সুবিধা
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">সাপোর্ট</h4>
                    <p className="text-sm opacity-90">
                      ২৪/৭ কাস্টমার সাপোর্ট available
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 bg-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-[#0D1414] mb-4">
            আরও তথ্য প্রয়োজন?
          </h2>
          <p className="text-lg text-[#0D1414] mb-8 max-w-2xl mx-auto">
            আমাদের শিপিং টিম আপনার যেকোনো প্রশ্নের উত্তর দিতে প্রস্তুত
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-[#C0704D] hover:bg-[#A85D3F] text-[#F4F8F7] px-8 py-3"
            >
              <a href="tel:+88-01842781978">
                <Phone className="h-4 w-4 mr-2" />
                কল করুন
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#0E4B4B] text-[#0E4B4B] hover:bg-[#0E4B4B] hover:text-[#F4F8F7] px-8 py-3"
            >
              <a href="mailto:islamidawainstitute@gmail.com">
                <Mail className="h-4 w-4 mr-2" />
                ইমেইল করুন
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
