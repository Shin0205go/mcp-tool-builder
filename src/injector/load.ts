import { promises as fs } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import contractSchema from './schema/contract.schema.json' with { type: 'json' };

export interface Contract {
  name: string;
  description?: string;
  entities: Entity[];
}

export interface Entity {
  name: string;
  description?: string;
  fields: Field[];
}

export interface Field {
  name: string;
  type: 'uuid' | 'string' | 'email' | 'number' | 'datetime' | 'boolean';
  nullable?: boolean;
  description?: string;
}

const ajv = new Ajv();
const validateContract = ajv.compile(contractSchema);

export class ContractLoader {
  async load(contractPath: string): Promise<Contract> {
    return loadContract(contractPath);
  }
}

/**
 * Load and validate contract from JSON file
 */
export async function loadContract(contractPath: string): Promise<Contract> {
  try {
    const content = await fs.readFile(contractPath, 'utf-8');
    const contract = JSON.parse(content);
    
    if (!validateContract(contract)) {
      throw new Error(`Invalid contract: ${ajv.errorsText(validateContract.errors)}`);
    }
    
    return contract as Contract;
  } catch (error) {
    throw new Error(`Failed to load contract from ${contractPath}: ${error}`);
  }
}

/**
 * Physical type mapping for PostgreSQL
 */
export const TYPE_MAP = {
  uuid: 'UUID DEFAULT gen_random_uuid()',
  string: 'TEXT',
  email: 'TEXT',
  number: 'INTEGER', 
  datetime: 'TIMESTAMPTZ DEFAULT now()',
  boolean: 'BOOLEAN'
} as const;

/**
 * Zod type mapping
 */
export const ZOD_MAP = {
  uuid: 'z.string().uuid()',
  string: 'z.string()',
  email: 'z.string().email()',
  number: 'z.number()',
  datetime: 'z.string().datetime()',
  boolean: 'z.boolean()'
} as const;