module.exports = {
  apps: [
    {
      name: "boms",
      script: "/var/www/boms/.next/standalone/server.js",
      cwd: "/var/www/boms",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        HOSTNAME: "0.0.0.0",
      },
      // Restart if it uses more than 1.5 GB RAM
      max_memory_restart: "1500M",
      // Restart on crash
      restart_delay: 2000,
      max_restarts: 10,
    },
  ],
};
