import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../out-widget');
const DEST_DIR = path.join(__dirname, '../../timer/renderer');

async function copyAssets() {
  try {
    console.log('🚀 Copying widget assets to Electron renderer...');
    
    if (!fs.existsSync(SRC_DIR)) {
      console.error(`❌ Source directory ${SRC_DIR} does not exist. Did the build fail?`);
      process.exit(1);
    }

    // Clean destination
    await fs.remove(DEST_DIR);
    await fs.ensureDir(DEST_DIR);

    // Copy all files
    await fs.copy(SRC_DIR, DEST_DIR);

    console.log('✅ Successfully copied assets to:', DEST_DIR);
    
    // Optional: Rename folders if Next.js export structure needs adjustment for Electron
    // For example, Next.js might export 'widget/memo.html' which is fine.
    
  } catch (err) {
    console.error('❌ Error during asset copy:', err);
    process.exit(1);
  }
}

copyAssets();
