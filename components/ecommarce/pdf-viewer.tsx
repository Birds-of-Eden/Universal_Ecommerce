"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

interface PdfViewerProps {
  pdfUrl?: string;
  onClose?: () => void;
}

const MessageOverlay = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute inset-0 bg-gray-50/70 backdrop-blur-sm flex items-center justify-center p-4 z-10">
    <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      {children}
    </div>
  </div>
);

export default function PdfViewer({ pdfUrl, onClose }: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (pdfUrl && isClient) {
      setIsLoading(true);
      setError(null);
      setIsPdfLoaded(false);

      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pdfUrl, isClient]);

  const handleIframeLoad = () => {
    setIsPdfLoaded(true);
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setError(
      "পিডিএফ ফাইল লোড করা যায়নি। ফাইল লিঙ্ক বা CORS সেটিংস যাচাই করুন।"
    );
    setIsLoading(false);
  };

  if (!isClient) {
    return (
      <MessageOverlay>
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </MessageOverlay>
    );
  }

  if (!pdfUrl) {
    return (
      <MessageOverlay>
        <div className="relative">
          <div className="flex flex-col gap-2 mr-2">
          <p className="text-red-600 font-semibold">পিডিএফ URL পাওয়া যায়নি</p>
          <p className="text-gray-500 text-sm mt-1">
            অনুগ্রহ করে একটি সঠিক ফাইল লিঙ্ক দিন।
          </p>
          </div>
          <div
            onClick={onClose}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 p-2 shadow-md rounded-full"
            aria-label="Close PDF viewer"
          >
            <X className="h-4 w-4" />
          </div>
        </div>
      </MessageOverlay>
    );
  }

  // ✅ ONLY change: hide toolbar/download in most browsers
  const viewerUrl = pdfUrl.includes("#")
    ? pdfUrl
    : `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`;

  return (
    <div className="h-full w-full flex flex-col p-4 bg-gray-50 rounded-lg shadow-inner">
      <div className="flex gap-3 mb-4 flex-wrap justify-center p-2 bg-white rounded-lg shadow-md border-b border-gray-200">
        <p className="text-sm text-gray-500 italic">
          আপনার ব্রাউজার স্বয়ংক্রিয়ভাবে পৃষ্ঠা এবং জুম নিয়ন্ত্রণ করবে।
        </p>
      </div>

      <div className="flex-1 relative overflow-hidden w-full flex justify-center items-start pt-0 custom-scrollbar rounded-xl border-4 border-gray-200 shadow-xl">
        {isLoading && (
          <MessageOverlay>
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-3 text-gray-700 font-medium">
                পিডিএফ লোড হচ্ছে...
              </p>
            </div>
          </MessageOverlay>
        )}

        {error && (
          <MessageOverlay>
            <div className="text-center text-red-600">
              <p className="font-semibold mb-2">{error}</p>
              <Button
                className="mt-2 bg-red-500 hover:bg-red-600"
                onClick={() => {
                  setIsLoading(true);
                  setError(null);
                }}
              >
                আবার চেষ্টা করুন
              </Button>
            </div>
          </MessageOverlay>
        )}

        <iframe
          src={viewerUrl}
          title="PDF Viewer"
          width="100%"
          height="100%"
          style={{
            border: "none",
            visibility: isPdfLoaded ? "visible" : "hidden",
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
