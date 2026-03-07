import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function parseDate(v: string | null, fallback: Date) {
  if (!v) return fallback;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return fallback;
  return d;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const to = parseDate(searchParams.get("to"), now);
    const from = parseDate(
      searchParams.get("from"),
      new Date(now.getTime() - 7 * 24 * 3600 * 1000)
    );
    const bucket = (searchParams.get("bucket") === "hour" ? "hour" : "day") as
      | "hour"
      | "day";

    if (to <= from) {
      return NextResponse.json(
        { ok: false, error: "Invalid range" },
        { status: 400 }
      );
    }

    const bucketSql =
      bucket === "hour"
        ? Prisma.sql`date_trunc('hour', "ts")`
        : Prisma.sql`date_trunc('day', "ts")`;

  // KPIs
  const [pageViewsAgg, activeAgg, uniqVisitorsRows, liveUsersRows] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { ts: { gte: from, lt: to }, event: "page_view" },
    }),
    prisma.analyticsEvent.aggregate({
      where: { ts: { gte: from, lt: to }, event: "heartbeat" },
      _sum: { activeSeconds: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { ts: { gte: from, lt: to } },
      select: { visitorId: true },
      distinct: ["visitorId"],
    }),
    prisma.analyticsEvent.findMany({
      where: { 
        ts: { gte: new Date(now.getTime() - 1 * 60 * 1000) }, // Last 1 minute
        event: "heartbeat" 
      },
      select: { visitorId: true },
      distinct: ["visitorId"],
    }),
  ]);

    const visitors = uniqVisitorsRows.length;
    const pageViews = pageViewsAgg;
    const activeTimeSec = activeAgg._sum.activeSeconds ?? 0;
    const avgActiveTimeSec =
      visitors > 0 ? Math.floor(activeTimeSec / visitors) : 0;
    const liveUsers = liveUsersRows.length;

  // series
    const series = await prisma.$queryRaw<
      Array<{ t: Date; visitors: bigint; pageViews: bigint }>
    >(Prisma.sql`
      SELECT
        ${bucketSql} AS t,
        COUNT(DISTINCT "visitor_id") AS visitors,
        SUM(CASE WHEN "event" = 'page_view' THEN 1 ELSE 0 END) AS "pageViews"
      FROM "analytics_events"
      WHERE "ts" >= ${from} AND "ts" < ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

  // top pages
    const topPages = await prisma.$queryRaw<
      Array<{ path: string; views: bigint; active: bigint }>
    >(Prisma.sql`
      SELECT
        "path" as path,
        SUM(CASE WHEN "event" = 'page_view' THEN 1 ELSE 0 END) AS views,
        SUM(CASE WHEN "event" = 'heartbeat' THEN "active_seconds" ELSE 0 END) AS active
      FROM "analytics_events"
      WHERE "ts" >= ${from} AND "ts" < ${to}
      GROUP BY "path"
      ORDER BY views DESC
      LIMIT 20
    `);

    const topPagesOut = topPages.map((p) => {
      const viewsNum = Number(p.views ?? 0);
      const activeNum = Number(p.active ?? 0);
      return {
        path: p.path,
        views: viewsNum,
        avgActiveTimeSec: viewsNum > 0 ? Math.floor(activeNum / viewsNum) : 0,
      };
    });

  // sources
    const sources = await prisma.$queryRaw<
      Array<{ name: string; count: bigint }>
    >(
      Prisma.sql`
        SELECT
          COALESCE(NULLIF("utm_source", ''), NULLIF("referrer", ''), 'direct') AS name,
          COUNT(*) AS count
        FROM "analytics_events"
        WHERE "ts" >= ${from} AND "ts" < ${to} AND "event" = 'page_view'
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 15
      `
    );

  // devices
    const [deviceType, browser, os] = await Promise.all([
      prisma.$queryRaw<Array<{ name: string; count: bigint }>>(Prisma.sql`
        SELECT COALESCE(NULLIF("device_type", ''), 'unknown') AS name, COUNT(*) AS count
        FROM "analytics_events"
        WHERE "ts" >= ${from} AND "ts" < ${to}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 15
      `),
      prisma.$queryRaw<Array<{ name: string; count: bigint }>>(Prisma.sql`
        SELECT COALESCE(NULLIF("browser", ''), 'unknown') AS name, COUNT(*) AS count
        FROM "analytics_events"
        WHERE "ts" >= ${from} AND "ts" < ${to}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 15
      `),
      prisma.$queryRaw<Array<{ name: string; count: bigint }>>(Prisma.sql`
        SELECT COALESCE(NULLIF("os", ''), 'unknown') AS name, COUNT(*) AS count
        FROM "analytics_events"
        WHERE "ts" >= ${from} AND "ts" < ${to}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 15
      `),
    ]);

  // ✅ GEO (NEW)
    const [countries, cities] = await Promise.all([
      prisma.$queryRaw<Array<{ name: string; count: bigint }>>(Prisma.sql`
        SELECT COALESCE(NULLIF("country", ''), 'unknown') AS name, COUNT(*) AS count
        FROM "analytics_events"
        WHERE "ts" >= ${from} AND "ts" < ${to} AND "event" = 'page_view'
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 15
      `),
      prisma.$queryRaw<Array<{ name: string; count: bigint }>>(Prisma.sql`
        SELECT COALESCE(NULLIF("city", ''), 'unknown') AS name, COUNT(*) AS count
        FROM "analytics_events"
        WHERE "ts" >= ${from} AND "ts" < ${to} AND "event" = 'page_view'
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 15
      `),
    ]);

    return NextResponse.json({
      kpis: { visitors, pageViews, activeTimeSec, avgActiveTimeSec, liveUsers },
      series: series.map((r) => ({
        t: r.t.toISOString(),
        visitors: Number(r.visitors ?? 0),
        pageViews: Number(r.pageViews ?? 0),
      })),
      topPages: topPagesOut,
      sources: sources.map((s) => ({
        name: String(s.name),
        count: Number(s.count ?? 0),
      })),
      devices: {
        deviceType: deviceType.map((d) => ({
          name: String(d.name),
          count: Number(d.count ?? 0),
        })),
        browser: browser.map((d) => ({
          name: String(d.name),
          count: Number(d.count ?? 0),
        })),
        os: os.map((d) => ({
          name: String(d.name),
          count: Number(d.count ?? 0),
        })),
      },
      geo: {
        enabled: true,
        countries: countries.map((c) => ({
          name: String(c.name),
          count: Number(c.count ?? 0),
        })),
        cities: cities.map((c) => ({
          name: String(c.name),
          count: Number(c.count ?? 0),
        })),
      },
    });
  } catch (err) {
    console.error("Failed to load analytics summary", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load analytics summary" },
      { status: 500 }
    );
  }
}
