import fs from 'fs/promises';
import path from 'path';

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const PRODUCTS_FILE = './data/products.json';
const OPTIMIZED_IMG_DIR = './img/products/optimized';

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function fail(message) {
    console.error(`\n❌ ERROR: ${message}`);
    process.exit(1);
}

/**
 * Strips extension, trims, and converts to lowercase.
 * e.g., "  Product-A.WEBP  " -> "product-a"
 */
function normalizeBaseName(filename) {
    if (!filename) return '';
    const parsed = path.parse(String(filename).trim());
    return parsed.name.trim().toLowerCase();
}

/**
 * Normalize the "images" attribute.
 */
function normalizeImages(images, productId) {
    if (images == null) {
        return [];
    }

    let imageList;

    if (Array.isArray(images)) {
        imageList = images;
    } else if (typeof images === 'string') {
        imageList = images.split(/\r?\n/);
    } else {
        console.warn(
            `⚠️ Product ${productId} has invalid "images" value.`
        );
        return [];
    }

    return imageList
        .map(image => String(image).trim())
        .filter(image => image.length > 0);
}

// --------------------------------------------------
// Main
// --------------------------------------------------

async function checkProductImages() {
    console.log('==============================================');
    console.log('         Product Image Checker');
    console.log('==============================================');

    console.log('\nProducts file:');
    console.log(path.resolve(PRODUCTS_FILE));

    console.log('\nOptimized image directory:');
    console.log(path.resolve(OPTIMIZED_IMG_DIR));

    // --------------------------------------------------
    // Check products.json
    // --------------------------------------------------

    console.log('\nChecking products.json...');

    try {
        const stat = await fs.stat(PRODUCTS_FILE);
        if (!stat.isFile()) {
            fail('products.json exists but is not a file.');
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            fail(`products.json not found:\n${path.resolve(PRODUCTS_FILE)}`);
        }
        fail(`Unable to access products.json:\n${error.message}`);
    }

    console.log('✅ products.json found');

    // --------------------------------------------------
    // Check optimized directory
    // --------------------------------------------------

    console.log('\nChecking optimized image directory...');

    try {
        const stat = await fs.stat(OPTIMIZED_IMG_DIR);
        if (!stat.isDirectory()) {
            fail(`Optimized image path exists but is not a directory:\n${path.resolve(OPTIMIZED_IMG_DIR)}`);
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            fail(`Optimized image directory not found:\n${path.resolve(OPTIMIZED_IMG_DIR)}`);
        }
        fail(`Unable to access optimized image directory:\n${error.message}`);
    }

    console.log('✅ optimized directory found');

    // --------------------------------------------------
    // Read products.json
    // --------------------------------------------------

    console.log('\nReading products.json...');

    let products;

    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
        products = JSON.parse(data);
    } catch (error) {
        fail(`Unable to read/parse products.json:\n${error.message}`);
    }

    if (!Array.isArray(products)) {
        fail('products.json must contain an array of products.');
    }

    console.log(`✅ ${products.length} products loaded`);

    // --------------------------------------------------
    // Collect product image references
    // --------------------------------------------------

    console.log('\nCollecting product image references...');

    // Map: normalizedBaseName -> Set of original reference names
    const referencedByBaseName = new Map();
    let totalReferenceCount = 0;

    for (const product of products) {
        if (!product || typeof product !== 'object') {
            continue;
        }

        const images = normalizeImages(
            product.images,
            product.id ?? 'unknown'
        );

        for (const image of images) {
            totalReferenceCount++;
            const baseKey = normalizeBaseName(image);
            if (!baseKey) continue;

            if (!referencedByBaseName.has(baseKey)) {
                referencedByBaseName.set(baseKey, new Set());
            }
            referencedByBaseName.get(baseKey).add(image);
        }
    }

    console.log(`✅ ${totalReferenceCount} image references (${referencedByBaseName.size} unique base names) found`);

    // --------------------------------------------------
    // Read optimized directory
    // --------------------------------------------------

    console.log('\nReading optimized image directory...');

    let directoryEntries;

    try {
        directoryEntries = await fs.readdir(
            OPTIMIZED_IMG_DIR,
            { withFileTypes: true }
        );
    } catch (error) {
        fail(`Unable to read optimized image directory:\n${error.message}`);
    }

    const actualFiles = directoryEntries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);

    // Map: normalizedBaseName -> Set of actual disk filenames
    const actualByBaseName = new Map();

    for (const file of actualFiles) {
        const baseKey = normalizeBaseName(file);
        if (!baseKey) continue;

        if (!actualByBaseName.has(baseKey)) {
            actualByBaseName.set(baseKey, new Set());
        }
        actualByBaseName.get(baseKey).add(file);
    }

    console.log(`✅ ${actualFiles.length} files (${actualByBaseName.size} unique base names) found in optimized directory`);

    // --------------------------------------------------
    // Compare base names
    // --------------------------------------------------

    // Base names referenced in JSON but not present on disk
    const missingImages = [];
    for (const [baseKey, originalRefs] of referencedByBaseName.entries()) {
        if (!actualByBaseName.has(baseKey)) {
            missingImages.push(...originalRefs);
        }
    }
    missingImages.sort((a, b) => a.localeCompare(b));

    // Files on disk whose base names are not referenced in JSON
    const extraImages = [];
    for (const [baseKey, actualDiskFiles] of actualByBaseName.entries()) {
        if (!referencedByBaseName.has(baseKey)) {
            extraImages.push(...actualDiskFiles);
        }
    }
    extraImages.sort((a, b) => a.localeCompare(b));

    // --------------------------------------------------
    // Result
    // --------------------------------------------------

    console.log('\n==============================================');
    console.log('                 RESULT');
    console.log('==============================================');

    console.log(`Products              : ${products.length}`);
    console.log(`Referenced images     : ${totalReferenceCount}`);
    console.log(`Images on disk        : ${actualFiles.length}`);
    console.log(`Missing images        : ${missingImages.length}`);
    console.log(`Extra images          : ${extraImages.length}`);

    // --------------------------------------------------
    // Missing images
    // --------------------------------------------------

    if (missingImages.length > 0) {
        console.error('\n❌ MISSING IMAGES (no matching base name on disk):');
        for (const image of missingImages) {
            console.error(`   ${image}`);
        }
    } else {
        console.log('\n✅ All product images exist.');
    }

    // --------------------------------------------------
    // Extra images
    // --------------------------------------------------

    if (extraImages.length > 0) {
        console.warn('\n⚠️ EXTRA / UNREFERENCED IMAGES (no matching base name in JSON):');
        for (const image of extraImages) {
            console.warn(`   ${image}`);
        }
    } else {
        console.log('\n✅ No extra images found.');
    }

    // --------------------------------------------------
    // Exit status
    // --------------------------------------------------

    if (missingImages.length > 0 || extraImages.length > 0) {
        console.error(`\n❌ Image check failed: ${missingImages.length} missing image(s), ${extraImages.length} extra image(s). Please review the above list(s) and fix the issues.`);
        process.exit(1);
    }

    console.log('\n==============================================');
    console.log('             Check completed');
    console.log('==============================================\n');
}

// --------------------------------------------------
// Execute
// --------------------------------------------------

console.log('Starting check-product-images.js...');

checkProductImages().catch(error => {
    console.error('\n❌ Unexpected error:');
    console.error(error);
    process.exit(1);
});