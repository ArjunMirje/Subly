const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = 'test_coupon_lifecycle_1781929724430@gmail.com';
  const password = 'Password123';
  
  console.log('Signing in user...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (signInError) {
    console.error('Sign in error:', signInError.message);
    return;
  }
  
  const userId = signInData.user.id;
  console.log('User signed in, ID:', userId);
  
  // Try inserting a coupon with 'status' column
  console.log('Inserting coupon with status...');
  const { data: couponData, error: couponError } = await supabase
    .from('coupons')
    .insert([{
      userId,
      code: 'TESTSTATUS',
      discount: '10%',
      expiryDate: '2026-12-31',
      service: 'TestService',
      status: 'Available'
    }])
    .select();
    
  if (couponError) {
    console.error('Coupon insert error:', couponError.message);
  } else {
    console.log('Coupon inserted successfully:', couponData);
  }
  
  // Clean up
  if (couponData && couponData.length > 0) {
    await supabase.from('coupons').delete().eq('id', couponData[0].id);
    console.log('Cleaned up coupon.');
  }
}

run();
