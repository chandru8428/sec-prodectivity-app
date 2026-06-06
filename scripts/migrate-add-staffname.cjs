/**
 * Migration: Add staffName column to examSchedules table in Supabase
 * Uses the Supabase REST API to alter the table
 * Run: node scripts/migrate-add-staffname.cjs
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim();
});

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'];
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'];

// Extract the project ref from URL: https://xxxx.supabase.co → xxxx
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function addColumnViaRpc() {
  // Try using Supabase's rpc endpoint to run SQL
  const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
  const body = JSON.stringify({ sql: 'ALTER TABLE "examSchedules" ADD COLUMN IF NOT EXISTS "staffName" text DEFAULT NULL;' });
  
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  };
  return makeRequest(options, body);
}

async function tryDirectInsertWithStaffName() {
  // Try inserting a test record with staffName to see if Supabase auto-creates it
  // (It won't, but this verifies the error)
  const url = new URL(`${SUPABASE_URL}/rest/v1/examSchedules`);
  const body = JSON.stringify([{
    id: 'test-staffname-check-' + Date.now(),
    staffName: 'Test Staff',
    examType: 'practical',
    registerNumber: 'TEST000',
    uploadedBy: 'migration-test',
    examDate: '2099-01-01'
  }]);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Prefer': 'return=minimal',
    }
  };
  return makeRequest(options, body);
}

async function checkColumnExists() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/examSchedules?select=staffName&limit=1`);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  };
  return makeRequest(options);
}

async function main() {
  console.log('=== Adding staffName column to examSchedules table ===\n');
  console.log('Project:', projectRef);
  console.log('');

  // First check if column already exists
  const check = await checkColumnExists();
  if (check.status === 200) {
    console.log('✅ staffName column already exists! Nothing to do.');
    return;
  }

  console.log('Column missing. Attempting to add it via RPC...');
  const rpcResult = await addColumnViaRpc();
  console.log('RPC result:', rpcResult.status, rpcResult.body);

  if (rpcResult.status === 200 || rpcResult.status === 204) {
    console.log('✅ Column added via RPC!');
  } else {
    console.log('\n⚠️  RPC method failed (expected - anon key cannot run DDL)');
    console.log('\n========================================');
    console.log('MANUAL FIX REQUIRED - Do ONE of these:');
    console.log('========================================');
    console.log('\nOption A: Supabase Dashboard (Easiest)');
    console.log('  1. Go to https://supabase.com/dashboard/project/' + projectRef + '/editor');
    console.log('  2. Run this SQL:');
    console.log('     ALTER TABLE "examSchedules" ADD COLUMN IF NOT EXISTS "staffName" text DEFAULT NULL;');
    console.log('');
    console.log('Option B: Table Editor UI');
    console.log('  1. Go to https://supabase.com/dashboard/project/' + projectRef + '/database/tables');
    console.log('  2. Open "examSchedules" table');
    console.log('  3. Add column: staffName (text, nullable)');
    console.log('');
    console.log('SQL to copy-paste:');
    console.log('------------------');
    console.log('ALTER TABLE "examSchedules" ADD COLUMN IF NOT EXISTS "staffName" text DEFAULT NULL;');
    console.log('------------------');
    console.log('');
    console.log('After adding the column, re-upload your practical exam Excel file.');
  }
}

main().catch(console.error);
