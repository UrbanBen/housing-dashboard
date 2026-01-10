import { Pool, PoolClient, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * Database Connection Pool Manager
 *
 * Provides centralized connection pooling for PostgreSQL with separate pools
 * for readonly and admin access. Includes automatic reconnection and error handling.
 */

// Pool instances
let readonlyPool: Pool | null = null;
let adminPool: Pool | null = null;

// Pool configuration for small team usage (10-20 connections recommended)
const POOL_CONFIG: Partial<PoolConfig> = {
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool settings
  max: 15, // Maximum number of clients in the pool (small team)
  min: 2, // Minimum number of clients to keep active
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout if connection takes > 5 seconds
};

/**
 * Read password from environment file
 */
function readPasswordFromFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Password file not found: ${filePath}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Match PASSWORD= or POSTGRES_PASSWORD=
      const match = trimmed.match(/^([A-Z_]*PASSWORD)\s*=\s*(.*)$/);
      if (match) {
        let value = match[2];
        value = value.replace(/^["']|["']$/g, ''); // Remove quotes
        return value;
      }
    }

    console.error(`No password found in file: ${filePath}`);
    return null;
  } catch (error) {
    console.error(`Error reading password file ${filePath}:`, error);
    return null;
  }
}

/**
 * Initialize readonly connection pool
 */
function initReadonlyPool(): Pool {
  if (!readonlyPool) {
    console.log('[DB Pool] Initializing READONLY pool...');

    const password = readPasswordFromFile('/users/ben/permissions/.env.readonly');

    if (!password) {
      throw new Error('Failed to read readonly database password');
    }

    readonlyPool = new Pool({
      ...POOL_CONFIG,
      user: 'mosaic_readonly',
      password: password,
    });

    // Handle pool errors
    readonlyPool.on('error', (err, client) => {
      console.error('[DB Pool] Unexpected READONLY pool error:', err);
      // Pool will automatically try to reconnect
    });

    readonlyPool.on('connect', (client) => {
      console.log('[DB Pool] READONLY client connected');
    });

    console.log('[DB Pool] READONLY pool initialized successfully');
  }

  return readonlyPool;
}

/**
 * Initialize admin connection pool
 */
function initAdminPool(): Pool {
  if (!adminPool) {
    console.log('[DB Pool] Initializing ADMIN pool...');

    const password = readPasswordFromFile('/users/ben/permissions/.env.admin');

    if (!password) {
      throw new Error('Failed to read admin database password');
    }

    adminPool = new Pool({
      ...POOL_CONFIG,
      user: 'db_admin',
      password: password,
    });

    // Handle pool errors
    adminPool.on('error', (err, client) => {
      console.error('[DB Pool] Unexpected ADMIN pool error:', err);
      // Pool will automatically try to reconnect
    });

    adminPool.on('connect', (client) => {
      console.log('[DB Pool] ADMIN client connected');
    });

    console.log('[DB Pool] ADMIN pool initialized successfully');
  }

  return adminPool;
}

/**
 * Get readonly pool instance
 * Use this for all read-only operations (recommended for app)
 */
export function getReadonlyPool(): Pool {
  return initReadonlyPool();
}

/**
 * Get admin pool instance
 * Use only for write operations or admin tasks
 */
export function getAdminPool(): Pool {
  return initAdminPool();
}

/**
 * Execute a query with automatic retry logic and error handling
 */
export async function executeQuery<T = any>(
  pool: Pool,
  query: string,
  params?: any[],
  options: { maxRetries?: number; retryDelay?: number } = {}
): Promise<{ success: true; data: T[]; rowCount: number } | { success: false; error: string }> {
  const { maxRetries = 1, retryDelay = 1000 } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[DB Query] Retry attempt ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      const startTime = Date.now();
      const result = await pool.query(query, params);
      const duration = Date.now() - startTime;

      console.log(`[DB Query] Success (${duration}ms, ${result.rowCount} rows)`);

      return {
        success: true,
        data: result.rows as T[],
        rowCount: result.rowCount || 0
      };
    } catch (error: any) {
      lastError = error;
      console.error(`[DB Query] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on syntax errors or other non-transient errors
      if (error.code === '42P01' || error.code === '42703') {
        // Table/column doesn't exist - don't retry
        break;
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown database error'
  };
}

/**
 * Get a client from the pool for transaction support
 */
export async function getClient(pool: Pool): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Health check for connection pools
 */
export async function healthCheck(): Promise<{
  readonly: { status: 'ok' | 'error'; details?: string };
  admin: { status: 'ok' | 'error'; details?: string };
}> {
  const result = {
    readonly: { status: 'ok' as 'ok' | 'error' },
    admin: { status: 'ok' as 'ok' | 'error' }
  };

  // Test readonly pool
  try {
    const pool = getReadonlyPool();
    await pool.query('SELECT 1');
  } catch (error: any) {
    result.readonly.status = 'error';
    result.readonly.details = error.message;
  }

  // Test admin pool
  try {
    const pool = getAdminPool();
    await pool.query('SELECT 1');
  } catch (error: any) {
    result.admin.status = 'error';
    result.admin.details = error.message;
  }

  return result;
}

/**
 * Gracefully close all connection pools
 * Call this on application shutdown
 */
export async function closeAllPools(): Promise<void> {
  console.log('[DB Pool] Closing all connection pools...');

  const promises: Promise<void>[] = [];

  if (readonlyPool) {
    promises.push(readonlyPool.end());
    readonlyPool = null;
  }

  if (adminPool) {
    promises.push(adminPool.end());
    adminPool = null;
  }

  await Promise.all(promises);
  console.log('[DB Pool] All pools closed');
}
