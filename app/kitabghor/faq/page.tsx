"use client";

import { useState } from "react";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Book,
  ShoppingCart,
  Truck,
  Shield,
  Clock,
  Mail,
  Phone,
  Heart,
  User,
  CreditCard,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FAQPage() {
  const [openCategory, setOpenCategory] = useState<string | null>("general");
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(["general-1"]));

  const toggleCategory = (category: string) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  const toggleItem = (itemId: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(itemId)) {
      newOpenItems.delete(itemId);
    } else {
      newOpenItems.add(itemId);
    }
    setOpenItems(newOpenItems);
  };

  const faqCategories = [
    {
      id: "general",
      title: "সাধারণ তথ্য",
      icon: Book,
      questions: [
        {
          id: "general-1",
          question: "হিলফুল-ফুযুল প্রকাশনী কী?",
          answer: "হিলফুল-ফুযুল প্রকাশনী হল একটি প্রিমিয়াম বাংলা বইয়ের অনলাইন স্টোর, যেখানে আপনি পাবেন সকল ধরনের বাংলা বই - সাহিত্য, শিক্ষামূলক, ধর্মীয়, শিশুতোষ এবং অনেক বেশি। আমরা বইপ্রেমীদের জন্য একটি বিশ্বস্ত প্ল্যাটফর্ম গড়ে তুলেছি।"
        },
        {
          id: "general-2",
          question: "আপনাদের বইয়ের সংগ্রহ কত বড়?",
          answer: "আমাদের সংগ্রহে ১০,০০০+ এর বেশি বই রয়েছে, যা নিয়মিত আপডেট করা হয়। আমরা নতুন বই যোগ করতে থাকি এবং পুরনো বইগুলোও সংরক্ষণ করি।"
        },
        {
          id: "general-3",
          question: "আপনারা কি শুধু বাংলা বই বিক্রি করেন?",
          answer: "হ্যাঁ, আমরা শুধুমাত্র বাংলা ভাষার বই বিক্রি করে থাকি। তবে আমাদের সংগ্রহে ইংরেজি থেকে অনূদিত কিছু বাংলা বইও রয়েছে।"
        },
        {
          id: "general-4",
          question: "কিভাবে অ্যাকাউন্ট তৈরি করব?",
          answer: "ওয়েবসাইটের উপরের ডান কোণায় 'লগইন' বাটনে ক্লিক করুন, তারপর 'রেজিস্ট্রেশন' এ গিয়ে আপনার ইমেইল, নাম এবং পাসওয়ার্ড দিয়ে অ্যাকাউন্ট তৈরি করুন।"
        }
      ]
    },
    {
      id: "ordering",
      title: "অর্ডার এবং পেমেন্ট",
      icon: ShoppingCart,
      questions: [
        {
          id: "ordering-1",
          question: "অর্ডার দিতে কি অ্যাকাউন্ট প্রয়োজন?",
          answer: "না, অ্যাকাউন্ট ছাড়াই গেস্ট হিসেবে অর্ডার দিতে পারেন। তবে অ্যাকাউন্ট তৈরি করলে অর্ডার হিস্টোরি ট্র্যাক করা সহজ হয় এবং এক্সক্লুসিভ অফার পাবেন।"
        },
        {
          id: "ordering-2",
          question: "পেমেন্ট মেথড গ্রহণ করা হয়?",
          answer: "আমরা bKash, Nagad, Rocket, ব্যাংক কার্ড (Visa/MasterCard), এবং ক্যাশ অন ডেলিভারি (COD) সাপোর্ট করি।"
        },
        {
          id: "ordering-3",
          question: "অর্ডার ক্যানসেল করতে পারব?",
          answer: "হ্যাঁ, অর্ডার শিপ হওয়ার আগ পর্যন্ত আপনি অর্ডার ক্যানসেল করতে পারবেন। আমার অ্যাকাউন্ট সেকশন থেকে অর্ডার ম্যানেজমেন্ট করতে পারবেন।"
        },
        {
          id: "ordering-4",
          question: "পেমেন্ট সিকিউরিটি সম্পর্কে নিশ্চিত?",
          answer: "আমরা SSL এনক্রিপশন ব্যবহার করি এবং সকল পেমেন্ট গেটওয়ে সম্পূর্ণ সুরক্ষিত। আপনার financial তথ্য কখনো সংরক্ষণ করা হয় না।"
        },
        {
          id: "ordering-5",
          question: "অর্ডার কনফার্মেশন কীভাবে পাব?",
          answer: "অর্ডার দেবার পরপরই আপনি ইমেইল এবং SMS এর মাধ্যমে অর্ডার কনফার্মেশন পাবেন। অর্ডার স্ট্যাটাসও ট্র্যাক করতে পারবেন।"
        }
      ]
    },
    {
      id: "shipping",
      title: "ডেলিভারি এবং শিপিং",
      icon: Truck,
      questions: [
        {
          id: "shipping-1",
          question: "ডেলিভারি চার্জ কত?",
          answer: "৫০০৳+ অর্ডারে ডেলিভারি সম্পূর্ণ ফ্রি! ৫০০৳ এর নিচে অর্ডারে ঢাকার ভিতরে ৬০৳ এবং ঢাকার বাইরে ১২০৳ ডেলিভারি চার্জ প্রযোজ্য।"
        },
        {
          id: "shipping-2",
          question: "ডেলিভারি সময় কত?",
          answer: "ঢাকা সিটির ভিতরে ১-২ কার্যদিবস, ঢাকার বাইরে ৩-৫ কার্যদিবস, এবং রিমোট এরিয়াতে ৫-৭ কার্যদিবস সময় লাগতে পারে।"
        },
        {
          id: "shipping-3",
          question: "আপনারা এলাকায় ডেলিভারি দেন?",
          answer: "আমরা সমগ্র বাংলাদেশে ডেলিভারি সেবা প্রদান করি। এমনকি প্রত্যন্ত এলাকায়ও আমাদের কুরিয়ার সার্ভিস available।"
        },
        {
          id: "shipping-4",
          question: "অর্ডার ট্র্যাক করব?",
          answer: "আপনার অ্যাকাউন্টের 'My Orders' সেকশনে গিয়ে অর্ডার ট্র্যাক করতে পারবেন। SMS এবং ইমেইল আপডেটও পাবেন।"
        },
        {
          id: "shipping-5",
          question: "দ্রুত ডেলিভারির option আছে?",
          answer: "হ্যাঁ, আমরা এক্সপ্রেস ডেলিভারি সার্ভিস অফার করি ঢাকা সিটির জন্য, যেখানে ৬-১২ ঘন্টার মধ্যে ডেলিভারি পাবেন (অতিরিক্ত চার্জ প্রযোজ্য)।"
        }
      ]
    },
    {
      id: "returns",
      title: "রিটার্ন এবং রিফান্ড",
      icon: Shield,
      questions: [
        {
          id: "returns-1",
          question: "বই রিটার্ন?",
          answer: "বই ড্যামেজ, ভুল বই, বা printing সমস্যা হলে ৭ দিনের মধ্যে রিটার্ন করতে পারবেন। বইটি অবশ্য unused condition এ থাকতে হবে।"
        },
        {
          id: "returns-2",
          question: "রিফান্ড প্রসেস?",
          answer: "রিটার্ন approve হওয়ার পর ৫-৭ কার্যদিবসের মধ্যে রিফান্ড process করা হয়। একই payment method এ টাকা ফেরত দেওয়া হয়।"
        },
        {
          id: "returns-3",
          question: "বই exchange করতে পারব?",
          answer: "হ্যাঁ, একই বইয়ের another copy বা equal value এর অন্য বই দিয়ে exchange করতে পারবেন ৭ দিনের মধ্যে।"
        },
      ]
    },
    {
      id: "account",
      title: "অ্যাকাউন্ট এবং প্রোফাইল",
      icon: User,
      questions: [
        {
          id: "account-1",
          question: "পাসওয়ার্ড ভুলে গেছি?",
          answer: "লগইন পেজে 'Forgot Password' এ ক্লিক করুন, আপনার registered ইমেইল দিন, এবং পাসওয়ার্ড রিসেট লিঙ্ক পাবেন।"
        },
        {
          id: "account-2",
          question: "প্রোফাইল আপডেট করব?",
          answer: "আমার অ্যাকাউন্ট > প্রোফাইল এডিট থেকে আপনার সকল তথ্য আপডেট করতে পারবেন anytime।"
        },
        {
          id: "account-3",
          question: "অর্ডার হিস্টোরি দেখব?",
          answer: "আমার অ্যাকাউন্ট > My Orders থেকে আপনার সকল past এবং current অর্ডার দেখতে এবং manage করতে পারবেন।"
        },
        {
          id: "account-4",
          question: "Wishlist কী এবং?",
          answer: "Wishlist এ আপনি পরে কিনতে চাইবেন এমন বই save করে রাখতে পারবেন। বই এর page এ heart icon এ ক্লিক করে wishlist এ add করতে পারবেন।"
        }
      ]
    },
    {
      id: "books",
      title: "বই সম্পর্কিত",
      icon: Book,
      questions: [
        {
          id: "books-1",
          question: "বই এর condition সম্পর্কে জানব?",
          answer: "প্রতিটি বইয়ের পেজে বইয়ের condition (নতুন, used, mint condition ইত্যাদি) clearly mentioned থাকে। ছবিও দেখতে পারবেন।"
        },
        {
          id: "books-2",
          question: "বই out of stock হলে?",
          answer: "Out of stock বই এর notify me বাটনে ক্লিক করুন, বই available হওয়ার সাথে সাথে আমরা আপনাকে notify করব।"
        },
        {
          id: "books-3",
          question: "বই এর preview দেখতে পারব?",
          answer: "কিছু বইয়ের sample pages বা preview available, যা বইয়ের details পেজে দেখতে পারবেন।"
        },
        {
          id: "books-4",
          question: "নির্দিষ্ট বই খুঁজে পাচ্ছি না?",
          answer: "Search bar ব্যবহার করুন, বা আমাদের customer service এ contact করুন। আমরা special order এর ব্যবস্থা করতে পারি।"
        }
      ]
    }
  ];

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const popularQuestions = [
    { id: "ordering-1", text: "অর্ডার দিতে কি অ্যাকাউন্ট প্রয়োজন?" },
    { id: "shipping-1", text: "ডেলিভারি চার্জ কত?" },
    { id: "shipping-2", text: "ডেলিভারি সময় কত?" },
    { id: "returns-1", text: "বই রিটার্ন?" },
    { id: "general-1", text: "হিলফুল-ফুযুল প্রকাশনী কী?" }
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: "ফোন করুন",
      description: "+88-01842781978",
      action: "কল করুন",
      href: "tel:+88-01842781978"
    },
    {
      icon: Mail,
      title: "ইমেইল করুন",
      description: "islamidawainstitute@gmail.com",
      action: "মেইল করুন",
      href: "mailto:islamidawainstitute@gmail.com"
    },
    {
      icon: Clock,
      title: "লাইভ চ্যাট",
      description: "২৪/৭ available",
      action: "চ্যাট শুরু করুন",
      href: "#live-chat"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-[#0E4B4B] to-[#086666]">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#F4F8F7] mb-4">
            সাধারণ জিজ্ঞাসা
          </h1>
          <p className="text-xl text-[#F4F8F7]/90 max-w-2xl mx-auto mb-8">
            হিলফুল-ফুযুল প্রকাশনী সম্পর্কে আপনার সকল প্রশ্নের উত্তর এখানে পাবেন
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-[#5FA3A3]" />
              <input
                type="text"
                placeholder="আপনার প্রশ্নটি এখানে সার্চ করুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-[#5FA3A3] focus:outline-none focus:ring-2 focus:ring-[#C0704D] focus:border-transparent bg-[#F4F8F7] text-[#0D1414] placeholder-[#5FA3A3]"
              />
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Categories */}
      <section className="py-12 bg-[#F4F8F7]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <div 
                key={category.id}
                id={category.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#5FA3A3] border-opacity-30"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-[#F4F8F7] transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[#0E4B4B] bg-opacity-10 rounded-full flex items-center justify-center">
                      <category.icon className="h-6 w-6 text-[#0E4B4B]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#0D1414]">
                        {category.title}
                      </h3>
                      <p className="text-sm text-[#5FA3A3]">
                        {category.questions.length} টি প্রশ্ন
                      </p>
                    </div>
                  </div>
                  {openCategory === category.id ? (
                    <ChevronUp className="h-5 w-5 text-[#0E4B4B]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[#0E4B4B]" />
                  )}
                </button>

                {/* Category Questions */}
                {openCategory === category.id && (
                  <div className="border-t border-[#5FA3A3] border-opacity-30">
                    {category.questions.map((item) => (
                      <div 
                        key={item.id}
                        id={item.id}
                        className="border-b border-[#5FA3A3] border-opacity-20 last:border-b-0"
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="w-full p-6 text-left flex items-start justify-between hover:bg-[#F4F8F7] transition-colors"
                        >
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-[#0D1414] mb-2 text-left">
                              {item.question}
                            </h4>
                            {openItems.has(item.id) && (
                              <div className="mt-3">
                                <p className="text-[#0D1414] leading-relaxed text-left">
                                  {item.answer}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            {openItems.has(item.id) ? (
                              <ChevronUp className="h-5 w-5 text-[#C0704D]" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-[#5FA3A3]" />
                            )}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* No Results Message */}
          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-[#5FA3A3] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#0D1414] mb-2">
                কোন ফলাফল পাওয়া যায়নি
              </h3>
              <p className="text-[#0D1414] mb-6">
                আপনার সার্চ টার্মের সাথে মিলে এমন কোন প্রশ্ন পাওয়া যায়নি
              </p>
              <Button
                onClick={() => setSearchTerm("")}
                className="bg-[#C0704D] hover:bg-[#A85D3F] text-[#F4F8F7]"
              >
                সকল প্রশ্ন দেখুন
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 bg-gradient-to-r from-[#0E4B4B] to-[#086666] text-[#F4F8F7]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">
            আরও তথ্য প্রয়োজন?
          </h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <Link 
              href="/kitabghor/books"
              className="p-6 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors group"
            >
              <Book className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-semibold">সকল বই</div>
            </Link>
            <Link 
              href="/kitabghor/contact"
              className="p-6 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors group"
            >
              <Mail className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-semibold">যোগাযোগ</div>
            </Link>
            <Link 
              href="/kitabghor/about"
              className="p-6 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors group"
            >
              <User className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-semibold">আমাদের সম্পর্কে</div>
            </Link>
            <Link 
              href="/"
              className="p-6 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors group"
            >
              <Home className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="font-semibold">হোমপেজ</div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}