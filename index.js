import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({
  apiKey: "AIzaSyB2Iw95IDBwTPINq_OFWf4p-4COuHH2LZg"
});

const models = await client.models.list();
console.log(models);