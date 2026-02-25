import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// DATABASE_URL should be the direct PostgreSQL connection string, e.g.:
//   postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
// SUPABASE_URL (the HTTP API URL) will NOT work here.
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Set it to the PostgreSQL connection string from Supabase:');
  console.error('  Dashboard → Settings → Database → Connection string → URI');
  process.exit(1);
}

if (connectionString.startsWith('https://')) {
  console.error('ERROR: DATABASE_URL is set to an HTTP URL, not a PostgreSQL connection string.');
  console.error('Use the URI from: Supabase Dashboard → Settings → Database → Connection string → URI');
  console.error('It should start with: postgresql://');
  process.exit(1);
}

const client = postgres(connectionString, {
  ssl: 'require',          // Supabase requires SSL
  max: 10,                 // connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

console.log('Database client initialized.');

export * from './schema.js';
