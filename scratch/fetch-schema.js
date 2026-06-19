const url = 'https://tguodogdgahpowwbcixa.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRndW9kb2dkZ2FocG93d2JjaXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODI5ODUsImV4cCI6MjA5MzE1ODk4NX0.0AgU_Y-77ju5wWqHlKD_90Tf0YPpqEOuViWtfuSSt68';
fetch(url)
  .then(res => res.text().then(text => ({ status: res.status, text })))
  .then(res => {
    console.log('Status:', res.status);
    console.log('Body:', res.text.substring(0, 1000));
  })
  .catch(err => console.error(err));
