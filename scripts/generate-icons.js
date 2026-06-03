import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const STATIC_DIR = 'static';
const TEMP_DIR = 'tmp';

// Make sure output and temp directories exist
if (!fs.existsSync(STATIC_DIR)) {
    fs.mkdirSync(STATIC_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const faviconSvgPath = path.join(STATIC_DIR, 'favicon.svg');
if (!fs.existsSync(faviconSvgPath)) {
    console.error(`Error: ${faviconSvgPath} not found!`);
    process.exit(1);
}

const svgContent = fs.readFileSync(faviconSvgPath, 'utf-8');

// Create a version of the SVG that forces light theme style
const lightSvgContent = svgContent.replace(
    /<style>[\s\S]*?<\/style>/,
    `<style>.logo-light { display: block; } .logo-dark { display: none; }</style>`
);
const tempLightPath = path.join(TEMP_DIR, 'temp-light.svg');
fs.writeFileSync(tempLightPath, lightSvgContent);

// Create a version of the SVG that forces dark theme style
const darkSvgContent = svgContent.replace(
    /<style>[\s\S]*?<\/style>/,
    `<style>.logo-light { display: none; } .logo-dark { display: block; }</style>`
);
const tempDarkPath = path.join(TEMP_DIR, 'temp-dark.svg');
fs.writeFileSync(tempDarkPath, darkSvgContent);

try {
    console.log('Generating favicon-16x16.png...');
    execSync(`convert -background none "${tempLightPath}" -resize 16x16 "${path.join(STATIC_DIR, 'favicon-16x16.png')}"`);

    console.log('Generating favicon-32x32.png...');
    execSync(`convert -background none "${tempLightPath}" -resize 32x32 "${path.join(STATIC_DIR, 'favicon-32x32.png')}"`);

    console.log('Generating favicon.ico (multi-resolution)...');
    execSync(`convert -background none "${tempLightPath}" -define icon:auto-resize=16,32,48 "${path.join(STATIC_DIR, 'favicon.ico')}"`);

    console.log('Generating apple-touch-icon.png (180x180, dark background)...');
    execSync(`convert -background none "${tempDarkPath}" -resize 130x130 -gravity center -background "#1b1715" -extent 180x180 "${path.join(STATIC_DIR, 'apple-touch-icon.png')}"`);

    console.log('Generating apple-touch-icon-precomposed.png...');
    fs.copyFileSync(
        path.join(STATIC_DIR, 'apple-touch-icon.png'),
        path.join(STATIC_DIR, 'apple-touch-icon-precomposed.png')
    );

    console.log('Generating apple-touch-icon-120x120.png (120x120, dark background)...');
    execSync(`convert -background none "${tempDarkPath}" -resize 86x86 -gravity center -background "#1b1715" -extent 120x120 "${path.join(STATIC_DIR, 'apple-touch-icon-120x120.png')}"`);

    console.log('Generating apple-touch-icon-120x120-precomposed.png...');
    fs.copyFileSync(
        path.join(STATIC_DIR, 'apple-touch-icon-120x120.png'),
        path.join(STATIC_DIR, 'apple-touch-icon-120x120-precomposed.png')
    );

    console.log('Generating android-chrome-192x192.png (192x192, dark background)...');
    execSync(`convert -background none "${tempDarkPath}" -resize 140x140 -gravity center -background "#1b1715" -extent 192x192 "${path.join(STATIC_DIR, 'android-chrome-192x192.png')}"`);

    console.log('Generating android-chrome-512x512.png (512x512, dark background)...');
    execSync(`convert -background none "${tempDarkPath}" -resize 380x380 -gravity center -background "#1b1715" -extent 512x512 "${path.join(STATIC_DIR, 'android-chrome-512x512.png')}"`);

    console.log('All icons generated successfully!');
} catch (error) {
    console.error('Error during icon generation:', error.message);
} finally {
    // Clean up temporary files
    if (fs.existsSync(tempLightPath)) fs.unlinkSync(tempLightPath);
    if (fs.existsSync(tempDarkPath)) fs.unlinkSync(tempDarkPath);
}
