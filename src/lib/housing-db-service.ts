import { query } from './database';
import type { BuildingApprovalsRecord, LGARecord, HousingMetricsRecord } from './database';

export class HousingDBService {
  
  // ============ LGA Methods ============
  
  /**
   * Get all LGAs
   */
  static async getAllLGAs(): Promise<LGARecord[]> {
    const result = await query(`
      SELECT * FROM lgas 
      ORDER BY region, name
    `);
    return result.rows;
  }

  /**
   * Get LGA by ID
   */
  static async getLGAById(id: string): Promise<LGARecord | null> {
    const result = await query(`
      SELECT * FROM lgas WHERE id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  /**
   * Search LGAs by name or region
   */
  static async searchLGAs(searchTerm: string): Promise<LGARecord[]> {
    const result = await query(`
      SELECT * FROM lgas 
      WHERE name ILIKE $1 OR region ILIKE $1
      ORDER BY region, name
    `, [`%${searchTerm}%`]);
    return result.rows;
  }

  // ============ Building Approvals Methods ============
  
  /**
   * Get building approvals data (with optional LGA filter)
   */
  static async getBuildingApprovals(
    lgaId?: string, 
    startPeriod?: string, 
    endPeriod?: string,
    limit: number = 50
  ): Promise<BuildingApprovalsRecord[]> {
    let queryText = `
      SELECT * FROM building_approvals 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (lgaId) {
      queryText += ` AND lga_id = $${paramIndex}`;
      params.push(lgaId);
      paramIndex++;
    }

    if (startPeriod) {
      queryText += ` AND period >= $${paramIndex}`;
      params.push(startPeriod);
      paramIndex++;
    }

    if (endPeriod) {
      queryText += ` AND period <= $${paramIndex}`;
      params.push(endPeriod);
      paramIndex++;
    }

    queryText += ` ORDER BY period DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Insert or update building approvals data
   */
  static async upsertBuildingApprovals(data: BuildingApprovalsRecord[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const record of data) {
      const result = await query(`
        INSERT INTO building_approvals (period, month, year, approvals, lga_id, lga_name, region, data_source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (period, lga_id, data_source)
        DO UPDATE SET
          approvals = EXCLUDED.approvals,
          month = EXCLUDED.month,
          year = EXCLUDED.year,
          lga_name = EXCLUDED.lga_name,
          region = EXCLUDED.region,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserted
      `, [
        record.period,
        record.month,
        record.year,
        record.approvals,
        record.lga_id || null,
        record.lga_name || null,
        record.region || null,
        record.data_source
      ]);

      if (result.rows[0].inserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    return { inserted, updated };
  }

  // ============ Housing Metrics Methods ============

  /**
   * Get comprehensive housing metrics for an LGA
   */
  static async getHousingMetrics(
    lgaId: string, 
    startPeriod?: string, 
    endPeriod?: string
  ): Promise<HousingMetricsRecord[]> {
    let queryText = `
      SELECT * FROM housing_metrics 
      WHERE lga_id = $1
    `;
    const params: any[] = [lgaId];
    let paramIndex = 2;

    if (startPeriod) {
      queryText += ` AND period >= $${paramIndex}`;
      params.push(startPeriod);
      paramIndex++;
    }

    if (endPeriod) {
      queryText += ` AND period <= $${paramIndex}`;
      params.push(endPeriod);
      paramIndex++;
    }

    queryText += ` ORDER BY period DESC`;

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Get aggregated state-wide metrics
   */
  static async getStateWideMetrics(period?: string): Promise<{
    total_building_approvals: number;
    total_da_applications: number;
    total_construction_starts: number;
    total_completions: number;
    average_median_price: number;
    lga_count: number;
  }> {
    let queryText = `
      SELECT 
        COALESCE(SUM(building_approvals), 0) as total_building_approvals,
        COALESCE(SUM(da_applications), 0) as total_da_applications,
        COALESCE(SUM(construction_starts), 0) as total_construction_starts,
        COALESCE(SUM(construction_completions), 0) as total_completions,
        COALESCE(AVG(NULLIF(median_price, 0)), 0) as average_median_price,
        COUNT(DISTINCT lga_id) as lga_count
      FROM housing_metrics
      WHERE 1=1
    `;
    const params: any[] = [];

    if (period) {
      queryText += ` AND period = $1`;
      params.push(period);
    }

    const result = await query(queryText, params);
    return result.rows[0];
  }

  /**
   * Update housing metrics for an LGA
   */
  static async upsertHousingMetrics(data: HousingMetricsRecord): Promise<void> {
    await query(`
      INSERT INTO housing_metrics (
        lga_id, period, building_approvals, da_applications, da_approvals,
        construction_starts, construction_completions, median_price, 
        land_releases, data_source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (lga_id, period, data_source)
      DO UPDATE SET
        building_approvals = EXCLUDED.building_approvals,
        da_applications = EXCLUDED.da_applications,
        da_approvals = EXCLUDED.da_approvals,
        construction_starts = EXCLUDED.construction_starts,
        construction_completions = EXCLUDED.construction_completions,
        median_price = EXCLUDED.median_price,
        land_releases = EXCLUDED.land_releases,
        updated_at = CURRENT_TIMESTAMP
    `, [
      data.lga_id,
      data.period,
      data.building_approvals,
      data.da_applications,
      data.da_approvals,
      data.construction_starts,
      data.construction_completions,
      data.median_price,
      data.land_releases,
      data.data_source
    ]);
  }

  // ============ Data Migration Methods ============

  /**
   * Migrate ABS Excel data to database
   */
  static async migrateABSData(absData: any[]): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      console.log(`Starting migration of ${absData.length} ABS records...`);
      
      const buildingApprovalsData: BuildingApprovalsRecord[] = absData.map(item => ({
        period: item.period,
        month: item.month,
        year: item.year,
        approvals: item.approvals,
        data_source: 'ABS'
      }));

      const stats = await this.upsertBuildingApprovals(buildingApprovalsData);

      // Log the migration
      await query(`
        INSERT INTO data_refresh_log (data_type, source, status, records_processed, completed_at, duration_seconds)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 0)
      `, ['building_approvals', 'ABS', 'success', absData.length]);

      return {
        success: true,
        message: `Successfully migrated ${absData.length} records`,
        stats
      };
    } catch (error) {
      console.error('Migration failed:', error);
      
      // Log the failure
      await query(`
        INSERT INTO data_refresh_log (data_type, source, status, error_message, completed_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, ['building_approvals', 'ABS', 'failed', error instanceof Error ? error.message : 'Unknown error']);

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Migration failed',
        stats: { inserted: 0, updated: 0 }
      };
    }
  }

  // ============ Utility Methods ============

  /**
   * Get latest data refresh information
   */
  static async getLastRefreshInfo(dataType?: string): Promise<any[]> {
    let queryText = `
      SELECT * FROM data_refresh_log
    `;
    const params: any[] = [];

    if (dataType) {
      queryText += ` WHERE data_type = $1`;
      params.push(dataType);
    }

    queryText += ` ORDER BY started_at DESC LIMIT 10`;

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Health check - verify database connectivity and basic data
   */
  static async healthCheck(): Promise<{
    database_connected: boolean;
    lga_count: number;
    building_approvals_count: number;
    latest_data_period: string | null;
    message: string;
  }> {
    try {
      // Test basic connectivity
      await query('SELECT 1');
      
      // Get counts
      const lgaResult = await query('SELECT COUNT(*) as count FROM lgas');
      const approvalsResult = await query('SELECT COUNT(*) as count FROM building_approvals');
      const latestResult = await query('SELECT period FROM building_approvals ORDER BY period DESC LIMIT 1');

      return {
        database_connected: true,
        lga_count: parseInt(lgaResult.rows[0].count),
        building_approvals_count: parseInt(approvalsResult.rows[0].count),
        latest_data_period: latestResult.rows[0]?.period || null,
        message: 'Database is healthy'
      };
    } catch (error) {
      return {
        database_connected: false,
        lga_count: 0,
        building_approvals_count: 0,
        latest_data_period: null,
        message: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }
}