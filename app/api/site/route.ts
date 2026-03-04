// app/api/site/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET SITE SETTINGS
========================= */
export async function GET() {
  try {
    const settings = await prisma.sitesettings.findFirst({
      orderBy: { id: "asc" },
    });

    if (!settings) {
      const created = await prisma.sitesettings.create({
        data: {
          logo: null,
          siteTitle: null,
          footerDescription: null,
          contactNumber: null,
          contactEmail: null,
          address: null,
          facebookLink: null,
          instagramLink: null,
          twitterLink: null,
          tiktokLink: null,
          youtubeLink: null,
        },
      });

      return NextResponse.json(created);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET site settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch site settings" },
      { status: 500 },
    );
  }
}

/* =========================
   CREATE / UPDATE SITE SETTINGS
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      logo,
      siteTitle,
      footerDescription,
      contactNumber,
      contactEmail,
      address,
      facebookLink,
      instagramLink,
      twitterLink,
      tiktokLink,
      youtubeLink,
    } = body;

    const existingSettings = await prisma.sitesettings.findFirst({
      orderBy: { id: "asc" },
    });

    if (!existingSettings) {
      const created = await prisma.sitesettings.create({
        data: {
          logo: logo ?? null,
          siteTitle: siteTitle ?? null,
          footerDescription: footerDescription ?? null,
          contactNumber: contactNumber ?? null,
          contactEmail: contactEmail ?? null,
          address: address ?? null,
          facebookLink: facebookLink ?? null,
          instagramLink: instagramLink ?? null,
          twitterLink: twitterLink ?? null,
          tiktokLink: tiktokLink ?? null,
          youtubeLink: youtubeLink ?? null,
        },
      });

      return NextResponse.json(created);
    }

    const updated = await prisma.sitesettings.update({
      where: { id: existingSettings.id },
      data: {
        logo: logo ?? null,
        siteTitle: siteTitle ?? null,
        footerDescription: footerDescription ?? null,
        contactNumber: contactNumber ?? null,
        contactEmail: contactEmail ?? null,
        address: address ?? null,
        facebookLink: facebookLink ?? null,
        instagramLink: instagramLink ?? null,
        twitterLink: twitterLink ?? null,
        tiktokLink: tiktokLink ?? null,
        youtubeLink: youtubeLink ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST site settings error:", error);
    return NextResponse.json(
      { error: "Failed to update site settings" },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE SITE SETTINGS
========================= */
export async function DELETE() {
  try {
    const settings = await prisma.sitesettings.findFirst({
      orderBy: { id: "asc" },
    });

    if (!settings) {
      return NextResponse.json({ message: "Nothing to delete" });
    }

    const updated = await prisma.sitesettings.update({
      where: { id: settings.id },
      data: {
        logo: null,
        siteTitle: null,
        footerDescription: null,
        contactNumber: null,
        contactEmail: null,
        address: null,
        facebookLink: null,
        instagramLink: null,
        twitterLink: null,
        tiktokLink: null,
        youtubeLink: null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("DELETE site settings error:", error);
    return NextResponse.json(
      { error: "Failed to delete site settings" },
      { status: 500 },
    );
  }
}
