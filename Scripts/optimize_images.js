import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// --- ESM __dirname workaround ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const IMG_DIR = path.join("./img/products/");
const OPTIMIZED_IMG_DIR = path.join(IMG_DIR, "optimized");
const THUMBNAIL_DIR = path.join(IMG_DIR, "thumbnail");
const TRACKER_FILE = path.join(IMG_DIR, "optimized_images.json");

console.log("Image directory:", IMG_DIR);
console.log("Optimized directory:", OPTIMIZED_IMG_DIR);
console.log("Thumbnail directory:", THUMBNAIL_DIR);

/**
 * Create SVG watermark buffer dynamically based on image width
 */
function createWatermarkSVG(width, height) {
    const fontSize = Math.max(Math.round(width * 0.03), 18); // responsive font
    const padding = Math.round(fontSize * 0.8);

    return Buffer.from(`
    <svg width="${width}" height="${height}">
      <text
        x="50%"
        y="${height - padding}"
        text-anchor="middle"
        font-size="${fontSize}"
        fill="white"
        fill-opacity="0.45"
        font-family="Arial, Helvetica, sans-serif"
        style="letter-spacing: 1px;"
      >
        Sapna Shri Jewellers
      </text>
    </svg>
  `);
}

/**
 * Reads the list of already optimized image filenames from the tracker file.
 * @returns {Promise<Set<string>>} A Set of optimized filenames.
 */
async function getOptimizedTracker() {
    try {
        const data = await fs.readFile(TRACKER_FILE, "utf8");
        const list = JSON.parse(data);
        return new Set(list);
    } catch (error) {
        if (error.code === "ENOENT") return new Set();
        console.error("Error reading tracker file:", error.message);
        return new Set();
    }
}

/**
 * Writes the tracker file.
 */
async function updateOptimizedTracker(trackerSet) {
    const list = Array.from(trackerSet);
    await fs.writeFile(TRACKER_FILE, JSON.stringify(list, null, 2), "utf8");
}

/**
 * Optimize a single image into WebP format if not already processed.
 */
async function optimizeImage(inputPath, filename, trackerSet) {
    if (trackerSet.has(filename)) return;

    const ext = path.extname(filename).toLowerCase();
    if (ext === ".webp") return;

    const baseName = path.parse(filename).name;
    const outputPath = path.join(OPTIMIZED_IMG_DIR, `${baseName}.webp`);

    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        const watermarkSVG = createWatermarkSVG(
            metadata.width,
            metadata.height
        );

        await image
            .composite([{ input: watermarkSVG }])
            .webp({ quality: 80 })
            .toFile(outputPath);

        console.log(`✅ Optimized + Watermarked: ${filename}`);
        trackerSet.add(filename);
    } catch (error) {
        console.error(`❌ Failed to optimize ${filename}:`, error.message);
    }
}

/**
 * Create a 400x400 thumbnail maintaining aspect ratio.
 */
async function createThumbnail(inputPath, filename) {
  const baseName = path.parse(filename).name;
  const thumbPath = path.join(THUMBNAIL_DIR, `${baseName}.webp`);

  try {
    // 1️⃣ Resize first and materialize
    const resizedBuffer = await sharp(inputPath)
      .resize(400, 400, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    // 2️⃣ Read metadata from resized image
    const resizedImage = sharp(resizedBuffer);
    const metadata = await resizedImage.metadata();

    // 3️⃣ Create watermark matching resized dimensions
    const watermarkSVG = createWatermarkSVG(
      metadata.width,
      metadata.height
    );

    // 4️⃣ Composite watermark safely
    await resizedImage
      .composite([{ input: watermarkSVG }])
      .webp({ quality: 80 })
      .toFile(thumbPath);

    console.log(`🖼️ Thumbnail + Watermark: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to create thumbnail for ${filename}:`, error.message);
  }
}

/**
 * Main optimization logic.
 */
async function runOptimization() {
    console.log(`--- Starting Image Optimization at ${new Date().toISOString()} ---`);

    await fs.mkdir(OPTIMIZED_IMG_DIR, { recursive: true });
    await fs.mkdir(THUMBNAIL_DIR, { recursive: true });

    const trackerSet = await getOptimizedTracker();
    console.log(`Tracker currently has ${trackerSet.size} entries.`);

    const files = await fs.readdir(IMG_DIR, { withFileTypes: true });
    const imageFiles = files
        .filter(
            (f) =>
                f.isFile() &&
                !f.name.startsWith(".") &&
                !f.name.endsWith(".webp") &&
                !f.name.endsWith(path.basename(TRACKER_FILE)) &&
                ["jpg", "jpeg", "png", "gif"].includes(
                    path.extname(f.name).slice(1).toLowerCase()
                )
        )
        .map((f) => f.name);

    console.log(`Found ${imageFiles.length} image files to process.`);

    let processedCount = 0;
    for (const file of imageFiles) {
        const fullPath = path.join(IMG_DIR, file);

        if (!trackerSet.has(file)) {
            await optimizeImage(fullPath, file, trackerSet);
            processedCount++;
        }

        // Always create/update thumbnail
        await createThumbnail(fullPath, file);
    }

    await updateOptimizedTracker(trackerSet);

    console.log(
        `--- Optimization complete. Processed ${processedCount} new images. Tracker now has ${trackerSet.size} entries. ---`
    );
}

// Execute
runOptimization().catch(console.error);
