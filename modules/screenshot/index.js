const screenshot = require("screenshot-desktop");
const Jimp = require("jimp");
const fs = require("fs");
const util = require('util');
const pixelmatch = require("pixelmatch");

async function hasImageChanged(jimpImage, diskImage, changeThreshold = 0.1) {
    const diskJimpImage = await Jimp.read(diskImage);
    const { width, height } = jimpImage.bitmap;
    const diff = pixelmatch(
        jimpImage.bitmap.data,
        diskJimpImage.bitmap.data,
        null,
        width,
        height,
        { threshold: changeThreshold }
    );
    return diff > 0;
}

async function grabDialog() {
    const img = await screenshot({ format: "png" });
    fs.writeFileSync("out.png", img);
    // Screensize is 1920x1080
    await cropImage(img, 500, 710, 1350 - 500, 850 - 710);
}

async function cropImage(imageStream, x, y, width, height) {
    // Load in the configuration file named config.json
    const config = JSON.parse(fs.readFileSync("config.json"));

    const image = await Jimp.read(imageStream);
    image.crop(x, y, width, height);
    image.contrast(config.contrast);
    const blackAndWhiteImage = extractWhiteText(image, config.whiteThreshold);
    const imageNeedsToBeWritten = await hasImageChanged(blackAndWhiteImage, "output.png", config.changeThreshold);
    if (!imageNeedsToBeWritten) {
        return imageNeedsToBeWritten;
    }
    const writeAsync = util.promisify(image.write.bind(blackAndWhiteImage));
    await writeAsync("output.png");
    console.log("Image written");
    return imageNeedsToBeWritten;
}

function extractWhiteText(image, whiteThreadhold) {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        // Get the RGBA values of the pixel
        const red = this.bitmap.data[idx];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];
        const alpha = this.bitmap.data[idx + 3];

        // Check if the pixel is not white
        if (red < whiteThreadhold && green < whiteThreadhold && blue < whiteThreadhold) {
            // Change the pixel to black
            this.bitmap.data[idx] = 0;
            this.bitmap.data[idx + 1] = 0;
            this.bitmap.data[idx + 2] = 0;
        }
        // Count the number of white pixels
        
    });
    
    return image;
  }

module.exports = { grabDialog };