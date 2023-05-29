const screenshot = require("screenshot-desktop");
const Jimp = require("jimp");
const fs = require("fs");
const util = require("util");
const pixelmatch = require("pixelmatch");
const PNG = require("pngjs").PNG;

class ScreenCapture {
  constructor() {
    this.config = {};
    this.loadConfig();
  }

  loadConfig() {
    this.config = JSON.parse(fs.readFileSync("config.json"));
  }
}

async function hasImageChanged(
  jimpImage,
  diskImage,
  changeThreshold = 0.1,
  pixelThreshold = 20,
  outputFile = null
) {
  const diskJimpImage = await Jimp.read(diskImage);
  const { width, height } = jimpImage.bitmap;
  let diffBuffer = null;
  if (outputFile) {
    diffBuffer = new PNG({ width, height });
  }

  const diffPixels = pixelmatch(
    jimpImage.bitmap.data,
    diskJimpImage.bitmap.data,
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

async function grabDialog(useTestImage = false) {
  // Load in the configuration file named config.json{
  const config = JSON.parse(fs.readFileSync("config.json"));
  const img = useTestImage
    ? fs.readFileSync("test/typicalDialog2.png")
    : await screenshot({ format: "png" });
  fs.writeFileSync("out.png", img);
  fs.writeFileSync(`out-${new Date().getTime()}.png`, img);
  // Screen size is 1920x1080
  const hasMarker = await findDialogMarker(img, config);
  if (!hasMarker) {
    console.log("No marker found");
    return false;
  }

  return await cropImage(img, 500, 710, 1350 - 500, 850 - 710, config);
}

async function findDialogMarker(imageStream, config) {
  // Marker near the right of the bottom dialog area
  const image = await Jimp.read(imageStream);
  image.crop(1435, 800, 25, 40);
  image.contrast(0.5);
  const blackAndWhiteImage = extractWhiteText(image, 200);
  const writeAsync = util.promisify(image.write.bind(blackAndWhiteImage));
  // timestamp should be a epoch timestamp
  const timestamp = new Date().getTime();
  await writeAsync(`marker.png`);

  // There are marker-1.png through marker-14.png that we can attempt to find a match for
  // using hasImageChanged let's loop through and break when we find a match
  for (let i = 1; i <= 14; i++) {
    const match = await hasImageChanged(
      blackAndWhiteImage,
      `marker-${i}.png`,
      config.markerChangeThreshold,
      "diff.png"
    );
    if ( match ) {
      // console.log(`Found a match for marker-${i}.png`);
      return true;
    }
  }
  return false;
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

async function cropImage(imageStream, x, y, width, height, config) {
  const image = await Jimp.read(imageStream);
  image.crop(x, y, width, height);
  image.contrast(config.contrast);
  const blackAndWhiteImage = extractWhiteText(image, config.whiteThreshold);
  // Check to see if output.png exists on disk
  // If it does then compare the two images
  let imageNeedsToBeWritten = true;
  if (fs.existsSync("output.png")) {
    imageNeedsToBeWritten = await hasImageChanged(
      blackAndWhiteImage,
      "output.png",
      config.changeThreshold
    );
    if (!imageNeedsToBeWritten) {
      return imageNeedsToBeWritten;
    }
  }
  const writeAsync = util.promisify(image.write.bind(blackAndWhiteImage));
  await writeAsync("output.png");
  console.log("Image written");
  return imageNeedsToBeWritten;
}

function extractWhiteText(image, whiteThreadhold) {
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
        red < whiteThreadhold &&
        green < whiteThreadhold &&
        blue < whiteThreadhold
      ) {
        // Change the pixel to black
        this.bitmap.data[idx] = 0;
        this.bitmap.data[idx + 1] = 0;
        this.bitmap.data[idx + 2] = 0;
      }
      // Count the number of white pixels
    }
  );

  return image;
}

module.exports = { grabDialog };
