import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';

    // Calculate date ranges
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Previous period for growth calculation
    const prevStartDate = new Date(startDate);
    const prevEndDate = new Date(startDate);
    switch (range) {
      case 'today':
        prevStartDate.setDate(startDate.getDate() - 1);
        prevEndDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        prevStartDate.setDate(startDate.getDate() - 7);
        prevEndDate.setDate(startDate.getDate() - 1);
        break;
      case 'month':
        prevStartDate.setMonth(startDate.getMonth() - 1);
        prevEndDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        prevStartDate.setFullYear(startDate.getFullYear() - 1);
        prevEndDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Fetch data in parallel
    const [
      totalUsers,
      prevTotalUsers,
      totalOrders,
      prevTotalOrders,
      deliveredOrders,
      totalProducts,
      pendingOrders,
      lowStockProducts,
      recentOrders,
      topProducts,
      totalRevenue,
      prevTotalRevenue
    ] = await Promise.all([
      // Current period users
      prisma.user.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Previous period users
      prisma.user.count({
        where: {
          createdAt: { gte: prevStartDate, lte: prevEndDate }
        }
      }),
      
      // Current period orders
      prisma.order.count({
        where: {
          order_date: { gte: startDate }
        }
      }),
      
      // Previous period orders
      prisma.order.count({
        where: {
          order_date: { gte: prevStartDate, lte: prevEndDate }
        }
      }),
      
      // Current period delivered orders
      prisma.order.count({
        where: {
          order_date: { gte: startDate },
          status: 'DELIVERED',
        },
      }),
      
      // Total products
      prisma.product.count(),
      
      // Pending orders
      prisma.order.count({
        where: {
          status: 'PENDING'
        }
      }),
      
      // Low stock products
      prisma.product.count({
        where: {
          stock: { lt: 10 }
        }
      }),
      
      // Recent orders
      prisma.order.findMany({
        take: 5,
        orderBy: {
          order_date: 'desc'
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      
      // Top products
      prisma.product.findMany({
        take: 5,
        orderBy: {
          soldCount: 'desc'
        },
        select: {
          id: true,
          name: true,
          price: true,
          soldCount: true,
          ratingAvg: true
        }
      }),
      
      // Current period revenue
      prisma.order.aggregate({
        where: {
          order_date: { gte: startDate },
          paymentStatus: 'PAID'
        },
        _sum: {
          grand_total: true
        }
      }),
      
      // Previous period revenue
      prisma.order.aggregate({
        where: {
          order_date: { gte: prevStartDate, lte: prevEndDate },
          paymentStatus: 'PAID'
        },
        _sum: {
          grand_total: true
        }
      })
    ]);

    // Calculate growth percentages
    const userGrowth = prevTotalUsers > 0 
      ? ((totalUsers - prevTotalUsers) / prevTotalUsers) * 100 
      : totalUsers > 0 ? 100 : 0;

    const orderGrowth = prevTotalOrders > 0
      ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100
      : totalOrders > 0 ? 100 : 0;

    const currentRevenue = Number(totalRevenue._sum.grand_total || 0);
    const previousRevenue = Number(prevTotalRevenue._sum.grand_total || 0);

    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0;

    const stats = {
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue: currentRevenue,
      pendingOrders,
      lowStockProducts,
      recentOrders: recentOrders.map((order: any) => ({
        id: order.id,
        grandTotal: Number(order.grand_total),
        status: order.status,
        user: order.user
      })),
      topProducts: topProducts.map((product: any) => ({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        soldCount: product.soldCount,
        ratingAvg: product.ratingAvg
      })),
      userGrowth: Math.round(userGrowth * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      orderGrowth: Math.round(orderGrowth * 100) / 100,
      successRate: totalOrders > 0
        ? Math.round(((deliveredOrders / totalOrders) * 100) * 100) / 100
        : 0,
      averageOrderValue: totalOrders > 0
        ? Math.round((currentRevenue / totalOrders) * 100) / 100
        : 0,
      conversionRate: totalUsers > 0
        ? Math.round(((totalOrders / totalUsers) * 100) * 100) / 100
        : 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}