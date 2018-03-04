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
const readFile = util.promisify(fs.readFile);
const execFile = util.promisify(_execFile);
const crypto = require('crypto');

const instrumentCache = new Map();

class nyc {
  constructor() {
    this._coverage_id = 0;
    this._nyc_config = false;
    if (process.env.NYC_CONFIG) {
      this._nyc_config = JSON.parse(process.env.NYC_CONFIG);
      this._instrumentsCachePath = path.resolve(path.join(this._nyc_config.tempDirectory, 'instruments'));
      mkdirp(this._instrumentsCachePath);
    }
  }

  async instrument(sourcePath) {
    if(!instrumentCache.has(sourcePath)) {
      if(!this._nyc_config) {
        const source = await readFile(sourcePath, 'utf8');
        instrumentCache.set(sourcePath, source);
      } else {
        // first pipe to disk and then read it
        // huge files with a lot of stdout make problems otherwise
        const sourceMd5 = crypto.createHash('md5').update(sourcePath).digest('hex');
        const instrumentCachePath = path.join(this._instrumentsCachePath, sourceMd5);
        await execFile(process.execPath, [
          './node_modules/.bin/nyc',
          'instrument',
          sourcePath,
          '>',
          instrumentCachePath
        ], {
          cwd: process.cwd(),
          env: process.env,
          shell: true
        });
        const source = await readFile(instrumentCachePath, 'utf8');
        instrumentCache.set(sourcePath, source);
      }
    }
    return instrumentCache.get(sourcePath);
  }

  async writeCoverage(window) {
    if (!this._nyc_config) {
      return;
    }
    const jsonFile = `${crypto.randomBytes(32).toString('hex')}.json`;
    const coverageJson = JSON.stringify(window.__coverage__);
    await writeFile(path.join(this._nyc_config.tempDirectory, jsonFile), coverageJson, 'utf-8');
  }
}

module.exports = nyc;
