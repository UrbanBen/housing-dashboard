import { getAdminPool, executeQuery } from '../src/lib/db-pool';

/**
 * Upgrade user to a specific tier
 */
async function upgradeUser(email: string, tier: 'free' | 'plus' | 'pro') {
  const pool = getAdminPool();

  console.log(`\n🔄 Upgrading user ${email} to ${tier.toUpperCase()} tier...\n`);

  // Update user tier
  const updateResult = await executeQuery<{
    id: number;
    email: string;
    name: string;
    tier: string;
  }>(
    pool,
    `UPDATE auth.users
     SET tier = $1
     WHERE email = $2
     RETURNING id, email, name, tier`,
    [tier, email]
  );

  if (!updateResult.success) {
    console.error('❌ Failed to update user:', updateResult.error);
    process.exit(1);
  }

  if (updateResult.rowCount === 0) {
    console.error('❌ User not found with email:', email);
    process.exit(1);
  }

  const user = updateResult.data[0];
  console.log('✅ User upgraded successfully!');
  console.log(`   User ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   New Tier: ${user.tier.toUpperCase()}`);

  // Log to audit trail
  const auditResult = await executeQuery(
    pool,
    `INSERT INTO auth.audit_log (user_id, action, details)
     VALUES ($1, $2, $3)`,
    [user.id, 'upgrade', { tier, upgradedBy: 'admin', timestamp: new Date().toISOString() }]
  );

  if (auditResult.success) {
    console.log('✅ Audit log entry created\n');
  }

  process.exit(0);
}

// Get command line arguments
const email = process.argv[2];
const tier = process.argv[3] as 'free' | 'plus' | 'pro';

if (!email || !tier) {
  console.error('Usage: npx tsx scripts/upgrade-user.ts <email> <tier>');
  console.error('Example: npx tsx scripts/upgrade-user.ts user@example.com pro');
  process.exit(1);
}

if (!['free', 'plus', 'pro'].includes(tier)) {
  console.error('Tier must be one of: free, plus, pro');
  process.exit(1);
}

upgradeUser(email, tier);
