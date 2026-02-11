import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

interface RequestBody {
  lgaName: string;
}

interface IncomeData {
  lgaName: string;
  avgHouseholdIncome: number;
  avgPersonalIncome: number;
  avgWeeklyRent: number;
  householdIncomeRank: number;
  personalIncomeRank: number;
  weeklyRentRank: number;
  totalLGAs: number;
}

// Income bracket midpoints and rent bracket midpoints
const HOUSEHOLD_INCOME_BRACKETS = [
  { column: 'negative_nil_income_tot', midpoint: 0 },
  { column: 'hi_1_149_tot', midpoint: 75 },
  { column: 'hi_150_299_tot', midpoint: 224.5 },
  { column: 'hi_300_399_tot', midpoint: 349.5 },
  { column: 'hi_400_499_tot', midpoint: 449.5 },
  { column: 'hi_500_649_tot', midpoint: 574.5 },
  { column: 'hi_650_799_tot', midpoint: 724.5 },
  { column: 'hi_800_999_tot', midpoint: 899.5 },
  { column: 'hi_1000_1249_tot', midpoint: 1124.5 },
  { column: 'hi_1250_1499_tot', midpoint: 1374.5 },
  { column: 'hi_1500_1749_tot', midpoint: 1624.5 },
  { column: 'hi_1750_1999_tot', midpoint: 1874.5 },
  { column: 'hi_2000_2499_tot', midpoint: 2249.5 },
  { column: 'hi_2500_2999_tot', midpoint: 2749.5 },
  { column: 'hi_3000_3499_tot', midpoint: 3249.5 },
  { column: 'hi_3500_3999_tot', midpoint: 3749.5 },
  { column: 'hi_4000_more_tot', midpoint: 5000 } // Estimate for $4000+
];

const PERSONAL_INCOME_BRACKETS = [
  { column: 'p_neg_nil_income_tot', midpoint: 0 },
  { column: 'p_1_149_tot', midpoint: 75 },
  { column: 'p_150_299_tot', midpoint: 224.5 },
  { column: 'p_300_399_tot', midpoint: 349.5 },
  { column: 'p_400_499_tot', midpoint: 449.5 },
  { column: 'p_500_649_tot', midpoint: 574.5 },
  { column: 'p_650_799_tot', midpoint: 724.5 },
  { column: 'p_800_999_tot', midpoint: 899.5 },
  { column: 'p_1000_1249_tot', midpoint: 1124.5 },
  { column: 'p_1250_1499_tot', midpoint: 1374.5 },
  { column: 'p_1500_1749_tot', midpoint: 1624.5 },
  { column: 'p_1750_1999_tot', midpoint: 1874.5 },
  { column: 'p_2000_2999_tot', midpoint: 2499.5 },
  { column: 'p_3000_3499_tot', midpoint: 3249.5 },
  { column: 'p_3500_more_tot', midpoint: 4500 } // Estimate for $3500+
];

const RENT_BRACKETS = [
  { column: 'r_1_74_tot', midpoint: 37.5 },
  { column: 'r_75_99_tot', midpoint: 87 },
  { column: 'r_100_149_tot', midpoint: 124.5 },
  { column: 'r_150_199_tot', midpoint: 174.5 },
  { column: 'r_200_224_tot', midpoint: 212 },
  { column: 'r_225_274_tot', midpoint: 249.5 },
  { column: 'r_275_349_tot', midpoint: 312 },
  { column: 'r_350_449_tot', midpoint: 399.5 },
  { column: 'r_450_549_tot', midpoint: 499.5 },
  { column: 'r_550_649_tot', midpoint: 599.5 },
  { column: 'r_650_749_tot', midpoint: 699.5 },
  { column: 'r_750_849_tot', midpoint: 799.5 },
  { column: 'r_850_949_tot', midpoint: 899.5 },
  { column: 'r_950_over_tot', midpoint: 1200 } // Estimate for $950+
];

function calculateWeightedAverage(row: any, brackets: { column: string; midpoint: number }[]): number {
  let totalWeighted = 0;
  let totalCount = 0;

  for (const bracket of brackets) {
    const count = parseInt(row[bracket.column] || '0', 10);
    totalWeighted += count * bracket.midpoint;
    totalCount += count;
  }

  return totalCount > 0 ? totalWeighted / totalCount : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { lgaName } = body;

    if (!lgaName) {
      return NextResponse.json(
        { success: false, error: 'LGA name is required' },
        { status: 400 }
      );
    }

    const pool = getReadonlyPool();

    // 1. Get household income data for selected LGA
    const householdIncomeQuery = `
      SELECT lga_name22, ${HOUSEHOLD_INCOME_BRACKETS.map(b => b.column).join(', ')}
      FROM s8_economy.abs_cen21_gcp_weekly_household_income_age_sex_lga_au_7844
      WHERE lga_name22 = $1
    `;
    const householdResult = await pool.query(householdIncomeQuery, [lgaName]);

    if (householdResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'LGA not found' },
        { status: 404 }
      );
    }

    const avgHouseholdIncome = calculateWeightedAverage(householdResult.rows[0], HOUSEHOLD_INCOME_BRACKETS);

    // 2. Get personal income data for selected LGA
    const personalIncomeQuery = `
      SELECT lga_name22, ${PERSONAL_INCOME_BRACKETS.map(b => b.column).join(', ')}
      FROM s8_economy.abs_cen21_gcp_weekly_personal_income_age_sex_lga_au_7844
      WHERE lga_name22 = $1
    `;
    const personalResult = await pool.query(personalIncomeQuery, [lgaName]);
    const avgPersonalIncome = personalResult.rows.length > 0
      ? calculateWeightedAverage(personalResult.rows[0], PERSONAL_INCOME_BRACKETS)
      : 0;

    // 3. Get weekly rent data for selected LGA
    const rentQuery = `
      SELECT lga_name22, ${RENT_BRACKETS.map(b => b.column).join(', ')}
      FROM s8_economy.abs_cen21_gcp_weekly_rent_by_landlord_type_lga_au_7844
      WHERE lga_name22 = $1
    `;
    const rentResult = await pool.query(rentQuery, [lgaName]);
    const avgWeeklyRent = rentResult.rows.length > 0
      ? calculateWeightedAverage(rentResult.rows[0], RENT_BRACKETS)
      : 0;

    // 4. Calculate rankings by comparing to all LGAs
    // Household Income Ranking (higher is better)
    const allHouseholdQuery = `
      SELECT lga_name22, ${HOUSEHOLD_INCOME_BRACKETS.map(b => b.column).join(', ')}
      FROM s8_economy.abs_cen21_gcp_weekly_household_income_age_sex_lga_au_7844
    `;
    const allHouseholdResult = await pool.query(allHouseholdQuery);
    const householdIncomes = allHouseholdResult.rows.map(row => ({
      lga: row.lga_name22,
      avg: calculateWeightedAverage(row, HOUSEHOLD_INCOME_BRACKETS)
    }));
    householdIncomes.sort((a, b) => b.avg - a.avg); // Sort descending (highest first)
    const householdIncomeRank = householdIncomes.findIndex(item => item.lga === lgaName) + 1;

    // Personal Income Ranking (higher is better)
    const allPersonalQuery = `
      SELECT lga_name22, ${PERSONAL_INCOME_BRACKETS.map(b => b.column).join(', ')}
      FROM s8_economy.abs_cen21_gcp_weekly_personal_income_age_sex_lga_au_7844
    `;
    const allPersonalResult = await pool.query(allPersonalQuery);
    const personalIncomes = allPersonalResult.rows.map(row => ({
      lga: row.lga_name22,
      avg: calculateWeightedAverage(row, PERSONAL_INCOME_BRACKETS)
    }));
    personalIncomes.sort((a, b) => b.avg - a.avg); // Sort descending (highest first)
    const personalIncomeRank = personalIncomes.findIndex(item => item.lga === lgaName) + 1;

    // Weekly Rent Ranking (lower is better for affordability, but we'll show rank by price)
    const allRentQuery = `
      SELECT lga_name22, ${RENT_BRACKETS.map(b => b.column).join(', ')}
      FROM s8_economy.abs_cen21_gcp_weekly_rent_by_landlord_type_lga_au_7844
    `;
    const allRentResult = await pool.query(allRentQuery);
    const rents = allRentResult.rows.map(row => ({
      lga: row.lga_name22,
      avg: calculateWeightedAverage(row, RENT_BRACKETS)
    }));
    rents.sort((a, b) => b.avg - a.avg); // Sort descending (highest first)
    const weeklyRentRank = rents.findIndex(item => item.lga === lgaName) + 1;

    const totalLGAs = householdIncomes.length;

    const data: IncomeData = {
      lgaName,
      avgHouseholdIncome: Math.round(avgHouseholdIncome),
      avgPersonalIncome: Math.round(avgPersonalIncome),
      avgWeeklyRent: Math.round(avgWeeklyRent),
      householdIncomeRank,
      personalIncomeRank,
      weeklyRentRank,
      totalLGAs
    };

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching income data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
