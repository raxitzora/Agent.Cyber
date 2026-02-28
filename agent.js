import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({
    apiKey: "AIzaSyBf2zXQXAlOyMUWczKRJ3BSFRcz9MmbqSU"
});

const SYSTEM_PROMPT = `You are an expert AI Assistant in controlling the user's machine.
Analyse the user's query and carefully and plan the steps on what needs to be done.
Based on the user query you can create commands and then call the tool to run that command and execute on user machine.`

export async function run(query=""){
    const result = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        prompt:SYSTEM_PROMPT,
        contents:query,
    });
    console.log("Agent said",result.text);
}
run("What is the current date and time?")
