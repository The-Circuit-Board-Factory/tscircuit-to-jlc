#!/usr/bin/env node

import {
  convertSoupToGerberCommands,
  stringifyGerberCommandLayers,
} from "circuit-json-to-gerber"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "circuit-json-to-gerber"
import { execSync } from 'child_process';
import { convertCircuitJsonToBomRows, convertBomRowsToCsv } from "circuit-json-to-bom-csv"
import {
  convertCircuitJsonToPickAndPlaceCsv,
  convertCircuitJsonToPickAndPlaceRows,
} from "circuit-json-to-pnp-csv"

import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

// Get command line argument
const entryFile = process.argv[2];

if (!entryFile) {
  console.error('Usage: node index.js <entry-file>');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(entryFile)) {
  console.error(`Error: File '${entryFile}' not found`);
  process.exit(1);
}

console.log(`Processing tscircuit file: ${entryFile}`);

// first convert tscircuit project to circuit-json
// Create a temporary file
const randomChars = Math.random().toString(36).substring(2, 8);
const tempFile = `temp_${randomChars}.circuit.json`;
fs.writeFileSync(tempFile, '', { flag: 'wx' });

// Run tsci export command
try {
  execSync(`tsci export ${entryFile} -f circuit-json -o ${tempFile}`, { stdio: 'inherit' });
} catch (error) {
  console.error('Error running tsci export command:', error);
  fs.unlinkSync(tempFile); // Clean up temp file before exiting
  process.exit(1);
}

// Create dir for output files
const outputDir = path.join(process.cwd(), 'output');
fs.mkdirSync(outputDir, { recursive: true });

// Read the generated Circuit JSON
const circuitJson = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
fs.unlinkSync(tempFile); // Clean up temp file before exiting

// Convert Circuit JSON to Gerber commands
const gerberCommands = convertSoupToGerberCommands(circuitJson)

// Convert to Gerber file content
const gerberOutput = stringifyGerberCommandLayers(gerberCommands)
// Write Gerber files
for (const [layerName, content] of Object.entries(gerberOutput)) {
  const outputPath = path.join(outputDir, `${layerName}.gbr`);
  fs.writeFileSync(outputPath, content);
  console.log(`Generated ${layerName}.gbr`);
}

// Generate drill files
const platedDrillCommands = convertSoupToExcellonDrillCommands({
  circuitJson,
  is_plated: true,
})
const unplatedDrillCommands = convertSoupToExcellonDrillCommands({
  circuitJson,
  is_plated: false,
})

const platedDrillOutput = stringifyExcellonDrill(platedDrillCommands)
const unplatedDrillOutput = stringifyExcellonDrill(unplatedDrillCommands)

// Write drill files
if (platedDrillOutput) {
  const platedDrillPath = path.join(outputDir, 'plated.drl');
  fs.writeFileSync(platedDrillPath, platedDrillOutput);
  console.log('Generated plated.drl');
}

if (unplatedDrillOutput) {
  const unplatedDrillPath = path.join(outputDir, 'unplated.drl'); 
  fs.writeFileSync(unplatedDrillPath, unplatedDrillOutput);
  console.log('Generated unplated.drl');
}

// generate bom
const bomRows = await convertCircuitJsonToBomRows({ circuitJson })
const csv = convertBomRowsToCsv(bomRows)

// Write BOM to CSV
const bomCsvPath = path.join(outputDir, 'bom.csv');
fs.writeFileSync(bomCsvPath, csv);
console.log('Generated bom.csv');

// generate pnp
const pnpCsv = convertCircuitJsonToPickAndPlaceCsv(circuitJson)

// Write PnP to CSV
const pnpCsvPath = path.join(outputDir, 'pnp.csv');
fs.writeFileSync(pnpCsvPath, pnpCsv);
console.log('Generated pnp.csv');

// zip up the output files
const zipPath = path.join(process.cwd(), 'output.zip');
const zip = new AdmZip();
zip.addLocalFolder(outputDir);
zip.writeZip(zipPath);
console.log('Generated output.zip');

// delete the output directory
fs.rmSync(outputDir, { recursive: true, force: true });



