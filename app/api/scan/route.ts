import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Your key is working! Paste it here one last time.
    const apiKey = process.env.GROQ_API_KEY as string;
    if (!body.image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const cleanBase64 = body.image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    console.log("=== THE KEY IS ===", process.env.GROQ_API_KEY);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // UPDATE: The currently supported vision model
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract receipt items. Return ONLY a JSON array of objects with 'name' and 'price' keys. Translate Thai to English. Ignore totals and taxes."
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}` }
              }
            ]
          }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API Error:", data);
      return NextResponse.json({ error: data.error?.message || "Groq Failure" }, { status: response.status });
    }

    const responseText = data.choices[0].message.content;

    // 1. LOG THE RAW OUTPUT: This will print exactly what the AI said in your terminal
    console.log("RAW AI RESPONSE:\n", responseText);

    // 2. Clean the markdown
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    // 3. Defensively parse the JSON
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);

      // If the AI accidentally wrapped the array in an object (e.g., { "items": [...] })
      if (parsedData.items && Array.isArray(parsedData.items)) {
        parsedData = parsedData.items;
      }

      // If the AI returned an empty array, or something else weird
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        console.log("WARNING: Parsed data is empty or not an array:", parsedData);
      }

    } catch (parseError) {
      console.error("JSON Parse Failed! AI output was:", cleanedText);
      return NextResponse.json({ error: "Failed to parse AI response into JSON" }, { status: 500 });
    }

    return NextResponse.json({ items: parsedData });

  } catch (error: any) {
    console.error("HARDCODE ROUTE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}