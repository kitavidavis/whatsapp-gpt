import { ChatGPTAPI } from 'chatgpt'
import process from "process"
import qrcode from "qrcode-terminal";
import { Client } from "whatsapp-web.js";
import dotenv from "dotenv"
// Environment variables
dotenv.config()

// Prefix check
const prefixEnabled = process.env.PREFIX_ENABLED == "true"
const prefix = '!gpt'

// Whatsapp Client
const client = new Client()

// ChatGPT Client
const api = new ChatGPTAPI({
    apiKey: process.env.OPENAI_API_KEY
})

// Mapping from number to last conversation id
const conversations = {}

// Entrypoint
const start = async () => {
    // Whatsapp auth
    client.on("qr", (qr) => {
        console.log("[Whatsapp ChatGPT] Scan this QR code in whatsapp to log in:")
        qrcode.generate(qr, { small: true });
    })

    // Whatsapp ready
    client.on("ready", () => {
        console.log("[Whatsapp ChatGPT] Client is ready!");
    })

    // Whatsapp message
    client.on("message", async (message) => {
        if (message.body.length == 0) return
        if (message.from == "status@broadcast") return

        if (prefixEnabled) {
            if (message.body.startsWith(prefix)) {
                // Get the rest of the message
                const prompt = message.body.substring(prefix.length + 1);
                await handleMessage(message, prompt)
            }
        } else {
            await handleMessage(message, message.body)
        }
    })

    client.initialize()
}

const handleMessage = async (message, prompt) => {
    try {
        const lastConversation = conversations[message.from]

        // Add the message to the conversation
        console.log("[Whatsapp ChatGPT] Received prompt from " + message.from + ": " + prompt)
        let response;

        const start = Date.now()
        if (lastConversation) {
            response = await api.sendMessage(prompt, lastConversation)
        } else {
            response = await api.sendMessage(prompt)
        }
        const end = Date.now() - start

        console.log(`[Whatsapp ChatGPT] Answer to ${message.from}: ${response.text}`)

        // Set the conversation
        conversations[message.from] = {
            conversationId: response.conversationId,
            parentMessageId: response.id
        }

        console.log("[Whatsapp ChatGPT] ChatGPT took " + end + "ms")

        // Send the response to the chat
        message.reply(response.text)
    } catch (error) {
        console.error("An error occured", error)
        message.reply("An error occured, please contact the administrator. (" + error.message + ")")
    }
}

start()
