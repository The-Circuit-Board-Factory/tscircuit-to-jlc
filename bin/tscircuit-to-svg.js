#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import {
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToPcbSvg,
} from 'circuit-to-svg'
import fs from 'fs'
import { execSync } from 'child_process'

// Get command line argument
const entryFile = process.argv[2];

const outputFile = process.argv[3];

if (!entryFile || !outputFile) {
  console.error('Usage: node index.js <entry-file> <output-file>');
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

const circuitJson = JSON.parse(readFileSync(tempFile, 'utf8'))
fs.unlinkSync(tempFile); // Clean up temp file before exiting

// Generate a PCB image using the board's aspect ratio
const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, {
  matchBoardAspectRatio: true,
  backgroundColor: '#1e1e1e',
})

writeFileSync(outputFile, pcbSvg)
