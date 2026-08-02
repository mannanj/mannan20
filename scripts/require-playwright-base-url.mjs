if (!process.env.PLAYWRIGHT_BASE_URL) {
  console.error('PLAYWRIGHT_BASE_URL must point to a running Cloudflare workerd preview.');
  process.exit(1);
}
