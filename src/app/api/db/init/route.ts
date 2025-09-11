import { NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/database';
import { HousingDBService } from '@/lib/housing-db-service';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    console.log('Starting database initialization...');

    // Test connection first
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionTest.message
      }, { status: 500 });
    }

    // Read and execute schema SQL
    const schemaPath = path.join(process.cwd(), 'src/lib/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split SQL into individual statements and execute
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let executedStatements = 0;
    for (const statement of statements) {
      try {
        await query(statement);
        executedStatements++;
      } catch (error) {
        // Some statements might fail if already exist (CREATE TABLE IF NOT EXISTS), which is OK
        console.warn('SQL statement warning:', error);
      }
    }

    // Perform health check
    const healthCheck = await HousingDBService.healthCheck();

    console.log('Database initialization completed');

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      connection: connectionTest.message,
      executed_statements: executedStatements,
      health_check: healthCheck
    });

  } catch (error) {
    console.error('Database initialization failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Just return health check for GET requests
    const healthCheck = await HousingDBService.healthCheck();
    const connectionTest = await testConnection();

    return NextResponse.json({
      database_status: healthCheck,
      connection_test: connectionTest
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}