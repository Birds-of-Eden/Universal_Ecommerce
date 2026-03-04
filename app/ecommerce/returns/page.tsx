import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle,
  Package,
  Phone,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ReturnsPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-r from-[#0E4B4B] to-[#086666]">
        <div className="container mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-[#F4F8F7] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-8 w-8 text-[#F4F8F7]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#F4F8F7] mb-4">
            রিটার্ন নীতিমালা
          </h1>
          <p className="text-lg text-[#F4F8F7]/90">
            সহজ এবং স্বচ্ছ রিটার্ন প্রক্রিয়া
          </p>
        </div>
      </section>

      {/* Quick Overview */}
      <section className="py-12 bg-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-[#5FA3A3] border-opacity-30">
              <Clock className="h-8 w-8 text-[#0E4B4B] mx-auto mb-3" />
              <h3 className="font-semibold text-[#0D1414] mb-2">৭ দিনের মধ্যে</h3>
              <p className="text-sm text-[#0D1414]">ডেলিভারির পর ৭ দিনের মধ্যে রিটার্ন করতে হবে</p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-[#5FA3A3] border-opacity-30">
              <Package className="h-8 w-8 text-[#0E4B4B] mx-auto mb-3" />
              <h3 className="font-semibold text-[#0D1414] mb-2">অবস্থা অপরিবর্তিত</h3>
              <p className="text-sm text-[#0D1414]">বইটি নতুন এবং unused condition এ থাকতে হবে</p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-[#5FA3A3] border-opacity-30">
              <RefreshCw className="h-8 w-8 text-[#0E4B4B] mx-auto mb-3" />
              <h3 className="font-semibold text-[#0D1414] mb-2">দ্রুত প্রক্রিয়া</h3>
              <p className="text-sm text-[#0D1414]">৫-৭ কার্যদিবসের মধ্যে রিফান্ড</p>
            </div>
          </div>
        </div>
      </section>

      {/* Policy Details */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Eligible for Return */}
            <div>
              <h2 className="text-2xl font-bold text-[#0D1414] mb-6 flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                রিটার্ন গ্রহণযোগ্য
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#0D1414]">ভুল বই ডেলিভারি হলে</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#0D1414]">বইয়ে printing সমস্যা থাকলে</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#0D1414]">বই damage হয়ে এলে</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#0D1414]">পৃষ্ঠা missing থাকলে</p>
                </div>
              </div>
            </div>

            {/* Not Eligible for Return */}
            <div>
              <h2 className="text-2xl font-bold text-[#0D1414] mb-6 flex items-center">
                <XCircle className="h-6 w-6 text-red-600 mr-3" />
                রিটার্ন গ্রহণযোগ্য নয়
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#0D1414]">ব্যবহারের থাকলে</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#0D1414]">Highlighting বা নোট থাকলে</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#0D1414]">৭ দিনের বেশি হয়ে গেলে</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-[#0D1414]">Original প্যাকেজিং damage হলে</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-12 bg-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-[#0D1414] mb-8 text-center">
            রিটার্ন প্রক্রিয়া
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#0E4B4B] text-[#F4F8F7] rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">১</div>
              <h3 className="font-semibold text-[#0D1414] mb-2">যোগাযোগ করুন</h3>
              <p className="text-sm text-[#0D1414]">আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#0E4B4B] text-[#F4F8F7] rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">২</div>
              <h3 className="font-semibold text-[#0D1414] mb-2">অনুমোদন নিন</h3>
              <p className="text-sm text-[#0D1414]">রিটার্ন রিকোয়েস্ট approve করুন</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#0E4B4B] text-[#F4F8F7] rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">৩</div>
              <h3 className="font-semibold text-[#0D1414] mb-2">বই পাঠান</h3>
              <p className="text-sm text-[#0D1414]">বইটি আমাদের ঠিকানায় পাঠিয়ে দিন</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#0E4B4B] text-[#F4F8F7] rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">৪</div>
              <h3 className="font-semibold text-[#0D1414] mb-2">রিফান্ড পান</h3>
              <p className="text-sm text-[#0D1414]">৫-৭ দিনের মধ্যে রিফান্ড process হবে</p>
            </div>
          </div>
        </div>
      </section>

      {/* Refund Information */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-[#0D1414] mb-6">
            রিফান্ড সম্পর্কিত
          </h2>
          
          <div className="bg-[#F4F8F7] rounded-xl p-6 border border-[#5FA3A3] border-opacity-30">
            <div className="space-y-4 text-[#0D1414]">
              <p><strong>রিফান্ড সময়:</strong> ৫-৭ কার্যদিবস</p>
              <p><strong>রিফান্ড মেথড:</strong> মূল payment method এ</p>
              <p><strong>ডেলিভারি চার্জ:</strong> Non-refundable (except our mistake)</p>
              <p><strong>বই এক্সচেঞ্জ:</strong> একই বই বা সমমূল্যের অন্য বই</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 bg-gradient-to-r from-[#0E4B4B] to-[#086666] text-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">
            রিটার্ন সম্পর্কিত সাহায্য প্রয়োজন?
          </h2>
          <p className="mb-6 opacity-90">
            আমাদের সাপোর্ট টিম আপনার সাহায্যের জন্য প্রস্তুত
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-[#F4F8F7] text-[#0E4B4B] hover:bg-[#F4F8F7]/90"
            >
              <a href="tel:+88-01842781978">
                <Phone className="h-4 w-4 mr-2" />
                কল করুন
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-[#F4F8F7] text-[#0E4B4B] hover:bg-[#F4F8F7]/90"
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