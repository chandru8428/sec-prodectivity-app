/**
 * Check all columns in examSchedules table
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

async function main() {
  // Fetch one row with all columns to see what's available
  const url = new URL(`${SUPABASE_URL}/rest/v1/examSchedules?limit=1`);
  const result = await makeRequest({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });
  
  console.log('Status:', result.status);
  
  if (result.status === 200) {
    let rows;
    try { rows = JSON.parse(result.body); } catch(e) { rows = []; }
    if (rows.length > 0) {
      console.log('\nExisting columns in examSchedules:');
      Object.keys(rows[0]).forEach(k => console.log(' -', k));
      console.log('\nSample row:', JSON.stringify(rows[0], null, 2));
    } else {
      console.log('Table is empty. Trying to get schema info...');
      // Try HEAD request
      const headUrl = new URL(`${SUPABASE_URL}/rest/v1/examSchedules?limit=0`);
      const headResult = await makeRequest({
        hostname: headUrl.hostname,
        path: headUrl.pathname + headUrl.search,
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/openapi+json',
        }
      });
      console.log('Schema response:', headResult.status, headResult.body.substring(0, 500));
    }
  } else {
    console.log('Error:', result.body);
  }
  
  // Also try checking specific column variations
  const variants = ['staffName', 'staff_name', 'StaffName', 'staff', 'invigilator'];
  console.log('\n=== Testing column name variants ===');
  for (const v of variants) {
    const testUrl = new URL(`${SUPABASE_URL}/rest/v1/examSchedules?select=${v}&limit=1`);
    const r = await makeRequest({
      hostname: testUrl.hostname,
      path: testUrl.pathname + testUrl.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    const ok = r.status === 200;
    console.log(` ${ok ? '✅' : '❌'} "${v}": HTTP ${r.status}`);
    if (!ok && r.body) {
      try {
        const errBody = JSON.parse(r.body);
        if (errBody.message) console.log(`     Error: ${errBody.message}`);
      } catch(e) {}
    }
  }
}

main().catch(console.error);
