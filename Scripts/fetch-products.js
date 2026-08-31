// Use native Node.js modules for file system and path operations
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const DATA_FOLDER = "./data";
const OUTPUT_FILE = path.join(DATA_FOLDER, "products.json");

// Google Apps Script Web App
const API_URL =
    "https://script.google.com/macros/s/AKfycbwNQ9fFmV0MqVEKg6pk-x56FsCw-xOnV__A3l6hqrlUVukKyx6gf31DpiO4hn4Vep6U5w/exec?key=products";

/**
 * Fetch products from Google Apps Script and save them to data/products.json.
 *
 * The API directly returns an array of products.
 *
 * Any fatal error is thrown so that the outer catch block can set
 * process.exitCode = 1. This is important when running inside GitHub Actions.
 */
async function fetchAndSaveProducts() {
    console.log(`\nStarting product data fetch from: ${API_URL}`);

    // ---------------------------------------------------------
    // 1. Fetch data from Google Apps Script
    // ---------------------------------------------------------
    let products;

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            redirect: "follow",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} ${response.statusText}`
            );
        }

        products = await response.json();

        console.log("✅ Successfully fetched and parsed API response.");

    } catch (error) {
        throw new Error(
            `Failed to fetch product data: ${error.message}`,
            { cause: error }
        );
    }

    // ---------------------------------------------------------
    // 2. Validate API response
    // ---------------------------------------------------------
    if (!Array.isArray(products)) {
        throw new Error(
            `Invalid API response: expected an array of products but received ${typeof products}.`
        );
    }

    console.log(`Received ${products.length} products from API.`);

    // ---------------------------------------------------------
    // 3. Filter and extract required product fields
    // ---------------------------------------------------------
    products = products
        .filter(
            product =>
                product.name?.length > 4 &&
                product.category?.length > 0 &&
                product.active &&
                product.weight > 0
        )
        .map(product => ({
            id: product.id,
            name: product.name,
            images: product.images
        }));

    console.log(`Products after filtering: ${products.length}`);

    // ---------------------------------------------------------
    // 4. Make sure data folder exists
    // ---------------------------------------------------------
    await mkdir(DATA_FOLDER, {
        recursive: true
    });

    console.log(`✅ Data folder ready: ${DATA_FOLDER}`);

    // ---------------------------------------------------------
    // 5. Write products.json
    // ---------------------------------------------------------
    const jsonString = JSON.stringify(products, null, 2);

    await writeFile(OUTPUT_FILE, jsonString, "utf8");

    console.log(`✅ Products saved successfully: ${OUTPUT_FILE}`);
    console.log("\n--- Product Data Generation Complete ---");
}

// -------------------------------------------------------------
// Main
// -------------------------------------------------------------
try {
    await fetchAndSaveProducts();

} catch (error) {
    console.error("\n========================================");
    console.error("🛑 DATA FETCH / GENERATION FAILED");
    console.error("========================================");

    console.error(`Error: ${error.message}`);

    if (error.cause) {
        console.error(`Cause: ${error.cause.message}`);
    }

    // IMPORTANT FOR GITHUB ACTIONS:
    // Mark the Node.js process as failed.
    process.exitCode = 1;
}