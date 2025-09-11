import { NextResponse } from 'next/server';
import { ABSDataService } from '@/lib/abs-data';
import { HousingDBService } from '@/lib/housing-db-service';

export async function POST() {
  try {
    console.log('Starting ABS data migration...');

    // Fetch latest ABS data
    const absData = await ABSDataService.fetchBuildingApprovalsData();
    console.log(`Fetched ${absData.length} records from ABS`);

    // Migrate to database
    const migrationResult = await HousingDBService.migrateABSData(absData);

    return NextResponse.json({
      success: migrationResult.success,
      message: migrationResult.message,
      data: {
        records_fetched: absData.length,
        migration_stats: migrationResult.stats,
        sample_data: absData.slice(0, 3) // Show first 3 records as sample
      }
    });

  } catch (error) {
    console.error('ABS data migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'ABS data migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Return migration status and latest data info
    const refreshInfo = await HousingDBService.getLastRefreshInfo('building_approvals');
    const healthCheck = await HousingDBService.healthCheck();

    return NextResponse.json({
      migration_history: refreshInfo,
      current_status: healthCheck
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}