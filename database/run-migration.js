#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * Runs SQL migration files against the PostgreSQL database
 * Usage: node database/run-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Database configuration using admin credentials
const config = {
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_ADMIN_USER, // Using admin user for schema creation
  password: process.env.DATABASE_ADMIN_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

async function runMigration() {
  const client = new Client(config);

  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${config.host}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);

    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_create_auth_schema.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`✅ Migration file loaded (${sql.length} characters)\n`);

    // Execute migration
    console.log('🚀 Executing migration...');
    await client.query(sql);
    console.log('✅ Migration executed successfully!\n');

    // Verify schema was created
    const schemaCheck = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = 'auth'
    `);

    if (schemaCheck.rows.length > 0) {
      console.log('✅ Auth schema verified!\n');
    } else {
      console.error('❌ Auth schema not found after migration!');
    }

    // List created tables
    const tablesQuery = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'auth'
      ORDER BY table_name
    `);

    console.log('📋 Created tables:');
    tablesQuery.rows.forEach(row => {
      console.log(`   - auth.${row.table_name}`);
    });

    console.log('\n✨ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Install NextAuth.js dependencies: npm install next-auth bcrypt @next-auth/prisma-adapter');
    console.log('2. Configure OAuth providers in .env.local (Google, Microsoft)');
    console.log('3. Set up Stripe account and add API keys to .env.local');
    console.log('4. Run the application: npm run dev');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);

    if (error.message.includes('permission denied')) {
      console.error('\n⚠️  Permission Error: Make sure you\'re using DATABASE_ADMIN_USER credentials');
      console.error('   Current user:', config.user);
    }

    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
runMigration();
