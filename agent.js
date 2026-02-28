import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import z from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/* =========================
   1. SCHEMA
========================= */

const outputSchema = z.object({
  type: z.enum(["tool_call", "text"]),
  finalOutput: z.boolean(),
  text_content: z.string().nullable(),
  tool_call: z.object({
    tool_name: z.enum(["create_folder", "create_file"]),
    params: z.array(z.string()),
  }).nullable(),
});

/* =========================
   2. CLIENT
========================= */

const client = new GoogleGenAI({
  apiKey: "your api",
});

/* =========================
   3. SAFE TOOLS
========================= */

function create_folder(name) {
  if (!fs.existsSync(name)) {
    fs.mkdirSync(name);
    return `Folder '${name}' created successfully.`;
  }
  return `Folder '${name}' already exists.`;
}

function create_file(name) {
  if (!fs.existsSync(name)) {
    fs.writeFileSync(name, "");
    return `File '${name}' created successfully.`;
  }
  return `File '${name}' already exists.`;
}

const functionMapping = {
  create_folder,
  create_file,
};

/* =========================
   4. STRICT SYSTEM PROMPT
========================= */

const SYSTEM_PROMPT = `
You are a file system automation agent.

You MUST respond ONLY with valid JSON.

Valid JSON format:

{
  "type": "tool_call" or "text",
  "finalOutput": boolean,
  "text_content": string or null,
  "tool_call": {
     "tool_name": "create_folder" or "create_file",
     "params": ["name"]
  } or null
}

Example:

User: create a folder named test

Response:
{
  "type": "tool_call",
  "finalOutput": false,
  "text_content": null,
  "tool_call": {
    "tool_name": "create_folder",
    "params": ["test"]
  }
}

Do not return explanations.
Do not return markdown.
Do not return an empty object.
`;

/* =========================
   5. AGENT LOOP
========================= */

async function run(query) {

  const messages = [
    {
      role: "user",
      parts: [{ text: query }]
    }
  ];

  let iteration = 0;
  const MAX_ITERATIONS = 5;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const result = await client.models.generateContent({
      model: "models/gemini-2.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: messages,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: zodToJsonSchema(outputSchema),
      },
    });

    console.log("Raw:", result.text);

    let parsed;

    try {
      parsed = outputSchema.parse(JSON.parse(result.text));
    } catch (err) {
      console.log("Schema validation failed.");
      break;
    }

    console.log("Parsed:", parsed);

    if (parsed.type === "tool_call" && parsed.tool_call) {

      const { tool_name, params } = parsed.tool_call;

      const toolResult = functionMapping[tool_name](...params);
      console.log("Tool Result:", toolResult);

      messages.push({
        role: "model",
        parts: [{ text: JSON.stringify(parsed) }]
      });

      messages.push({
        role: "user",
        parts: [{ text: `Tool result: ${toolResult}` }]
      });

    } else if (parsed.type === "text") {

      console.log("Final:", parsed.text_content);

      if (parsed.finalOutput) break;
    }

    if (parsed.finalOutput) break;
  }
}

run("create a folder named test");