const { Configuration, OpenAIApi } = require("openai");
const dotenv = require("dotenv");
const screenshot = require("screenshot-desktop");
const Jimp = require("jimp");
const { createWorker } = require("tesseract.js");
const fs = require("fs");

dotenv.config();

function initOpenAi() {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  });
  const openai = new OpenAIApi(configuration);
  return openai;
}

async function grabDialog() {
  const img = await screenshot({ format: "png" });
  fs.writeFileSync("out.png", img);
  // screen resolution is 2055, 1328
  // but the screen grab is 4112 x 2658
  cropImage("out.png", 336 * 2, 970 * 2, 847 * 2, 114 * 2);
}

function cropImage(imageName, x, y, width, height) {
  Jimp.read(imageName)
    .then((image) => {
      image
        .crop(x, y, width, height) // crop
        .write("output.png"); // save
    })
    .catch((err) => {
      console.error(err);
    });
}

async function main() {
  // initialize systems
  const openai = initOpenAi();
  const worker = await createWorker();
  await worker.loadLanguage("jpn");
  await worker.initialize("jpn");
  let lastJapaneseText = "";

  while (true) {
    await grabDialog();
    //   const japaneseText = await getJapaneseCharacters();
    const {
      data: { text },
    } = await worker.recognize("output.png");

    if (text === lastJapaneseText || text === undefined) {
      continue;
    }
    lastJapaneseText = text;
    // If lastJapaneseText contains the word "incomprehensible" then continue
    if (lastJapaneseText.includes("incomprehensible")) {
      continue;
    }
    console.log(await translate(openai, lastJapaneseText));
  }
  await worker.terminate();
}

async function translate(openai, text) {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    // Default role as the computer is named assistant
    // Token limit is 4096 per API call (both input and output combined)
    messages: [
      {
        role: "assistant",
        content:
          "I am a Japanese to English translator for the game Yo-Kai Watch 4. Provide me the dialog snippets to be translated to English. When the text provided is not translatable I'll just say 'incomprehensible'",
      },
      {
        role: "user",
        content: text,
      },
    ],
    max_tokens: 2048,
    temperature: 1, // lower numbers have less randomness
  });
  //   console.log(completion.data.choices[0]);
  return completion.data.choices[0].message.content;
}

async function getJapaneseCharacters(worker) {
  return text;
}

main();
