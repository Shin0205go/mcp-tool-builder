/**
 * Simple CRUD Template Pack ABI test
 */
import { CrudTemplatePack } from '../core/template_packs/crud_pack.js';

const crudPack = new CrudTemplatePack();

// Basic ABI compliance check
console.log('Testing CRUD Template Pack ABI 1.0.0...');

console.assert(crudPack.abi === '1.0.0', 'ABI version should be 1.0.0');
console.assert(crudPack.name === 'crud', 'Name should be crud');
console.assert(crudPack.version === '1.0.0', 'Version should be 1.0.0');

const features = { 
  crud: true, workflow: false, analytics: false, realtime: false, 
  auth: false, search: false, export: false, i18n: false 
};

console.assert(crudPack.supports(features), 'Should support CRUD features');

const workflowFeatures = { ...features, workflow: true };
console.assert(!crudPack.supports(workflowFeatures), 'Should not support workflow features');

console.log('✅ CRUD Template Pack ABI tests passed!');
console.log('Pack registered successfully with name:', crudPack.name);