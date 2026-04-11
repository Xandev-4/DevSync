import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export const extractResumeData = async (pdfBase64) => {
  if (!genAI) throw new Error("GEMINI_API_KEY is not defined");

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const geminiCall = model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    },
    `Extract the following from this resume as JSON only, no markdown:
{
  "techStack": ["array", "of", "technologies"],
  "bio": "2-3 sentence professional summary"
}
Only include technologies explicitly mentioned. Return valid JSON, nothing else.`,
  ]);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Gemini request timed out after 10s")),
      10000,
    ),
  );

  let result;
  try {
    result = await Promise.race([geminiCall, timeoutPromise]);
  } catch (err) {
    throw new Error(`Gemini API call failed: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(result.response.text());
  } catch {
    throw new Error(
      `Gemini returned non-JSON response: ${result.response.text()}`,
    );
  }

  if (!Array.isArray(parsed?.techStack) || typeof parsed?.bio !== "string")
    throw new Error(`Gemini response shape invalid: ${JSON.stringify(parsed)}`);

  return parsed;
};
