// app/kitabghor/user/page.tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import {
  ShoppingBag,
  User,
  Lock,
  MapPin,
  Heart,
  ChevronRight,
} from "lucide-react";
import AccountHeader from "./AccountHeader";

type Tile = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

function TileCard({ title, href, icon }: Tile) {
  return (
    <Link href={href} className="group block">
      <Card
        className="
          h-[120px] md:h-[140px] rounded-2xl
          border border-border bg-card text-card-foreground
          shadow-sm transition-all duration-300
          hover:shadow-md hover:-translate-y-[2px]
        "
      >
        <div className="h-full flex flex-col items-center justify-center gap-3">
          <div
            className="
              h-12 w-12 rounded-full
              bg-muted flex items-center justify-center
              transition-all duration-300
              group-hover:bg-accent
            "
          >
            <div className="text-foreground">{icon}</div>
          </div>

          <p className="text-sm font-semibold">{title}</p>
        </div>
      </Card>
    </Link>
  );
}

export default function UserDashboardPage() {
  const { data: session } = useSession();

  const userName =
    session?.user?.name ||
    (session?.user?.email ? session.user.email.split("@")[0] : "") ||
    "User";

  // ✅ আপনার রাউট অনুযায়ী href বদলাবেন
  const tiles: Tile[] = [
    { title: "Orders", href: "/kitabghor/user/orders", icon: <ShoppingBag className="h-5 w-5" /> },
    { title: "Edit Profile", href: "/kitabghor/user/profile", icon: <User className="h-5 w-5" /> },
    { title: "Password", href: "/kitabghor/user/change-password", icon: <Lock className="h-5 w-5" /> },
    { title: "Addresses", href: "/kitabghor/user/addresses", icon: <MapPin className="h-5 w-5" /> },
    { title: "Wish List", href: "/kitabghor/user/wishlist", icon: <Heart className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Breadcrumb */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Account</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
         <AccountHeader />

          {/* Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <TileCard {...tiles[0]} />
            <TileCard {...tiles[1]} />
            <TileCard {...tiles[2]} />
            <TileCard {...tiles[3]} />

            {/* Second row: only wishlist (SS-like spacing) */}
            <div className="lg:col-span-1">
              <TileCard {...tiles[4]} />
            </div>
            <div className="hidden lg:block lg:col-span-3" />
          </div>
        </div>
      </div>
    </div>
  );
}