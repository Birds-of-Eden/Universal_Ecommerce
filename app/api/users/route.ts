import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().optional(),
  role: z.enum(['user', 'admin']).default('user'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  addresses: z.array(z.string()).min(1, 'At least one address is required'),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().nullable(),
  role: z.enum(['user', 'admin']).optional().nullable(),
});

// GET all users with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      role: searchParams.get('role'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, search, role } = queryValidation.data;
    const skip = (page - 1) * limit;

    // Build where condition
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    // Get users with order count
    const users = await db.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        banned: true,
        banReason: true,
        banExpires: true,
        note: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get total count for pagination
    const total = await db.user.count({ where });
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = createUserSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, name, role, phone, password, addresses } = validation.data;

    // Normalize addresses
    const normalizedAddresses = addresses
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (normalizedAddresses.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid address is required' },
        { status: 400 }
      );
    }

    // Hash the password before storing
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        name,
        role,
        phone,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        banned: true,
        banReason: true,
        banExpires: true,
        note: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'User created successfully',
      user
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Foreign key constraint violation' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}