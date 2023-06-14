const { Configuration, OpenAIApi } = require("openai");

class Translate {
    constructor() {
        this.openai = this.initOpenAi();
    }

    initOpenAi() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORGANIZATION,
        });
        const openai = new OpenAIApi(configuration);
        return openai;
    }

    async translate(text) {
        const completion = await this.openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            // Default role as the computer is named assistant
            // Token limit is 4096 per API call (both input and output combined)
            messages: [
            {
                role: "assistant",
                content:
                "I am a Japanese to English translator for the game Yo-Kai Watch 4. Provide me the dialog snippets to be translated to English. When the text provided is not translatable/comprehensive I say 'incomprehensible'",
            },
            {
                role: "user",
                content: text,
            },
            ],
            max_tokens: 2048,
            temperature: 1, // lower numbers have less randomness
        });
        return completion.data.choices[0].message.content;
    }
}

exports.Translate = Translate;
