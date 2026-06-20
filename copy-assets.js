import fs from 'fs';
import path from 'path';

const srcImagesDir = path.join(process.cwd(), 'src', 'assets', 'images');
const androidResDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');

// Find generated images
const files = fs.readdirSync(srcImagesDir);
const appIconFile = files.find(f => f.startsWith('app_icon') && f.endsWith('.jpg'));
const splashFile = files.find(f => f.startsWith('splash_screen') && f.endsWith('.jpg'));

if (appIconFile) {
  const srcIconPath = path.join(srcImagesDir, appIconFile);
  const destIconPath = path.join(androidResDir, 'drawable', 'app_icon.jpg');
  fs.mkdirSync(path.dirname(destIconPath), { recursive: true });
  fs.copyFileSync(srcIconPath, destIconPath);
  console.log(`Copied icon: ${srcIconPath} -> ${destIconPath}`);
} else {
  console.warn('Could not find app_icon file in', srcImagesDir);
}

if (splashFile) {
  const srcSplashPath = path.join(srcImagesDir, splashFile);
  // Delete existing splash.png to avoid resource conflict
  const oldSplashPng = path.join(androidResDir, 'drawable', 'splash.png');
  if (fs.existsSync(oldSplashPng)) {
    fs.unlinkSync(oldSplashPng);
    console.log(`Deleted default splash: ${oldSplashPng}`);
  }
  
  const destSplashPath = path.join(androidResDir, 'drawable', 'splash.jpg');
  fs.copyFileSync(srcSplashPath, destSplashPath);
  console.log(`Copied splash: ${srcSplashPath} -> ${destSplashPath}`);
} else {
  console.warn('Could not find splash_screen file in', srcImagesDir);
}
