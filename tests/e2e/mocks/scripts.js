// Script to persist generated mock data as fixture files.
//
// Designed to be used in a node REPL session, e.g.:
//
// #  node
// > const { writeFixture } = await import('./scripts.js')
// > const { generateDataLogMock } = await import('../helpers/mock-generators.js')
// > writeFixture(generateDataLogMock(10, { overrides: { airmass: null }}), 'datalog-null-airmass')

import fs from "fs";
import path from "path";

export function writeFixture(data, filename) {
  fs.writeFileSync(
    path.resolve(import.meta.dirname, "fixtures", `${filename}.json`),
    JSON.stringify(data, null, 2),
  );
}
