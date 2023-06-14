const dotenv = require("dotenv");
const { createWorker } = require("tesseract.js");
const { ScreenCapture } = require("./modules/screenCapture");
const { writeHTMLFormattedDialogs } = require("./modules/display");
const { Translate } = require("./modules/translator");
const yargs = require("yargs");

const argv = yargs
  .options({
    test: {
      description: "test the program",
      alias: "t",
    },
  })
  .help()
  .alias("help", "h")
  .parseSync(process.argv.slice(1));

dotenv.config();

async function main() {
  // initialize systems
  const worker = await createWorker();
  await worker.loadLanguage("jpn");
  await worker.initialize("jpn");
  let lastJapaneseText = "";
  const translation = [];
  const openai = new Translate();
  const screenCapture = new ScreenCapture();

  while (true) {
    const imageSaved = await screenCapture.grabDialog(argv.test);
    // If the image is not saved then continue except if the lastJapaneseText is empty
    if (!imageSaved && lastJapaneseText !== "") {
      // console.log("Image not saved");
      continue;
    }
    const {
      data: { text },
    } = await worker.recognize("output.png");
    if (text === lastJapaneseText || text === undefined) {
      continue;
    }
    lastJapaneseText = text;
    console.log(lastJapaneseText);
    continue;
    // Translate using translate(openai, lastJapaneseText) and append to translation
    const content = await openai.translate(lastJapaneseText);
    // If lastJapaneseText contains the word "incomprehensible" then continue
    if (content.includes("ncomprehensible")) {
      console.log("Unable to translate: " + lastJapaneseText);
      continue;
    }
    // console.log(content);
    translation.push({ role: "unknown", content });
    // Print the last 3 translations
    writeHTMLFormattedDialogs(translation.slice(-2));
  }
  await worker.terminate();
}

async function getJapaneseCharacters(worker) {
  return text;
}

main();
