require('@tensorflow/tfjs');
const express = require('express');
const cors = require('cors');
const use = require('@tensorflow-models/universal-sentence-encoder');
const tf = require('@tensorflow/tfjs-node');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config');

const app = express();
app.use(cors({
    origin: 'http://localhost:3001'  // Allow requests from localhost:3001
}));
const port = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

let model;
let answerEmbeddings = [];
const answers = [
    "The capital of France is Paris.",
    "The tallest mountain in the world is Mount Everest.",
    "The square root of 64 is 8.",
    "Python is a popular programming language."
];

// Load the Universal Sentence Encoder model and compute embeddings for answers
use.load().then(m => {
    model = m;
    model.embed(answers).then(embeddings => {
        answerEmbeddings = embeddings.arraySync();
        console.log('Model and answer embeddings loaded');
    });
});

/**
 * @swagger
 * /embed:
 *   post:
 *     summary: Get embeddings for input text
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Hello, world!"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 embeddings:
 *                   type: array
 *                   items:
 *                     type: number
 */
app.post('/embed', async (req, res) => {
    const { text } = req.body;

    if (!text || !model) {
        return res.status(400).send('Bad Request');
    }

    const embeddings = await model.embed([text]);
    const embeddingArray = embeddings.arraySync();

    res.json({ embeddings: embeddingArray[0] });
});

/**
 * @swagger
 * /answer:
 *   post:
 *     summary: Get the most similar answer for the input question
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 example: "What is the capital of France?"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 */
app.post('/answer', async (req, res) => {
    const { question } = req.body;

    if (!question || !model) {
        return res.status(400).send('Bad Request');
    }

    // Compute embedding for the input question
    const questionEmbedding = await model.embed([question]);
    const questionEmbeddingArray = questionEmbedding.arraySync()[0];

    // Find the most similar answer
    let maxSimilarity = -Infinity;
    let bestAnswer = '';

    for (let i = 0; i < answerEmbeddings.length; i++) {
        const similarity = cosineSimilarity(questionEmbeddingArray, answerEmbeddings[i]);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestAnswer = answers[i];
        }
    }

    res.json({ answer: bestAnswer });
});

// Helper function to compute cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
