const { execFileSync } = require('node:child_process');
const path = require('node:path');

if (process.platform !== 'darwin') {
  console.error('此项目需要 macOS 14 或更新版本。');
  process.exit(1);
}

try {
  execFileSync('/usr/bin/xcrun', [
    'swiftc',
    '-target', `${process.arch === 'arm64' ? 'arm64' : 'x86_64'}-apple-macosx14.0`,
    '-module-cache-path', '/private/tmp/ragdoll-swift-cache',
    'calendar-reader.swift', '-o', 'calendar-reader',
    '-Xlinker', '-sectcreate', '-Xlinker', '__TEXT',
    '-Xlinker', '__info_plist', '-Xlinker', 'calendar-reader-info.plist'
  ], { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
} catch {
  console.error('编译失败。请检查上面的错误、磁盘空间和 Xcode 命令行工具（xcode-select --install）。');
  process.exit(1);
}
