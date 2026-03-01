"use client";

import Footer from "@/components/ecommarce/footer";
import Header from "@/components/ecommarce/header";
import { useEffect, useState } from "react";

const KitabGhorLayout = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-full">
        <div className="min-h-screen flex flex-col">
          {/* Header placeholder to maintain layout structure */}
          <div className="h-20 bg-background border-b border-border"></div>
          {children}
          {/* Footer placeholder to maintain layout structure */}
          <div className="h-96 bg-card border-t border-border"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="min-h-screen flex flex-col">
        <Header />
        {children}
        <Footer />
      </div>
    </div>
  );
};

export default KitabGhorLayout;
