// 编译排班系统 JSX 为原生 JS 并合并
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', '排班', 'src');
const outFile = path.join(__dirname, 'src', 'duty.js');

const files = [
  'store.jsx',
  'HomePage.jsx',
  'StaffPage.jsx',
  'SchedulePage.jsx',
  'GatePage.jsx',
  'DutySelectPage.jsx',
  'DutyMainPage.jsx',
  'App.jsx',
];

let combined = '// ===== 排班系统（由 JSX 编译生成，请勿手动编辑）=====\n';
combined += '(function() {\n';
combined += '"use strict";\n\n';

files.forEach(file => {
  const filePath = path.join(srcDir, file);
  const code = fs.readFileSync(filePath, 'utf8');
  const result = babel.transformSync(code, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    filename: file,
  });
  combined += `// --- ${file} ---\n`;
  combined += result.code + '\n\n';
});

combined += '})();\n';

fs.writeFileSync(outFile, combined, 'utf8');
console.log('Compiled duty modules ->', outFile);
console.log('Size:', (fs.statSync(outFile).size / 1024).toFixed(1), 'KB');
