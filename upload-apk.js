import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const bucketName = 'releases';
  const fileName = 'edusync-app.apk';
  const filePath = path.join(process.cwd(), 'app-release-signed.apk');

  console.log("Checking if bucket exists...");
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets && buckets.find(b => b.name === bucketName);

  if (!bucketExists) {
    console.log("Creating bucket...");
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true
    });
    if (createError) {
      console.error("Failed to create bucket (Anon key might not have permissions):", createError.message);
      console.log("\nPlease create a public bucket named 'releases' in the Supabase Dashboard and upload the APK manually.");
      process.exit(1);
    }
  }

  console.log("Reading APK file...");
  const fileBuffer = fs.readFileSync(filePath);

  console.log("Uploading APK...");
  const { data, error } = await supabase.storage.from(bucketName).upload(fileName, fileBuffer, {
    contentType: 'application/vnd.android.package-archive',
    upsert: true
  });

  if (error) {
    console.error("Failed to upload APK:", error.message);
    console.log("\nPlease upload the APK manually to the 'releases' bucket in the Supabase Dashboard.");
    process.exit(1);
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
  console.log("Upload successful!");
  console.log("Public URL:", publicUrlData.publicUrl);
}

main();
