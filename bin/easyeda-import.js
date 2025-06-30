import { fetchEasyEDAComponent, convertRawEasyEdaToTs } from "easyeda"
import fs from 'fs';
import path from 'path';

// Get command line argument
const [partNumber, outputDir] = process.argv.slice(2);

if (!partNumber) {
  console.error('Usage: node easyeda-import.js <part-number> [output-dir]');
  process.exit(1);
}

const resolvedOutputDir = outputDir || '.';

console.log(`Fetching EasyEDA component: ${partNumber}`);

// Usage

const rawEasyJson = await fetchEasyEDAComponent(partNumber)
const tsxComponent = await convertRawEasyEdaToTs(rawEasyJson)

const partName = rawEasyJson.title.replaceAll('-', '_')
const outputFile = path.join(resolvedOutputDir, `${partName}.tsx`);

// Write component to file
try {
  fs.writeFileSync(outputFile, tsxComponent);
  console.log(`Component written to ${outputFile}`);
} catch (error) {
  console.error('Error writing component to file:', error);
  process.exit(1);
}
