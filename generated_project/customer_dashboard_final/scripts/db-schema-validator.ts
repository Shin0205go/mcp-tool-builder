#!/usr/bin/env node
/**
 * Database Schema Validator
 * Compares generated contract against actual PostgreSQL schema
 * Ensures "single schema-driven" integrity at runtime
 */

import { Pool } from 'pg';
import { promises as fs } from 'fs';
import { join } from 'path';

interface ContractEntity {
  name: string;
  fields: Array<{
    name: string;
    type: 'uuid' | 'string' | 'email' | 'number' | 'datetime' | 'boolean';
    nullable?: boolean;
  }>;
}

interface Contract {
  name: string;
  entities: ContractEntity[];
}

interface DbColumn {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
}

interface DbTable {
  table_name: string;
  columns: DbColumn[];
}

// Type mapping: contract type → expected PostgreSQL types
const CONTRACT_TO_PG_TYPE: Record<string, string[]> = {
  uuid: ['uuid'],
  string: ['text', 'character varying', 'varchar'],
  email: ['text', 'character varying', 'varchar'],
  number: ['integer', 'bigint', 'numeric', 'smallint'],
  datetime: ['timestamp with time zone', 'timestamptz', 'timestamp without time zone'],
  boolean: ['boolean']
};

export class DatabaseSchemaValidator {
  private pool: Pool;
  
  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async validateSchema(contractPath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Load contract
      const contractContent = await fs.readFile(contractPath, 'utf-8');
      const contract: Contract = JSON.parse(contractContent);

      // 2. Get actual DB schema
      const dbTables = await this.getDbSchema();

      // 3. Validate each entity
      for (const entity of contract.entities) {
        const tableName = entity.name.toLowerCase() + 's';
        const dbTable = dbTables.find(t => t.table_name === tableName);

        if (!dbTable) {
          errors.push(`❌ Table '${tableName}' not found in database`);
          continue;
        }

        // 4. Validate columns
        await this.validateEntityColumns(entity, dbTable, errors, warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error: any) {
      errors.push(`❌ Validation failed: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  private async getDbSchema(): Promise<DbTable[]> {
    const query = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position
    `;

    const result = await this.pool.query(query);
    const tableMap: Record<string, DbTable> = {};

    for (const row of result.rows) {
      const tableName = row.table_name;
      if (!tableMap[tableName]) {
        tableMap[tableName] = { table_name: tableName, columns: [] };
      }
      tableMap[tableName].columns.push({
        column_name: row.column_name,
        data_type: row.data_type,
        is_nullable: row.is_nullable,
        column_default: row.column_default
      });
    }

    return Object.values(tableMap);
  }

  private async validateEntityColumns(
    entity: ContractEntity, 
    dbTable: DbTable, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    const tableName = entity.name.toLowerCase() + 's';

    // Check required system columns
    const requiredSystemColumns = ['id', 'created_at', 'updated_at'];
    for (const sysCol of requiredSystemColumns) {
      const dbCol = dbTable.columns.find(c => c.column_name === sysCol);
      if (!dbCol) {
        errors.push(`❌ ${tableName}: Missing system column '${sysCol}'`);
      }
    }

    // Check entity fields
    for (const field of entity.fields) {
      const expectedDbName = field.name; // We use exact field names now
      const dbCol = dbTable.columns.find(c => c.column_name === expectedDbName);

      if (!dbCol) {
        errors.push(`❌ ${tableName}: Missing column '${expectedDbName}' (from contract field '${field.name}')`);
        continue;
      }

      // Validate type mapping
      const expectedTypes = CONTRACT_TO_PG_TYPE[field.type];
      if (!expectedTypes.includes(dbCol.data_type)) {
        errors.push(`❌ ${tableName}.${expectedDbName}: Type mismatch - contract '${field.type}' → DB '${dbCol.data_type}' (expected: ${expectedTypes.join('|')})`);
      }

      // Validate nullable
      const contractNullable = field.nullable ?? false;
      const dbNullable = dbCol.is_nullable === 'YES';
      
      if (contractNullable !== dbNullable) {
        warnings.push(`⚠️  ${tableName}.${expectedDbName}: Nullable mismatch - contract ${contractNullable} vs DB ${dbNullable}`);
      }
    }

    // Check for extra columns (not in contract)
    const contractFieldNames = entity.fields.map(f => f.name);
    const systemColumns = ['id', 'created_at', 'updated_at'];
    const expectedColumns = [...systemColumns, ...contractFieldNames];

    for (const dbCol of dbTable.columns) {
      if (!expectedColumns.includes(dbCol.column_name)) {
        warnings.push(`⚠️  ${tableName}: Extra column '${dbCol.column_name}' not in contract`);
      }
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: node db-schema-validator.js <database_url> <contract_path>');
    process.exit(1);
  }

  const [databaseUrl, contractPath] = args;
  const validator = new DatabaseSchemaValidator(databaseUrl);

  try {
    console.log('🔍 Validating database schema against contract...');
    console.log(`📄 Contract: ${contractPath}`);
    console.log(`🗄️  Database: ${databaseUrl.replace(/\/\/.*@/, '//<credentials>@')}\n`);

    const result = await validator.validateSchema(contractPath);

    // Display results
    if (result.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      result.warnings.forEach(w => console.log(`  ${w}`));
      console.log('');
    }

    if (result.errors.length > 0) {
      console.log('❌ ERRORS:');
      result.errors.forEach(e => console.log(`  ${e}`));
      console.log('');
    }

    if (result.valid) {
      console.log('✅ Schema validation PASSED!');
      console.log('🎉 Contract ⇔ Database schema is fully consistent\n');
      process.exit(0);
    } else {
      console.log(`❌ Schema validation FAILED! (${result.errors.length} errors)`);
      console.log('💡 Run migrations or update contract to fix inconsistencies\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('💥 Validation error:', error.message);
    process.exit(1);
  } finally {
    await validator.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}