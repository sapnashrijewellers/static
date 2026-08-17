import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const PRODUCTS_FILE = path.join('./data/products.json');
const OPTIMIZED_IMG_DIR = path.join('./img/products/optimized');

const MISSING_FILE = path.join('./data/missing-product-images.txt');
const EXTRA_FILE = path.join('./data/extra-product-images.txt');


// --------------------------------------------------
// Helpers
// --------------------------------------------------

function fail(message) {
    console.error(`\n❌ ERROR: ${message}`);
    process.exit(1);
}


/**
 * Normalize the "images" attribute.
 *
 * Supports:
 *
 * 1. Array:
 *
 * images: [
 *   "abc.webp",
 *   "xyz.webp"
 * ]
 *
 * 2. Multiline string:
 *
 * images: "abc.webp
 *
 * xyz.webp
 * "
 *
 * IMPORTANT:
 * We split ONLY on newline.
 * Spaces inside filenames are preserved.
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
    console.log('        Product Image Checker');
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
            fail(`products.json exists but is not a file.`);
        }
    } catch (error) {

        if (error.code === 'ENOENT') {
            fail(
                `products.json not found:\n${path.resolve(PRODUCTS_FILE)}`
            );
        }

        fail(
            `Unable to access products.json:\n${error.message}`
        );
    }

    console.log('✅ products.json found');


    // --------------------------------------------------
    // Check optimized directory
    // --------------------------------------------------

    console.log('\nChecking optimized image directory...');

    try {
        const stat = await fs.stat(OPTIMIZED_IMG_DIR);

        if (!stat.isDirectory()) {
            fail(
                `Optimized image path exists but is not a directory:\n${path.resolve(OPTIMIZED_IMG_DIR)}`
            );
        }

    } catch (error) {

        if (error.code === 'ENOENT') {
            fail(
                `Optimized image directory not found:\n${path.resolve(OPTIMIZED_IMG_DIR)}`
            );
        }

        fail(
            `Unable to access optimized image directory:\n${error.message}`
        );
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
        fail(
            `Unable to read/parse products.json:\n${error.message}`
        );
    }

    if (!Array.isArray(products)) {
        fail(
            'products.json must contain an array of products.'
        );
    }

    console.log(`✅ ${products.length} products loaded`);


    // --------------------------------------------------
    // Collect product image references
    // --------------------------------------------------

    console.log('\nCollecting product image references...');

    const referencedImages = new Set();

    for (const product of products) {

        if (!product || typeof product !== 'object') {
            continue;
        }

        const images = normalizeImages(
            product.images,
            product.id ?? 'unknown'
        );

        for (const image of images) {
            referencedImages.add(image);
        }
    }

    console.log(
        `✅ ${referencedImages.size} unique image references found`
    );


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
        fail(
            `Unable to read optimized image directory:\n${error.message}`
        );
    }

    const actualImages = directoryEntries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);

    console.log(
        `✅ ${actualImages.length} files found in optimized directory`
    );


    // --------------------------------------------------
    // Compare
    // --------------------------------------------------

    const actualImageSet = new Set(actualImages);


    // Images referenced by products but missing from disk

    const missingImages = [...referencedImages]
        .filter(image => !actualImageSet.has(image))
        .sort((a, b) => a.localeCompare(b));


    // Files on disk but not referenced by products

    const extraImages = actualImages
        .filter(image => !referencedImages.has(image))
        .sort((a, b) => a.localeCompare(b));


    // --------------------------------------------------
    // Write missing report
    // --------------------------------------------------

    await fs.writeFile(
        MISSING_FILE,
        missingImages.length > 0
            ? `${missingImages.join('\n')}\n`
            : '',
        'utf8'
    );


    // --------------------------------------------------
    // Write extra report
    // --------------------------------------------------

    await fs.writeFile(
        EXTRA_FILE,
        extraImages.length > 0
            ? `${extraImages.join('\n')}\n`
            : '',
        'utf8'
    );


    // --------------------------------------------------
    // Summary
    // --------------------------------------------------

    console.log('\n==============================================');
    console.log('                 RESULT');
    console.log('==============================================');

    console.log(`Products              : ${products.length}`);
    console.log(`Referenced images     : ${referencedImages.size}`);
    console.log(`Images on disk        : ${actualImages.length}`);
    console.log(`Missing images        : ${missingImages.length}`);
    console.log(`Extra images          : ${extraImages.length}`);

    console.log('\nReports:');
    console.log(`Missing: ${path.resolve(MISSING_FILE)}`);
    console.log(`Extra  : ${path.resolve(EXTRA_FILE)}`);


    // --------------------------------------------------
    // Show missing images
    // --------------------------------------------------

    if (missingImages.length > 0) {

        console.log('\n❌ Missing images:');

        for (const image of missingImages) {
            console.log(`   ${image}`);
        }

    } else {

        console.log('\n✅ All product images exist.');
    }


    // --------------------------------------------------
    // Show extra images
    // --------------------------------------------------

    if (extraImages.length > 0) {

        console.log('\n⚠️ Extra/unreferenced images:');

        for (const image of extraImages) {
            console.log(`   ${image}`);
        }

    } else {

        console.log('\n✅ No extra images found.');
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