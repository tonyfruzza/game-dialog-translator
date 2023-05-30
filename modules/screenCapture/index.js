const screenshot = require("screenshot-desktop");
const Jimp = require("jimp");
const fs = require("fs");
const path = require("path");
const util = require("util");
const pixelmatch = require("pixelmatch");
const PNG = require("pngjs").PNG;

class ScreenCapture {
  constructor() {
    this.config = {};
    this.loadConfig();
    this.directoryPath = path.join(__dirname, "../../test/screencaps");
    this.testScreenshotIndex = 0;
    this.testScreenshotNames = [];
    this.testScreenshots = this.generateListOfTestScreenshots();
    this.lastDialog = null;
    this.markerRefs = [];
  }

  loadConfig() {
    this.config = JSON.parse(fs.readFileSync("config.json"));
  }

  // Load the marker image into memory using Jimp
  async initMarkerRefs() {
    for (let i = 1; i <= 14; i++) {
      this.markerRefs[i] = await Jimp.read(
        path.join(__dirname, "../../reference_images/dialog", `marker-${i}.png`)
      );
    }
  }

  generateListOfTestScreenshots() {
    this.testScreenshotNames = fs.readdirSync(this.directoryPath);
    // For each of the files map the directoryPath + filename and return
    return this.testScreenshotNames.map((file) =>
      path.join(this.directoryPath, file)
    );
  }

  getTestScreenshotFilename() {
    const screenshot = this.testScreenshots[this.testScreenshotIndex];
    this.testScreenshotIndex =
      (this.testScreenshotIndex + 1) % this.testScreenshots.length;
    return screenshot;
  }

  // Returns cropped image of dialog area or false if no dialog area is found
  async grabDialog(useTestImage = false) {
    const img = useTestImage
      ? fs.readFileSync(this.getTestScreenshotFilename())
      : await screenshot({ format: "png" });
    // For debugging purposes
    fs.writeFileSync("out.png", img);

    // Check to see if the dialog marker is present
    const jimpImage = await Jimp.read(img);
    const jimpImageClone = jimpImage.clone();
    const hasMarker = await this.findDialogMarker(jimpImage);

    if (!hasMarker) {
      if (useTestImage) {
        console.log(
          `No marker found in test image: ${
            this.testScreenshotNames[this.testScreenshotIndex]
          }`
        );
        return false;
      }
      return false;
    }

    return await this.cropDialogArea(
      jimpImageClone,
      500,
      710,
      1350 - 500,
      850 - 710
    );
  }

  async hasImageChanged(
    image1,
    image2,
    changeThreshold = 0.1,
    pixelThreshold = 20,
    outputFile = null
  ) {
    const { width, height } = image1.bitmap;
    const diffBuffer = outputFile ? new PNG({ width, height }) : null;

    const diffPixels = pixelmatch(
      image1.bitmap.data,
      image2.bitmap.data,
      outputFile ? diffBuffer.data : null,
      width,
      height,
      { threshold: changeThreshold }
    );

    if (outputFile) {
      fs.writeFileSync(outputFile, PNG.sync.write(diffBuffer));
    }
    return diffPixels < 20;
  }

  async cropDialogArea(jimpImage, x, y, width, height) {
    jimpImage.crop(x, y, width, height);
    jimpImage.contrast(this.config.contrast);
    const highContrastImage = this.binaryFilter(
      jimpImage,
      this.config.whiteThreshold
    );
    // Check to see if output.png exists on disk
    // If it does then compare the two images
    let imageNeedsToBeWritten = true;
    if (this.lastDialog) {
      console.log("Comparing images");
      imageNeedsToBeWritten = await this.hasImageChanged(
        highContrastImage,
        this.lastDialog,
        this.config.changeThreshold,
        "text-diff.png"
      );
      if (!imageNeedsToBeWritten) {
        return imageNeedsToBeWritten;
      }
    }
    this.lastDialog = highContrastImage;
    const writeAsync = util.promisify(jimpImage.write.bind(highContrastImage));
    await writeAsync("output.png");
    console.log("Image written");
    return imageNeedsToBeWritten;
  }

  async findDialogMarker(jimpImage) {
    // Check to see if the marker refs have been loaded and initialize them if not
    if (this.markerRefs.length === 0) {
      await this.initMarkerRefs();
    }
    // Marker near the right of the bottom dialog area
    jimpImage.crop(1435, 800, 25, 40);
    jimpImage.contrast(0.5);
    const binaryFilterImage = this.binaryFilter(jimpImage, 200);
    const writeAsync = util.promisify(jimpImage.write.bind(binaryFilterImage));
    await writeAsync(`marker.png`);

    // There are marker-1.png through marker-14.png that we can attempt to find a match for
    // using hasImageChanged let's loop through and break when we find a match
    for (let i = 1; i <= 14; i++) {
      const match = await this.hasImageChanged(
        binaryFilterImage,
        this.markerRefs[i],
        this.config.markerChangeThreshold,
        "diff.png"
      );
      if (match) {
        // console.log(`Found a match for marker-${i}.png`);
        return true;
      }
    }
    return false;
  }

  binaryFilter(image, whiteThreshold) {
    image.scan(
      0,
      0,
      image.bitmap.width,
      image.bitmap.height,
      function (x, y, idx) {
        // Get the RGBA values of the pixel
        const red = this.bitmap.data[idx];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];
        const alpha = this.bitmap.data[idx + 3];

        // Check if the pixel is not white
        if (
          red < whiteThreshold &&
          green < whiteThreshold &&
          blue < whiteThreshold
        ) {
          // Change the pixel to black
          this.bitmap.data[idx] = 0;
          this.bitmap.data[idx + 1] = 0;
          this.bitmap.data[idx + 2] = 0;
        }
      }
    );

    return image;
  }
}

function printImageHexValues(image) {
  for (let y = 0; y < image.bitmap.height; y++) {
    let line = "";
    for (let x = 0; x < image.bitmap.width; x++) {
      const { r, g, b, a } = Jimp.intToRGBA(image.getPixelColor(x, y));
      // print the hex values with padding of 2 characters
      line += `${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")} `;
    }
    console.log(line);
  }
}

exports.ScreenCapture = ScreenCapture;
