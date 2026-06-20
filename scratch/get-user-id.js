const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const email = `testuser_autopay_${Date.now()}@gmail.com`;
  const password = 'Password123';
  const username = `user_${Date.now()}`;

  console.log('Signing up user directly in Supabase:', email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: username,
      }
    }
  });

  if (error) {
    console.error('Signup error:', error.message);
  } else {
    console.log('Signup success! User ID:', data.user.id);
  }
}

run().catch(console.error);
