const fs = require('fs');
const path = require('path');

// --- 配置区 ---
const OUTPUT_FILE = 'project_source_backup.txt'; // 输出文件名
const IGNORE_DIRS = ['node_modules', 'dist', '.git', '.vite', 'android', 'ios']; // 忽略的文件夹
const ALLOW_EXTS = ['.vue', '.js', '.css', '.html', '.json', '.env', '.sql']; // 允许读取的文件后缀

const projectRoot = __dirname;
let result = `Project Scan Root: ${projectRoot}\n` + "=".repeat(50) + "\n\n";

function scanDir(currentDir) {
  const files = fs.readdirSync(currentDir);

  files.forEach(file => {
    const fullPath = path.join(currentDir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        scanDir(fullPath);
      }
    } else {
      const ext = path.extname(file);
      if (ALLOW_EXTS.includes(ext) || file === '.env') {
        const relativePath = path.relative(projectRoot, fullPath);
        console.log(`正在读取: ${relativePath}`);
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        result += `File: ${relativePath}\n` + "-".repeat(50) + "\n";
        result += content + "\n\n" + "=".repeat(50) + "\n\n";
      }
    }
  });
}

console.log('🚀 开始扫描项目源码...');
try {
  scanDir(projectRoot);
  fs.writeFileSync(OUTPUT_FILE, result);
  console.log(`\n✅ 成功！全量源码已保存至: ${OUTPUT_FILE}`);
  console.log(`你可以直接打开这个文件，全选复制给我。`);
} catch (err) {
  console.error('❌ 运行出错:', err);
}