async function run() {
  const email = 'test_coupon_lifecycle_1781929724430@gmail.com';
  const password = 'Password123';

  console.log('Testing login API with existing test account...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
    })
  });

  const loginData = await loginRes.json();
  console.log('Login Response:', loginRes.status, loginData);
}

run().catch(console.error);
