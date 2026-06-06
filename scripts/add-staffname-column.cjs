/**
 * Migration: Add staffName column to examSchedules table in Supabase
 * Run: node scripts/add-staffname-column.cjs
 */
const https = require('https');
const { execSync } = require('child_process');

// Read .env file manually
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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

console.log('Supabase URL:', SUPABASE_URL);
console.log('');

// We'll use the Supabase Management API via the REST API
// Since we only have anon key, we test by trying to insert a row with staffName
// and see if it's stored. If not, we need to add the column via Supabase dashboard.

async function testStaffNameColumn() {
  const url = `${SUPABASE_URL}/rest/v1/examSchedules?select=staffName&limit=1`;
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response body:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function checkExistingRows() {
  const url = `${SUPABASE_URL}/rest/v1/examSchedules?select=id,registerNumber,staffName&limit=5`;
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== Testing staffName column in examSchedules table ===\n');
  
  try {
    const result = await checkExistingRows();
    
    if (result.status === 200) {
      let rows;
      try { rows = JSON.parse(result.body); } catch (e) { rows = []; }
      
      if (rows.length === 0) {
        console.log('✅ Column "staffName" exists in examSchedules table (table is empty or no data)');
        console.log('   The staffName column is properly set up.\n');
        console.log('ℹ️  Make sure when uploading Excel files, the column is named:');
        console.log('   "Staff", "Staff Name", "Invigilator", "Faculty", or "Teacher"');
      } else {
        const sample = rows[0];
        if ('staffName' in sample) {
          console.log('✅ Column "staffName" EXISTS in examSchedules table!');
          console.log('   Sample data:', rows.map(r => ({ id: r.id?.substring(0,8), reg: r.registerNumber, staff: r.staffName })));
          
          const missingStaff = rows.filter(r => !r.staffName);
          if (missingStaff.length === rows.length) {
            console.log('\n⚠️  WARNING: staffName column exists but all sampled rows have empty staffName!');
            console.log('   This means the Excel file being uploaded does NOT have a staff/invigilator column.');
            console.log('   Check that your Excel file has a column named: Staff, Staff Name, Invigilator, Faculty, or Teacher');
          }
        } else {
          console.log('❌ Column "staffName" does NOT exist in examSchedules table!');
          console.log('   You need to add this column in Supabase dashboard.\n');
          console.log('=== HOW TO FIX ===');
          console.log('1. Go to https://supabase.com → your project');
          console.log('2. Click "Table Editor" → "examSchedules"');
          console.log('3. Click "+" to add column:');
          console.log('   Name: staffName');
          console.log('   Type: text');
          console.log('   Default: (empty)');
          console.log('4. Save and re-upload your practical exam file');
        }
      }
    } else if (result.status === 400 && result.body.includes('staffName')) {
      console.log('❌ Column "staffName" does NOT exist in examSchedules table');
      console.log('   Error:', result.body);
    } else {
      console.log('Status:', result.status);
      console.log('Body:', result.body);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
