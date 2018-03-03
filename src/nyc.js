// thanks to @freaktechnik
// https://humanoids.be/log/2017/10/code-coverage-reports-for-webextensions/
//
// Mozilla Public License Version 2.0
// https://github.com/freaktechnik/advanced-github-notifier/blob/master/LICENSE
// https://github.com/freaktechnik/advanced-github-notifier

const path = require('path');
const util = require('util');
const fs = require('fs');
const _mkdirp = require('mkdirp');
const _execFile = require('child_process').execFile;
const writeFile = util.promisify(fs.writeFile);
const mkdirp = util.promisify(_mkdirp);
const execFile = util.promisify(_execFile);
const readFile = util.promisify(fs.readFile);

const instrumentCache = new Map();

class nyc {
  constructor() {
    this._coverage_id = 0;
  }

  async instrument(sourcePath) {
    if(!instrumentCache.has(sourcePath)) {
      if(!process.env.NYC_CONFIG) {
        const source = await readFile(sourcePath, 'utf8');
        instrumentCache.set(sourcePath, source);
      }
      else {
        const instrumented = await execFile(process.execPath, [
          './node_modules/.bin/nyc',
          'instrument',
          sourcePath
        ], {
          cwd: process.cwd(),
          env: process.env
        });
        instrumentCache.set(sourcePath, instrumented.stdout.toString('utf-8'));
      }
    }
    return instrumentCache.get(sourcePath);
  }

  async writeCoverage(window) {
    if (!process.env.NYC_CONFIG) {
      return;
    }
    const nycConfig = JSON.parse(process.env.NYC_CONFIG);
    await mkdirp(nycConfig.tempDirectory);
    await writeFile(path.join(nycConfig.tempDirectory, `${Date.now()}_${process.pid}_${++this._coverage_id}.json`), JSON.stringify(window.__coverage__), 'utf-8');
  }
}

module.exports = nyc;
