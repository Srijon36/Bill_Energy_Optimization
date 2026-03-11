const Tesseract = require("tesseract.js");
const OpenAI = require("openai");
const pdfParse = require("pdf-parse");
const Bill = require("../../models/billModel/billModel");

// ✅ initialize at runtime, not at module load
const getOpenAI = () => {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

// ── Extract text from image using Tesseract OCR ──
const extractTextFromImage = async (buffer) => {
  const { data: { text } } = await Tesseract.recognize(buffer, "eng");
  return text;
};

// ── Extract text from PDF ──
const extractTextFromPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  return data.text;
};

// ── Parse extracted text with AI ──
const parseBillWithAI = async (text) => {
  const openai = getOpenAI(); // ✅ called at runtime

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are an expert at reading Indian electricity bills.
Extract fields from this bill text and return ONLY valid JSON, no extra text, no markdown, no code blocks.

Required JSON format:
{
  "consumerNumber": "",
  "customerName": "",
  "address": "",
  "consumerType": "Domestic",
  "billMonth": "MM/YYYY",
  "billDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "unitsBilled": 0,
  "energyCharges": 0,
  "fixedDemandCharges": 0,
  "govtDuty": 0,
  "meterRent": 0,
  "adjustments": 0,
  "rebate": 0,
  "grossAmount": 0,
  "netAmount": 0,
  "loadKVA": 0,
  "securityDeposit": 0
}

Bill text:
${text}`,
      },
    ],
    max_tokens: 1000,
  });

  const raw = response.choices[0].message.content;
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};

// ── MAIN CONTROLLER ──
exports.scanAndCreateBill = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { mimetype, buffer } = req.file;

    // Step 1: Extract text based on file type
    let extractedText = "";
    if (mimetype === "application/pdf") {
      extractedText = await extractTextFromPDF(buffer);
    } else {
      extractedText = await extractTextFromImage(buffer);
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return res.status(422).json({
        success: false,
        message: "Could not extract text. Please upload a clearer image.",
      });
    }

    // Step 2: Parse with AI
    const billFields = await parseBillWithAI(extractedText);

    // Step 3: Save to DB with userId from token
    const bill = await Bill.create({
      ...billFields,
      userId: req.user.id, // ✅ from protect middleware
    });

    res.status(201).json({
      success: true,
      message: "Bill scanned and saved successfully",
      data: bill,
    });

  } catch (error) {
    // ✅ handle AI JSON parse failure
    if (error instanceof SyntaxError) {
      return res.status(422).json({
        success: false,
        message: "AI could not parse the bill. Please upload a clearer image.",
      });
    }
    next(error);
  }
};