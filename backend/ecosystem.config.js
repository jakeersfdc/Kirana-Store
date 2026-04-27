// PM2 process file for production deploys
// Linux/Docker: cluster mode w/ Postgres -> set PM2_INSTANCES=max
// Windows / SQLite: fork mode (single instance) — DB locks otherwise
const isWin = process.platform === 'win32';
const useSqlite = (process.env.DB_DIALECT || '').toLowerCase() === 'sqlite';

module.exports = {
  apps: [
    {
      name: 'kirana-api',
      script: 'src/server.js',
      instances: isWin || useSqlite ? 1 : (process.env.PM2_INSTANCES || 'max'),
      exec_mode: isWin || useSqlite ? 'fork' : 'cluster',
      max_memory_restart: '600M',
      kill_timeout: 15000,
      listen_timeout: 10000,
      env_file: '.env.production',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
