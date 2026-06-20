async function run() {
  const email = `testuser_${Date.now()}@gmail.com`;
  const password = 'Password123';
  const username = `user_${Date.now()}`;

  console.log('Testing signup API with:', email);
  
  // Sign up
  const signupRes = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
    })
  });
  
  const signupData = await signupRes.json();
  console.log('Signup Response:', signupRes.status, signupData);

  if (signupRes.status !== 201) {
    console.error('Signup failed');
    return;
  }

  // Log in
  console.log('Testing login API...');
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
