/**
 * User Registration API Route
 *
 * Handles new user account creation with email/password
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth-helpers';
import { z } from 'zod';

/**
 * Registration request schema
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  name: z.string().min(1, 'Name is required').optional(),
});

/**
 * POST /api/auth/register
 * Create a new user account
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, name } = validationResult.data;

    // Create user in database
    const result = await createUser({
      email,
      password,
      name,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // Success - user created
    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        userId: result.userId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Registration API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during registration',
      },
      { status: 500 }
    );
  }
}
