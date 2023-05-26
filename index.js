const { Configuration, OpenAIApi } = require("openai");
const dotenv = require("dotenv");
const { createWorker } = require("tesseract.js");
const fs = require("fs");
const screenshot = require("./modules/screenshot");

dotenv.config();

function initOpenAi() {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
  });
  const openai = new OpenAIApi(configuration);
  return openai;
}

function writeHTMLFormattedDialogs(dialogs) {
  // Write at the header to auto refresh the page
  const htmlHeader = `<!DOCTYPE html>
  <html lang="en">
  
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="1">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yo-Kai Watch 4 Translation</title>
  </head>
  <script type="text/javascript">
    function autoRefreshPage() {
        window.location.reload();
    }
    setTimeout('autoRefreshPage()', 1000);
  </script>
  
  <body bgcolor=#00ff00 text=#FFFFFF><font size="+2"`;
  // fs.writeFileSync("dialogs.html", );
  const html = dialogs
    .map((dialog) => {
      const { role, content } = dialog;
      return `<p><!--<b>${role}:</b> -->${content}</p>`;
    })
    .join("\n");
  fs.writeFileSync("dialogs.html", htmlHeader + html);
}

async function main() {
  // initialize systems
  const openai = initOpenAi();
  const worker = await createWorker();
  await worker.loadLanguage("jpn");
  await worker.initialize("jpn");
  let lastJapaneseText = "";
  const translation = [];

  while (true) {
    const imageSaved = await screenshot.grabDialog();
    // If the image is not saved then continue except if the lastJapaneseText is empty
    // if (!imageSaved && lastJapaneseText !== "") {
    //   console.log("Image not saved");
    //   continue;
    // }
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
    const content = await translate(openai, lastJapaneseText);
    // If lastJapaneseText contains the word "incomprehensible" then continue 
    if (content.includes("ncomprehensible")) {
      console.log("Unable to translate: " + lastJapaneseText);
      continue;
    }
    // console.log(content);
    translation.push({role: "unknown", content });
    // Print the last 3 translations
    writeHTMLFormattedDialogs(translation.slice(-2));
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
          "I am a Japanese to English translator for the game Yo-Kai Watch 4. Provide me the dialog snippets to be translated to English. When the text provided is not translatable say 'incomprehensible'",
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
