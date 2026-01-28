import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'templates', 'actual-field-names.json'), 'utf8'));

Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b)).forEach(page => {
  console.log(`\n===== PAGE ${page} (${data[page].length} fields) =====`);
  data[page].slice(0, 15).forEach(f => {
    console.log(`  ${f.name} (${f.type})`);
  });
  if (data[page].length > 15) {
    console.log(`  ... ${data[page].length - 15} more fields`);
  }
});
