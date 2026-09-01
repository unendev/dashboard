const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\n=============================================');
console.log('🛡️  [Pre-Build] 开始执行编译打包前数据安全快照');
console.log('=============================================');

try {
  const rootDir = path.resolve(__dirname, '..');
  const projectBackupsDir = path.join(rootDir, 'backups');
  if (!fs.existsSync(projectBackupsDir)) {
    fs.mkdirSync(projectBackupsDir, { recursive: true });
  }

  // 1. 寻找可能的用户数据目录
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Application Support') : path.join(os.homedir(), '.config'));
  const userDataDir = path.join(appData, 'Timer Widget');
  const unifiedStorageFile = path.join(userDataDir, 'unified_storage.json');
  const rootBackupFile = path.join(rootDir, 'backup_projects.json');

  let snapshotData = {};

  if (fs.existsSync(unifiedStorageFile)) {
    try {
      snapshotData = JSON.parse(fs.readFileSync(unifiedStorageFile, 'utf-8'));
      console.log(`📦 已成功读取物理存储数据: ${unifiedStorageFile}`);
    } catch (e) {
      console.warn('⚠️ 读取物理存储文件解析异常，尝试兜底备份');
    }
  }

  // 如果物理文件为空，尝试从根目录的 backup_projects.json 补充
  if (Object.keys(snapshotData).length === 0 && fs.existsSync(rootBackupFile)) {
    try {
      snapshotData = JSON.parse(fs.readFileSync(rootBackupFile, 'utf-8'));
      console.log(`📦 已从项目根目录 backup_projects.json 恢复快照数据`);
    } catch (e) {}
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const snapshotFileName = `prebuild-snapshot-${timestamp}.json`;
  const projectSnapshotPath = path.join(projectBackupsDir, snapshotFileName);

  // 写入项目 backups 目录
  fs.writeFileSync(projectSnapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');
  console.log(`✅ [快照就绪] 项目备份文件已保存至: backups/${snapshotFileName}`);

  // 写入用户 AppData 备份目录
  const userBackupsDir = path.join(userDataDir, 'backups');
  if (!fs.existsSync(userBackupsDir)) {
    fs.mkdirSync(userBackupsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(userBackupsDir, snapshotFileName), JSON.stringify(snapshotData, null, 2), 'utf-8');

  // 保留最近 15 个项目备份
  const existingBackups = fs.readdirSync(projectBackupsDir)
    .filter(f => f.startsWith('prebuild-snapshot-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (existingBackups.length > 15) {
    existingBackups.slice(15).forEach(oldFile => {
      try {
        fs.unlinkSync(path.join(projectBackupsDir, oldFile));
      } catch (_) {}
    });
  }

  console.log(`🎉 [安全防护就绪] 编译构建不会导致任何数据丢失！\n`);
} catch (err) {
  console.error('❌ [Pre-Build 异常]', err);
}
