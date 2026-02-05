import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { executeQuery, getReadonlyPool, getAdminPool } from '@/lib/db-pool';

// GET /api/user-preferences - Load user preferences
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // Fetch user preferences from database
    const query = `
      SELECT
        theme,
        max_columns,
        dashboard_layout,
        last_selected_lga,
        updated_at
      FROM housing_dashboard.user_preferences
      WHERE user_email = $1
    `;

    const pool = getReadonlyPool();
    const result = await executeQuery(pool, query, [userEmail]);

    if (!result.success || result.data.length === 0) {
      // No preferences saved yet - return defaults
      return NextResponse.json({
        theme: 'system',
        maxColumns: 6,
        dashboardLayout: [],
        lastSelectedLGA: null
      });
    }

    const prefs = result.data[0];

    return NextResponse.json({
      theme: prefs.theme,
      maxColumns: prefs.max_columns,
      dashboardLayout: prefs.dashboard_layout,
      lastSelectedLGA: prefs.last_selected_lga,
      updatedAt: prefs.updated_at
    });

  } catch (error) {
    console.error('[API] Error loading user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to load preferences' },
      { status: 500 }
    );
  }
}

// POST /api/user-preferences - Save user preferences
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const body = await request.json();

    const {
      theme,
      maxColumns,
      dashboardLayout,
      lastSelectedLGA
    } = body;

    // Upsert user preferences
    const query = `
      INSERT INTO housing_dashboard.user_preferences (
        user_email,
        theme,
        max_columns,
        dashboard_layout,
        last_selected_lga,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_email)
      DO UPDATE SET
        theme = EXCLUDED.theme,
        max_columns = EXCLUDED.max_columns,
        dashboard_layout = EXCLUDED.dashboard_layout,
        last_selected_lga = EXCLUDED.last_selected_lga,
        updated_at = NOW()
      RETURNING *
    `;

    const pool = getAdminPool();
    const result = await executeQuery(pool, query, [
      userEmail,
      theme || 'system',
      maxColumns || 6,
      JSON.stringify(dashboardLayout || []),
      lastSelectedLGA ? JSON.stringify(lastSelectedLGA) : null
    ]);

    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({
      success: true,
      preferences: {
        theme: result.data[0].theme,
        maxColumns: result.data[0].max_columns,
        dashboardLayout: result.data[0].dashboard_layout,
        lastSelectedLGA: result.data[0].last_selected_lga
      }
    });

  } catch (error) {
    console.error('[API] Error saving user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}
