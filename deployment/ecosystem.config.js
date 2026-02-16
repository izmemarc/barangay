// PM2 ecosystem config for barangay monorepo (standalone builds)
// Each site runs on its own port with cluster mode
// Deploy dir: /opt/barangay

const DEPLOY_DIR = '/opt/barangay'

module.exports = {
  apps: [
    {
      name: 'banadero',
      cwd: `${DEPLOY_DIR}/sites/banadero/release/sites/banadero`,
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
      },
      max_memory_restart: '512M',
      error_file: `${DEPLOY_DIR}/sites/banadero/logs/error.log`,
      out_file: `${DEPLOY_DIR}/sites/banadero/logs/out.log`,
      merge_logs: true,
    },
    // Add new sites here:
    // {
    //   name: 'site2',
    //   cwd: `${DEPLOY_DIR}/sites/site2/release/sites/site2`,
    //   script: 'server.js',
    //   instances: 2,
    //   exec_mode: 'cluster',
    //   env: {
    //     NODE_ENV: 'production',
    //     PORT: 3002,
    //     HOSTNAME: '0.0.0.0',
    //   },
    //   max_memory_restart: '512M',
    //   error_file: `${DEPLOY_DIR}/sites/site2/logs/error.log`,
    //   out_file: `${DEPLOY_DIR}/sites/site2/logs/out.log`,
    //   merge_logs: true,
    // },
  ],
}
