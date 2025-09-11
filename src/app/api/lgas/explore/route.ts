import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Check the structure of the housing targets table
    const housingTargetsStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'nsw_lga_housing_targets'
      ORDER BY ordinal_position
    `);

    // Check a sample of data
    const housingTargetsSample = await query(`
      SELECT * FROM nsw_lga_housing_targets LIMIT 5
    `);

    // Check the structure of the building approvals table
    const buildingApprovalsStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'abs_building_approvals_lga'
      ORDER BY ordinal_position
    `);

    // Check a sample of building approvals data
    const buildingApprovalsSample = await query(`
      SELECT * FROM abs_building_approvals_lga LIMIT 5
    `);

    return NextResponse.json({
      housing_targets_structure: housingTargetsStructure.rows,
      housing_targets_sample: housingTargetsSample.rows,
      building_approvals_structure: buildingApprovalsStructure.rows,
      building_approvals_sample: buildingApprovalsSample.rows
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}