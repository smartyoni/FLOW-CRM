import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    console.log('Building Vite app...');
    execSync('npx vite build', { stdio: 'inherit', cwd: path.resolve(__dirname, '..'), windowsHide: true });

    console.log('Copying index.html to 404.html...');
    const distPath = path.resolve(__dirname, '../dist');
    const indexPath = path.join(distPath, 'index.html');
    const notFoundPath = path.join(distPath, '404.html');

    if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
        console.log('✅ Copied index.html to 404.html');
    } else {
        throw new Error('index.html not found in dist. Build might have failed.');
    }

    console.log('Deploying to gh-pages...');
    execSync('npx gh-pages -d dist', { stdio: 'inherit', cwd: path.resolve(__dirname, '..'), windowsHide: true });

    console.log('✅ Deployment successful!');
} catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
}
