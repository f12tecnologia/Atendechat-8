import "../bootstrap";

// Parse DATABASE_URL if available (for production)
let dbConfig: any = {};

if (process.env.DATABASE_URL) {
  // Parse the DATABASE_URL
  const url = new URL(process.env.DATABASE_URL);
  
  // Detect if SSL is needed (external DBs like Neon need SSL, local Replit DB doesn't)
  const needsSsl = url.hostname.includes('neon.tech') || 
                   url.hostname.includes('amazonaws.com') ||
                   url.hostname.includes('supabase') ||
                   process.env.DB_SSL === 'true';
  
  dbConfig = {
    dialect: "postgres",
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    username: url.username,
    password: url.password,
    dialectOptions: needsSsl ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  };
} else {
  // Use individual environment variables (for development)
  dbConfig = {
    dialect: process.env.DB_DIALECT || "mysql",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    dialectOptions: process.env.DB_DIALECT === "postgres" && process.env.DB_SSL === "true"
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {},
  };
}

module.exports = {
  define: {
    charset: "utf8mb4",
    collate: "utf8mb4_bin",
  },
  ...dbConfig,
  timezone: "-03:00",
  logging: process.env.DB_DEBUG === "true" 
    ? (msg: string) => console.log(`[Sequelize] ${new Date().toISOString()}: ${msg}`) 
    : false,
  pool: {
    max: 20,
    min: 1,
    acquire: 0,
    idle: 30000,
    evict: 1000 * 60 * 5,
  },
  retry: {
    max: 3,
    timeout: 30000,
    match: [
      /Deadlock/i,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeConnectionTimedOutError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionAcquireTimeoutError/,
      /Operation timeout/,
      /ETIMEDOUT/
    ]
  },
};
