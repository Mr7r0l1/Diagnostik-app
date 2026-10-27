import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ Advertencia: GEMINI_API_KEY no está configurada en .env');
}

export const ai = new GoogleGenAI({ apiKey: apiKey || '' });
