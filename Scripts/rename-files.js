import fs from 'fs/promises';
import path from 'path';

const IMG_DIR = './img/products/thumbnail/';

function generateImageSlug(name) {
    const slug = String(name)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug;
}

async function renameImages() {

    console.log(`Renaming files in: ${path.resolve(IMG_DIR)}`);

    const files = await fs.readdir(IMG_DIR, {
        withFileTypes: true
    });

    const imageFiles = files.filter(file =>
        file.isFile()
    );

    console.log(`Found ${imageFiles.length} files.`);

    for (const file of imageFiles) {

        const oldName = file.name;

        const extension = path.extname(oldName);
        const baseName = path.basename(oldName, extension);

        const newBaseName = generateImageSlug(baseName);
        const newName = `${newBaseName}${extension.toLowerCase()}`;

        if (oldName === newName) {
            console.log(`SKIP: ${oldName}`);
            continue;
        }

        const oldPath = path.join(IMG_DIR, oldName);
        const newPath = path.join(IMG_DIR, newName);

        // Prevent accidental overwrite
        try {
            await fs.access(newPath);

            console.log(
                `⚠️ SKIP (destination exists): ${oldName} → ${newName}`
            );

            continue;

        } catch {
            // Destination doesn't exist — safe to rename
        }

        await fs.rename(oldPath, newPath);

        console.log(`✅ ${oldName} → ${newName}`);
    }

    console.log('\nRename completed.');
}

renameImages().catch(error => {
    console.error('\n❌ Rename failed:');
    console.error(error);
    process.exit(1);
});