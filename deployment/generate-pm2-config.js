// Generate PM2 ecosystem config for all barangay sites
// Run: node deployment/generate-pm2-config.js

const fs = require('fs')
const path = require('path')

// Read all site directories
const sitesDir = path.join(__dirname, '../sites')
const sites = fs.readdirSync(sitesDir).filter(dir => {
  const fullPath = path.join(sitesDir, dir)
  return fs.statSync(fullPath).isDirectory() && dir !== '_template'
})

// Generate PM2 app config for each site
const apps = sites.map((site, index) => {
  const port = 3001 + index

  return {
    name: site,
    cwd: `./sites/${site}`,
    script: 'node_modules/.bin/next',
    args: `start --port ${port}`,
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: port,
      HOSTNAME: '0.0.0.0',
    },
    max_memory_restart: '512M',
    error_file: `./logs/${site}-error.log`,
    out_file: `./logs/${site}-out.log`,
    merge_logs: true,
  }
})

// Generate ecosystem config
const config = {
  apps: apps
}

// Write to file
const outputPath = path.join(__dirname, 'ecosystem.config.js')
const content = `// PM2 ecosystem config - AUTO-GENERATED
// Do not edit manually, run: node deployment/generate-pm2-config.js

module.exports = ${JSON.stringify(config, null, 2)}
`

fs.writeFileSync(outputPath, content)

console.log(`✅ Generated PM2 config for ${sites.length} sites:`)
sites.forEach((site, index) => {
  console.log(`   ${site.padEnd(20)} → port ${3001 + index}`)
})
console.log(`\n📝 Config written to: ${outputPath}`)
console.log(`\n🚀 Start all sites: pm2 start ${outputPath}`)
