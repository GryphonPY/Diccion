const { GoogleGenAI } = require("@google/genai");

const MODEL_NAME = "gemini-2.5-flash-preview-04-17";

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key no configurada en el servidor." }) };
  }

  const genAI = new GoogleGenAI({ apiKey });
  const body = JSON.parse(event.body);
  const { action } = body;

  try {
    if (action === "transcribe") {
      const { audioData, mimeType } = body;
      if (!audioData || !mimeType) {
        return { statusCode: 400, body: JSON.stringify({ error: "Faltan datos de audio o mimeType." }) };
      }

      const audioPart = { inlineData: { mimeType: mimeType, data: audioData } };
      const textPart = { text: "Transcribe this audio accurately. Respond only with the transcription." };
      
      const response = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: [audioPart, textPart] },
      });
      
      const transcription = response.text;
      return { statusCode: 200, body: JSON.stringify({ transcription }) };

    } else if (action === "polish") {
      const { text, polishMode, customPolishPrompt } = body;
      if (!text || !polishMode) {
        return { statusCode: 400, body: JSON.stringify({ error: "Falta texto o modo de pulido." }) };
      }

      let prompt = "";
      const commonInstructions = "Formatea la respuesta usando Markdown. Asegúrate de que la respuesta esté en español.";

      switch (polishMode) {
        case "concise_summary":
          prompt = `Resume el siguiente texto de forma concisa y clara. Enfócate en las ideas principales. ${commonInstructions}\n\nTexto:\n${text}`;
          break;
        case "bullet_points":
          prompt = `Extrae los puntos clave del siguiente texto y preséntalos como una lista de viñetas. ${commonInstructions}\n\nTexto:\n${text}`;
          break;
        case "formal_tone":
          prompt = `Reformula el siguiente texto para que tenga un tono más formal y profesional, manteniendo el significado original. ${commonInstructions}\n\nTexto:\n${text}`;
          break;
        case "custom":
          if (!customPolishPrompt || customPolishPrompt.trim() === "") {
            return { statusCode: 400, body: JSON.stringify({ error: "El prompt personalizado no puede estar vacío." }) };
          }
          const customPromptFinal = customPolishPrompt.toLowerCase().includes("español") || customPolishPrompt.toLowerCase().includes("spanish") 
            ? customPolishPrompt 
            : `${customPolishPrompt}\nAsegúrate de que la respuesta esté en español si el texto de entrada lo está.`;
          prompt = `${customPromptFinal}\n\nTexto de referencia (si es necesario para el prompt):\n${text}`;
          break;
        case "standard":
        default:
          prompt = `Take this raw transcript and create a well-formatted, polished note.
Eliminate filler words (ums, uhs, likes), repetitions, and false starts.
Correctly format any lists or bullet points. Use markdown formatting for headings, lists, etc.
Retain all original content and meaning.
Ensure the response is in Spanish if the input text is in Spanish.

Raw Transcript:
${text}`;
          break;
      }
      
      const geminiResponse = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });
      const polishedMarkdown = geminiResponse.text;
      return { statusCode: 200, body: JSON.stringify({ polishedMarkdown }) };

    } else if (action === "generateTitle") {
      const { text } = body;
      if (!text) {
        return { statusCode: 400, body: JSON.stringify({ error: "Falta texto para generar título." }) };
      }
      const prompt = `Generate a very short, concise title (max 5 words, ideally 2-3) for the following text. Respond only with the title itself, no extra explanations. The text is in Spanish, provide title in Spanish:\n\n${text}`;
      
      const geminiResponse = await genAI.models.generateContent({
          model: MODEL_NAME,
          contents: prompt
      });
      const title = geminiResponse.text;
      return { statusCode: 200, body: JSON.stringify({ title }) };

    } else {
      return { statusCode: 400, body: JSON.stringify({ error: "Acción no válida." }) };
    }

  } catch (error) {
    console.error("Error en la función Netlify (gemini-proxy):", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Error interno del servidor al procesar la solicitud." }),
    };
  }
};
