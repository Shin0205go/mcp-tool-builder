#!/usr/bin/env node

import { Pool } from 'pg';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigrations() {
  try {
    // Create migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT filename FROM migrations ORDER BY executed_at'
    );
    const executedFiles = new Set(executedMigrations.map(row => row.filename));

    // Get migration files
    const migrationFiles = await readdir(join(process.cwd(), 'migrations'));
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Execute pending migrations
    for (const file of sqlFiles) {
      if (executedFiles.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔄 Running migration: ${file}`);
      
      const sql = await readFile(join(process.cwd(), 'migrations', file), 'utf-8');
      
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(`✅ Migration ${file} completed`);
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`❌ Migration ${file} failed:`, error);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
