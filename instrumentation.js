export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initCron } = await import('./lib/cron');
    initCron();
  }
}
