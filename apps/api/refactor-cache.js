import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const directory = './src';
const files = globSync(`${directory}/**/*.ts`);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace type names
  content = content.replace(/AttendanceAggregateCache|PaymentAnalyticsCache|InventoryAggregateCache|AggregateCache/g, 'CacheService');
  
  // Replace old cache service imports with new cache.service.js
  content = content.replace(/from "\.\/aggregate-cache\.service\.js"/g, 'from "./cache.service.js"');
  content = content.replace(/from "\.\/payment-cache\.service\.js"/g, 'from "./cache.service.js"');
  content = content.replace(/from "\.\/inventory-cache\.service\.js"/g, 'from "./cache.service.js"');
  content = content.replace(/from "\.\/attendance-cache\.service\.js"/g, 'from "./cache.service.js"');
  
  content = content.replace(/from "\.\.\/services\/aggregate-cache\.service\.js"/g, 'from "../services/cache.service.js"');
  content = content.replace(/from "\.\.\/services\/payment-cache\.service\.js"/g, 'from "../services/cache.service.js"');
  content = content.replace(/from "\.\.\/services\/inventory-cache\.service\.js"/g, 'from "../services/cache.service.js"');
  content = content.replace(/from "\.\.\/services\/attendance-cache\.service\.js"/g, 'from "../services/cache.service.js"');

  // Since some files might now have multiple imports from "./cache.service.js", we can let the linter complain or try to fix it,
  // but a simpler way is to just let TypeScript sort it out, or we can manually fix `app.ts` because it will have 4 duplicate imports.
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
