#!/usr/bin/env node
'use strict';

// ============================================================================
// Sandbox-aware esbuild patcher (postinstall).
//
// The native esbuild binary is launched as a child process over pipes. In
// restricted CI sandboxes (Windows job objects that forbid named pipes) that
// spawn fails with EPERM, which breaks `vite`, `vitest` and `astro`.
//
// This script detects that situation and swaps esbuild for the in-process
// WebAssembly build (`esbuild-wasm`, run with `worker: false`), plus applies
// two tiny Vite/Astro patches for other `child_process` calls that the same
// sandbox blocks (`net use`) and for CommonJS deps in the `astro sync` module
// runner. In a normal environment it does nothing, so real CI still uses the
// native, faster esbuild binary.
// ============================================================================

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function isPipeSpawnBlocked() {
    const r = spawnSync(process.execPath, ['-e', ''], { stdio: ['pipe', 'pipe', 'pipe'] });
    return Boolean(r.error && r.error.code === 'EPERM');
}

function readFile(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

function writeFile(rel, content) {
    fs.writeFileSync(path.join(root, rel), content, 'utf8');
}

// Apply `oldText -> newText` to a file unless the marker is already present.
function patch(rel, marker, oldText, newText) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
        console.log(`[patch-esbuild] skip (missing) ${rel}`);
        return;
    }
    const content = readFile(rel);
    if (content.includes(marker)) {
        console.log(`[patch-esbuild] already patched ${rel}`);
        return;
    }
    if (!content.includes(oldText)) {
        console.log(`[patch-esbuild] no match (versions may differ) ${rel}`);
        return;
    }
    writeFile(rel, content.replace(oldText, newText));
    console.log(`[patch-esbuild] patched ${rel}`);
}

if (!isPipeSpawnBlocked()) {
    console.log('[patch-esbuild] child_process is available; skipping sandbox patches');
    process.exit(0);
}

console.log('[patch-esbuild] pipe spawn is blocked (sandbox detected); applying patches');

// ---------------------------------------------------------------------------
// 1. esbuild → esbuild-wasm (in-process) shim. Full-file replacement.
// ---------------------------------------------------------------------------
const SHIM = `"use strict";

// ============================================================================
// Sandbox-safe esbuild shim.
//
// The native esbuild binary is launched as a child process and communicates
// over pipes (its client/server stdio protocol). Restricted CI sandboxes that
// forbid named pipes reject that spawn with EPERM, which breaks vite, vitest
// and astro (all of which use the esbuild JS API).
//
// This shim forwards every call to \`esbuild-wasm\`, whose service now runs
// the Go WebAssembly runtime in-process (see the patched ensureServiceIsRunning
// in node_modules/esbuild-wasm/lib/main.js) so no child process is ever
// spawned. The API surface is identical for the async entry points that
// vite/vitest/astro use.
// ============================================================================

const esbuild = require("esbuild-wasm");

const version = esbuild.version;
function build(options) {
    return esbuild.build(options);
}
function context(options) {
    return esbuild.context(options);
}
function transform(input, options) {
    return esbuild.transform(input, options);
}
function formatMessages(messages, options) {
    return esbuild.formatMessages(messages, options);
}
function analyzeMetafile(metafile, options) {
    return esbuild.analyzeMetafile(metafile, options);
}
function initialize(options) {
    return esbuild.initialize(options);
}
function stop() {
    return esbuild.stop();
}
function buildSync(options) {
    return esbuild.buildSync(options);
}
function transformSync(input, options) {
    return esbuild.transformSync(input, options);
}
function formatMessagesSync(messages, options) {
    return esbuild.formatMessagesSync(messages, options);
}
function analyzeMetafileSync(metafile, options) {
    return esbuild.analyzeMetafileSync(metafile, options);
}

module.exports = {
    version,
    build,
    context,
    transform,
    formatMessages,
    analyzeMetafile,
    initialize,
    stop,
    buildSync,
    transformSync,
    formatMessagesSync,
    analyzeMetafileSync
};

// Annotate the CommonJS export names for ESM import in node (mirrors esbuild's
// own cjs-module-lexer hint).
0 &&
    (module.exports = {
        version,
        build,
        context,
        transform,
        formatMessages,
        analyzeMetafile,
        initialize,
        stop,
        buildSync,
        transformSync,
        formatMessagesSync,
        analyzeMetafileSync
    });
`;

const esbuildMain = path.join(root, 'node_modules', 'esbuild', 'lib', 'main.js');
if (fs.existsSync(esbuildMain) && !readFile('node_modules/esbuild/lib/main.js').includes('Sandbox-safe esbuild shim')) {
    writeFile('node_modules/esbuild/lib/main.js', SHIM);
    console.log('[patch-esbuild] wrote esbuild shim');
} else if (fs.existsSync(esbuildMain)) {
    console.log('[patch-esbuild] already patched node_modules/esbuild/lib/main.js');
}

// ---------------------------------------------------------------------------
// 2. esbuild-wasm: run the Go service in-process (no child process).
// ---------------------------------------------------------------------------
patch(
    'node_modules/esbuild-wasm/lib/main.js',
    'In-process service',
    `var ensureServiceIsRunning = () => {
  if (longLivedService) return longLivedService;
  let [command, args] = esbuildCommandAndArgs();
  let child = child_process.spawn(command, args.concat(\`--service=\${"0.28.1"}\`, "--ping"), {
    windowsHide: true,
    stdio: ["pipe", "pipe", "inherit"],
    cwd: defaultWD
  });
  let { readFromStdout, afterClose, service } = createChannel({
    writeToStdin(bytes) {
      child.stdin.write(bytes, (err) => {
        if (err) afterClose(err);
      });
    },
    readFileSync: fs2.readFileSync,
    isSync: false,
    hasFS: true,
    esbuild: node_exports
  });
  child.stdin.on("error", afterClose);
  child.on("error", afterClose);
  const stdin = child.stdin;
  const stdout = child.stdout;
  stdout.on("data", readFromStdout);
  stdout.on("end", afterClose);
  stopService = () => {
    stdin.destroy();
    stdout.destroy();
    child.kill();
    initializeWasCalled = false;
    longLivedService = void 0;
    stopService = void 0;
  };
  let refCount = 0;
  child.unref();
  if (stdin.unref) {
    stdin.unref();
  }
  if (stdout.unref) {
    stdout.unref();
  }
  const refs = {
    ref() {
      if (++refCount === 1) child.ref();
    },
    unref() {
      if (--refCount === 0) child.unref();
    }
  };
  longLivedService = {`,
    `var ensureServiceIsRunning = () => {
  if (longLivedService) return longLivedService;
  // In-process service: run the Go WebAssembly runtime in *this* process instead
  // of spawning \`node bin/esbuild\` over pipes (which restricted sandboxes reject
  // with EPERM). stdin/stdout of the service are wired to in-memory buffers;
  // every real file operation delegates to Node's fs.
  let stdinChunks = [];
  let stdinPos = 0;
  let stdinWaiters = [];
  let { readFromStdout, afterClose, service } = createChannel({
    writeToStdin(bytes) {
      stdinChunks.push(bytes);
      const waiters = stdinWaiters;
      stdinWaiters = [];
      for (const w of waiters) w();
    },
    readFileSync: fs2.readFileSync,
    isSync: false,
    hasFS: true,
    esbuild: node_exports
  });
  const serviceFs = Object.create(fs2);
  Object.defineProperty(serviceFs, "constants", {
    value: fs2.constants,
    enumerable: false,
    configurable: true,
    writable: true
  });
  serviceFs.writeSync = (fd, buffer) => {
    if (fd === 1) {
      readFromStdout(buffer);
      return buffer.length;
    }
    if (fd === 2) {
      process.stderr.write(buffer);
      return buffer.length;
    }
    return fs2.writeSync(fd, buffer);
  };
  serviceFs.write = (fd, buffer, offset, length, position, callback) => {
    if (fd === 1 || fd === 2) {
      const chunk = offset === 0 && length === buffer.length ? buffer : buffer.subarray(offset, offset + length);
      if (fd === 1) readFromStdout(chunk);
      else process.stderr.write(chunk);
      callback(null, length, buffer);
      return;
    }
    return fs2.write(fd, buffer, offset, length, position, callback);
  };
  serviceFs.read = (fd, buffer, offset, length, position, callback) => {
    if (fd === 0) {
      const tryRead = () => {
        if (stdinChunks.length === 0) {
          stdinWaiters.push(tryRead);
          return;
        }
        const first = stdinChunks[0];
        const count = Math.max(0, Math.min(length, first.length - stdinPos));
        buffer.set(first.subarray(stdinPos, stdinPos + count), offset);
        stdinPos += count;
        if (stdinPos === first.length) {
          stdinChunks.shift();
          stdinPos = 0;
        }
        callback(null, count);
      };
      tryRead();
      return;
    }
    return fs2.read(fd, buffer, offset, length, position, callback);
  };
  globalThis.fs = serviceFs;
  require(path2.join(__dirname, "..", "wasm_exec.js"));
  const Go = globalThis.Go;
  const go = new Go();
  go.argv = ["", \`--service=\${"0.28.1"}\`];
  const safeEnv = {};
  for (const k of ['PATH', 'NODE_ENV', 'TMP', 'TEMP', 'SYSTEMROOT', 'APPDATA', 'LOCALAPPDATA', 'HOMEPATH', 'USERPROFILE', 'HOME']) {
    if (process.env[k]) safeEnv[k] = process.env[k];
  }
  go.env = safeEnv;
  WebAssembly.instantiate(fs2.readFileSync(path2.join(__dirname, "..", "esbuild.wasm")), go.importObject).then(
    (result) => {
      go.run(result.instance).catch(afterClose);
    },
    (err) => afterClose(err)
  );
  stopService = () => {
    afterClose(null);
    initializeWasCalled = false;
    longLivedService = void 0;
    stopService = void 0;
  };
  const refs = {
    ref() {},
    unref() {}
  };
  longLivedService = {`
);

// ---------------------------------------------------------------------------
// 3. Vite (top level) `optimizeSafeRealPathSync` spawns `net use` on Windows.
// ---------------------------------------------------------------------------
patch(
    'node_modules/vite/dist/node/chunks/config.js',
    'Restricted sandboxes forbid spawning',
    `\texec("net use", (error$1, stdout) => {
\t\tif (error$1) return;
\t\tconst lines = stdout.split("\\n");
\t\tfor (const line of lines) {
\t\t\tconst m = parseNetUseRE.exec(line);
\t\t\tif (m) windowsNetworkMap.set(m[2], m[1]);
\t\t}
\t\tif (windowsNetworkMap.size === 0) safeRealpathSync = fs.realpathSync.native;
\t\telse safeRealpathSync = windowsMappedRealpathSync;
\t});
}`,
    `\ttry {
\t\texec("net use", (error$1, stdout) => {
\t\t\tif (error$1) return;
\t\t\tconst lines = stdout.split("\\n");
\t\t\tfor (const line of lines) {
\t\t\t\tconst m = parseNetUseRE.exec(line);
\t\t\t\tif (m) windowsNetworkMap.set(m[2], m[1]);
\t\t\t}
\t\t\tif (windowsNetworkMap.size === 0) safeRealpathSync = fs.realpathSync.native;
\t\t\telse safeRealpathSync = windowsMappedRealpathSync;
\t\t});
\t} catch {
\t\t// Restricted sandboxes forbid spawning \`net use\` (named-pipe EPERM); the
\t\t// network-drive mapping optimization is irrelevant for a local checkout.
\t\tsafeRealpathSync = fs.realpathSync.native;
\t}
}`
);

// ---------------------------------------------------------------------------
// 4. Nested Vite 8 (bundled with Astro 7) — same `net use` workaround.
// ---------------------------------------------------------------------------
patch(
    'node_modules/astro/node_modules/vite/dist/node/chunks/node.js',
    'Restricted sandboxes forbid spawning',
    `\texec("net use", { windowsHide: true }, (error, stdout) => {
\t\tif (error) return;
\t\tconst lines = stdout.split("\\n");
\t\tfor (const line of lines) {
\t\t\tconst m = parseNetUseRE.exec(line);
\t\t\tif (m) windowsNetworkMap.set(m[2], m[1]);
\t\t}
\t\tif (windowsNetworkMap.size === 0) safeRealpathSync = fs.realpathSync.native;
\t\telse safeRealpathSync = windowsMappedRealpathSync;
\t});
}`,
    `\ttry {
\t\texec("net use", { windowsHide: true }, (error, stdout) => {
\t\t\tif (error) return;
\t\t\tconst lines = stdout.split("\\n");
\t\t\tfor (const line of lines) {
\t\t\t\tconst m = parseNetUseRE.exec(line);
\t\t\t\tif (m) windowsNetworkMap.set(m[2], m[1]);
\t\t\t}
\t\t\tif (windowsNetworkMap.size === 0) safeRealpathSync = fs.realpathSync.native;
\t\t\telse safeRealpathSync = windowsMappedRealpathSync;
\t\t});
\t} catch {
\t\t// Restricted sandboxes forbid spawning \`net use\` (named-pipe EPERM).
\t\tsafeRealpathSync = fs.realpathSync.native;
\t}
}`
);

// ---------------------------------------------------------------------------
// 5. Astro `astro sync` content-collection loader: pre-bundle CommonJS deps for
//    the ssr/astro/prerender/client environments.
// ---------------------------------------------------------------------------
patch(
    'node_modules/astro/dist/vite-plugin-environment/index.js',
    'astro sync` runs these environments',
    `      const finalEnvironmentOptions = {
        optimizeDeps: {
          include: [],
          exclude: []
        },`,
    `      const finalEnvironmentOptions = {
        optimizeDeps: {
          // \`astro sync\` runs these environments with \`optimizeDeps.noDiscovery\`,
          // so CommonJS deps in the content-collection loader chain must be
          // listed explicitly or they load as raw CJS inside the ESM module
          // runner and throw "require is not defined".
          include: ["picomatch", "p-limit", "yocto-queue", "picocolors"],
          exclude: []
        },`
);

console.log('[patch-esbuild] done');
