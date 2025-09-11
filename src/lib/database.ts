import { Pool, PoolClient } from 'pg';

// Database configuration for Azure PostgreSQL
const dbConfig = {
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: process.env.POSTGRES_DATABASE || 'housing_insights',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: false, // Required for Azure PostgreSQL
  },
  // Connection pool settings
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500, // Dispose connection after 7500 uses
};

// Global connection pool
let pool: Pool | null = null;

// Initialize connection pool
function getPool(): Pool {
  if (!pool) {
    console.log('Initializing PostgreSQL connection pool...');
    pool = new Pool(dbConfig);
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
    
    // Handle connection events
    pool.on('connect', () => {
      console.log('PostgreSQL client connected');
    });
  }
  
  return pool;
}

// Get a database client from the pool
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  const client = await pool.connect();
  return client;
}

// Execute a query with connection handling
export async function query(text: string, params?: any[]): Promise<any> {
  const client = await getClient();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    return {
      success: true,
      message: `Connected successfully. Server time: ${result.rows[0].current_time}`
    };
  } catch (error) {
    console.error('Database connection test failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
}

// Close all connections (useful for cleanup)
export async function closePool(): Promise<void> {
  if (pool) {
    console.log('Closing PostgreSQL connection pool...');
    await pool.end();
    pool = null;
  }
}

// Database schema types
export interface BuildingApprovalsRecord {
  id?: number;
  period: string;
  month: string;
  year: number;
  approvals: number;
  lga_id?: string;
  lga_name?: string;
  region?: string;
  data_source: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface LGARecord {
  id: string;
  name: string;
  region: string;
  population: number;
  area_sqkm?: number;
  center_lat?: number;
  center_lng?: number;
  bounds_geom?: string; // GeoJSON string
  created_at?: Date;
  updated_at?: Date;
}

export interface HousingMetricsRecord {
  id?: number;
  lga_id: string;
  period: string;
  building_approvals: number;
  da_applications: number;
  da_approvals: number;
  construction_starts: number;
  construction_completions: number;
  median_price: number;
  land_releases: number;
  data_source: string;
  created_at?: Date;
  updated_at?: Date;
}