/**
 * Test: What happens when we insert a row with an extra column not in the schema?
 * Does Supabase error or silently drop it?
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

async function testInsertWithExtraCol() {
  const testId = 'test-extra-col-' + Date.now();
  const payload = [{
    id: testId,
    examType: 'practical',
    registerNumber: 'TESTSTAFF001',
    studentName: 'Test Student',
    examDate: '2099-12-31',
    subjectCode: 'TEST001',
    subject: 'Test Subject',
    session: 'FN',
    startTime: '09:00',
    endTime: '12:00',
    hall: 'Test Hall',
    staffName: 'Dr. Test Staff',  // <-- extra column
    uploadedBy: 'admin',
  }];

  const body = JSON.stringify(payload);
  const url = new URL(`${SUPABASE_URL}/rest/v1/examSchedules`);
  
  return new Promise((resolve, reject) => {
    const req = require('https').request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=representation',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, testId }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function cleanup(testId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/examSchedules?id=eq.${testId}`);
  return new Promise((resolve) => {
    const req = require('https').request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', resolve);
    req.end();
  });
}

async function main() {
  console.log('=== Testing insert with extra staffName column ===\n');
  
  const result = await testInsertWithExtraCol();
  console.log('Insert status:', result.status);
  console.log('Response:', result.body);
  
  if (result.status === 201) {
    console.log('\n⚠️  Insert SUCCEEDED but staffName was likely silently dropped!');
    console.log('This explains why staffName never appears - data is uploaded but column missing');
    await cleanup(result.testId);
    console.log('\nCleanup: test row deleted');
  } else if (result.status === 400) {
    const err = JSON.parse(result.body);
    console.log('\n❌ Insert FAILED with error:', err.message);
    console.log('This means uploads with staffName data are FAILING silently!');
  }
}

main().catch(console.error);
