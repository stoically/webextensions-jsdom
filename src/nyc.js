// thanks to @freaktechnik
// https://humanoids.be/log/2017/10/code-coverage-reports-for-webextensions/
//
// Mozilla Public License Version 2.0
// https://github.com/freaktechnik/advanced-github-notifier/blob/master/LICENSE
// https://github.com/freaktechnik/advanced-github-notifier

const path = require('path');
const util = require('util');
const fs = require('fs');
const jsdom = require('jsdom');
const mkdirp = require('mkdirp');
const _execFile = require('child_process').execFile;
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const execFile = util.promisify(_execFile);
const crypto = require('crypto');

const instrumentCache = new Map();

class nyc {
  constructor() {
    this._coverage_id = 0;
    this._nyc_config = false;
    this.running = false;
    if (process.env.NYC_CONFIG) {
      this.running = true;
      this._nyc_config = JSON.parse(process.env.NYC_CONFIG);
      this._instrumentsCachePath = path.join(this._nyc_config.tempDir, 'instruments');
      mkdirp(this._instrumentsCachePath);
    }
  }

  async buildDom(options, scripts, jsdomOptions) {
    jsdomOptions.runScripts = 'outside-only';
    let dom;
    let scriptsSource = '';
    if (!scripts) {
      dom = await jsdom.JSDOM.fromFile(options.path, jsdomOptions);
      const scriptsEls = dom.window.document.getElementsByTagName('script');
      scripts = [...scriptsEls];
    } else {
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      dom = new jsdom.JSDOM(html, jsdomOptions);
    }

    for (const script of scripts) {
      const scriptPath = script.src ? script.src.replace(/^file:\/\//, '') : script;
      scriptsSource += await this.instrument(scriptPath, 'utf-8');
      // eslint-disable-next-line quotes
      scriptsSource += ";\n;";
    }

    if (options.script) { scriptsSource += `${options.script}`; }

    let refireStatechangeEvents = dom.window.document.readyState === 'complete';

    dom.window.eval(scriptsSource);

    if (refireStatechangeEvents) {
      // jsdom already finished loading the initial dom before we injected the
      // the eval scripts, so they wont see maybe necessary statechange events
      // that's why we refire them
      const DOMContentLoadedEvent = new dom.window.Event('DOMContentLoaded');
      dom.window.document.dispatchEvent(DOMContentLoadedEvent);
      const loadEvent = new dom.window.Event('load');
      dom.window.dispatchEvent(loadEvent);
      const readystatechangeEvent = new dom.window.Event('readystatechange');
      dom.window.document.dispatchEvent(readystatechangeEvent);
      if (typeof dom.window.document.onreadystatechange === 'function') {
        dom.window.document.onreadystatechange();
      }
    }

    return dom;
  }


  async instrument(sourcePath) {
    if (process.platform === 'win32') {
      sourcePath = sourcePath.replace(/^\//, '');
    }
    sourcePath = path.relative(process.cwd(), sourcePath);

    if (instrumentCache.has(sourcePath)) {
      return instrumentCache.get(sourcePath);
    }
    // first pipe to disk and then read it
    // huge files with a lot of stdout make problems otherwise
    const sourceMd5 = crypto.createHash('md5').update(sourcePath).digest('hex');
    const instrumentCachePath = path.join(this._instrumentsCachePath, sourceMd5);
    await execFile('nyc', [
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
    return source;
  }

  async writeCoverage(window) {
    if (!this._nyc_config) {
      return;
    }
    const jsonFile = `${crypto.randomBytes(32).toString('hex')}.json`;
    const coverageJson = JSON.stringify(window.__coverage__);
    await writeFile(path.join(this._nyc_config.tempDir, jsonFile), coverageJson, 'utf-8');
  }
}

module.exports = nyc;