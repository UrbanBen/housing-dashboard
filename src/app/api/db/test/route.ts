import { NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/database';

export async function GET() {
  try {
    // Test connection
    const connectionTest = await testConnection();
    
    // Check what tables exist
    let existingTables: any[] = [];
    let permissions: any = {};
    
    try {
      const tablesResult = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      existingTables = tablesResult.rows;
    } catch (error) {
      console.warn('Could not list tables:', error);
    }

    // Check user permissions
    try {
      const userResult = await query('SELECT current_user, session_user');
      const dbResult = await query('SELECT current_database()');
      permissions = {
        current_user: userResult.rows[0]?.current_user,
        session_user: userResult.rows[0]?.session_user,
        database: dbResult.rows[0]?.current_database
      };
    } catch (error) {
      console.warn('Could not check permissions:', error);
    }

    // Try to check if we can create tables
    let canCreateTables = false;
    try {
      await query('CREATE TABLE IF NOT EXISTS test_permissions_check (id SERIAL PRIMARY KEY)');
      await query('DROP TABLE IF EXISTS test_permissions_check');
      canCreateTables = true;
    } catch (error) {
      console.log('Cannot create tables:', error);
    }

    return NextResponse.json({
      connection: connectionTest,
      database_info: permissions,
      existing_tables: existingTables,
      can_create_tables: canCreateTables,
      recommendations: {
        next_steps: canCreateTables 
          ? "You can create tables. Run POST /api/db/init to set up schema."
          : "Read-only access detected. You may need admin privileges to create tables, or use existing tables.",
        table_count: existingTables.length
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}