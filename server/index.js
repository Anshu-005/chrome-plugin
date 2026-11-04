import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

// --- Startup Validation ---
if (!process.env.GROQ_API_KEY) {
    console.error("FATAL: GROQ_API_KEY is not set in your .env file. Exiting.");
    process.exit(1);
}

//Langchain imports
import { ChatGroq } from "@langchain/groq";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const app = express();

// Restrict CORS to localhost and Chrome extensions
app.use(cors({
    origin: ['http://localhost', 'http://127.0.0.1', /^chrome-extension:\/\//],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '10mb' })); //Allow large webpage texts

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: "ok", message: `Web Summarizer Server running with Groq (${process.env.GROQ_MODEL || 'openai/gpt-oss-120b'})` });
});

// Initialise LangChain Model with Groq
const model = new ChatGroq({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.3,
});

//Define the summarization prompt template
const promptTemplate = PromptTemplate.fromTemplate(
    `You are an expert research assistant. Please provide a clear, concise, and well-structured summary of the following webpage content. 
    Use bullet points for key takeaways.

    Webpage Content:
    {text}

   Summary:`
);

const outputParser = new StringOutputParser();
const chain = promptTemplate.pipe(model).pipe(outputParser);

//API endpoint for summarization
app.post('/summarize', async (req, res) => {
    try {
        const { text } = req.body;

        // Guard against missing, non-string, or blank inputs
        if (!text || typeof text !== 'string' || !text.trim()) {
            return res.status(400).json({ error: "No text provided" });
        }

        // Guard against excessively short inputs
        if (text.trim().length < 10) {
            return res.status(400).json({ error: "Text is too short to summarize" });
        }

        // Invoke LangChain pipeline
        const summary = await chain.invoke({ text: text.trim() });
        res.json({ summary });
    } catch (error) {
        console.error("LangChain Error:", error.message || error);

        // Return a more descriptive error without leaking raw stack traces
        const isApiError = error?.message?.includes("API key") || error?.status === 401 || error?.status === 403;
        if (isApiError) {
            return res.status(500).json({ error: "Invalid or unauthorized API key. Check your GROQ_API_KEY." });
        }

        res.status(500).json({ error: "Failed to generate summary. Please try again." });
    }
});

// Global error handler (safety net for Express 5 async errors)
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message || err);
    res.status(500).json({ error: "An unexpected server error occurred." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});