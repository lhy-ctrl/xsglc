'use strict';
// build.js —— 双版本构建
//   local  ：本地管理员版（内联 cloud.js，含 secret key，仅供本机使用，切勿上传公网）
//   read   ：云端只读版（内联 cloud_read.js，仅 publishable key，部署到 GitHub Pages 给同事访问）
const fs = require('fs');
const path = require('path');
const terser = require('terser');

const ROOT = __dirname;
const OUT_LOCAL = path.join(ROOT, '..', '学生管理工作台.html');          // 本地版（保持原文件名，向后兼容）
const OUT_READ = path.join(ROOT, '..', '学生管理工作台_云端只读版.html'); // 云端只读版

function read(p) { return fs.readFileSync(p, 'utf8'); }

const css = read(path.join(ROOT, 'src', 'style.css'));
const xlsx = read(path.join(ROOT, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'));
const react = read(path.join(ROOT, 'src', 'react.min.js'));
const reactDom = read(path.join(ROOT, 'src', 'react-dom.min.js'));
const store = read(path.join(ROOT, 'src', 'store.js'));
const core = read(path.join(ROOT, 'src', 'core.js'));
const duty = read(path.join(ROOT, 'src', 'duty.js'));
const app = read(path.join(ROOT, 'src', 'app.js'));

// 云端模块注入策略：
//   app.js 中 var AppCloud = (typeof AppCloud !== 'undefined') ? AppCloud : require('./cloud.js');
//   本地版内联 cloud.js（定义全局 AppCloud，含 secret key）
//   只读版内联 cloud_read.js（定义全局 AppCloud，仅 publishable key）
// xlsx 库：
//   本地版内联（保证离线可用）；云端版不内联、也不在首屏加载，
//   由 app.js ensureXlsx() 在首次导入 Excel 文件时懒加载 unpkg CDN，避免阻塞首屏渲染。
// 内联 JS 用 terser 压缩（mangle 局部变量安全；不碰对象属性名，导出 API 不变）。
// terser.minify 返回 Promise，故 minifyJs 为 async。
async function minifyJs(code, name) {
  try {
    const out = await terser.minify(code, { compress: true, mangle: true });
    if (!out || !out.code) { console.warn('terser 压缩无结果(' + name + ')，退回原样'); return code; }
    if (out.error) { console.warn('terser 压缩失败(' + name + ')，退回原样:', out.error.message); return code; }
    return out.code;
  } catch (e) { console.warn('terser 压缩异常(' + name + ')，退回原样:', e.message); return code; }
}
// CSS 轻量压缩：去注释与多余空白（CSS 字符串无动态内容，安全）
function minifyCss(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .replace(/ ?([{};:,>]) ?/g, '$1')
    .trim();
}
async function build(cloudModuleFile, title, out, readonlyFlag) {
  const cloud = read(path.join(ROOT, 'src', cloudModuleFile));
  const roInject = readonlyFlag ? '<script>window.READONLY_MODE = true;</script>\n' : '';
  // 本地版内联 xlsx 保证离线可用；云端版不加载（懒加载）
  const xlsxBlock = readonlyFlag
    ? ''
    : `<script>/* SheetJS (xlsx) 内联，保证离线可用 */\n${xlsx}\n</script>\n`;
  const cssMin = minifyCss(css);
  const storeMin = await minifyJs(store, 'store.js');
  const coreMin = await minifyJs(core, 'core.js');
  const dutyMin = await minifyJs(duty, 'duty.js');
  const cloudMin = await minifyJs(cloud, cloudModuleFile);
  const appMin = await minifyJs(app, 'app.js');
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
${cssMin}
</style>
</head>
<body>
<div id="app-root"></div>
${xlsxBlock}
<script>/* React */
${react}
</script>
<script>/* ReactDOM */
${reactDom}
</script>
<script>/* store.js */
${storeMin}
</script>
<script>/* core.js */
${coreMin}
</script>
<script>/* duty.js —— 排班系统 */
${dutyMin}
</script>
<script>/* cloud.js —— ${cloudModuleFile} */
${cloudMin}
</script>
${roInject}<script>/* app.js */
${appMin}
</script>
<script>
(function () {
  function boot() { window.App.init(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>
</body>
</html>
`;
  fs.writeFileSync(out, html, 'utf8');
  console.log('Built:', out, '(' + Math.round(html.length / 1024) + ' KB)');
}

const mode = process.argv[2] || 'both';
(async function main() {
  if (mode === 'local' || mode === 'both') {
    await build('cloud.js', '学生日常管理工作台', OUT_LOCAL, false);
  }
  if (mode === 'read' || mode === 'both') {
    await build('cloud_read.js', '学生管理工作台', OUT_READ, true);
  }
})().catch(function (e) { console.error('构建失败:', e); process.exit(1); });
