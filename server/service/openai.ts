import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface CodeAssistanceRequest {
  code: string;
  language: string;
  question: string;
  context?: string;
}

export interface CodeAssistanceResponse {
  response: string;
  suggestions?: string[];
  codeExample?: string;
}

export async function getCodeAssistance(request: CodeAssistanceRequest): Promise<CodeAssistanceResponse> {
  try {
    const systemPrompt = `You are an expert programming assistant specializing in ${request.language}. 
    Help users with code debugging, optimization, explanations, and best practices. 
    Provide clear, actionable advice and include code examples when helpful.
    Respond with JSON in this format: { "response": "string", "suggestions": ["string"], "codeExample": "string" }`;

    const userPrompt = `
    Language: ${request.language}
    Question: ${request.question}
    ${request.context ? `Context: ${request.context}` : ''}
    ${request.code ? `Current Code:\n${request.code}` : ''}
    
    Please provide helpful assistance with this coding question.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      response: result.response || "I'm sorry, I couldn't process your request.",
      suggestions: result.suggestions || [],
      codeExample: result.codeExample || "",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get AI assistance: " + (error as Error).message);
  }
}

export async function debugCode(code: string, language: string, errorMessage?: string): Promise<CodeAssistanceResponse> {
  try {
    const systemPrompt = `You are a debugging expert for ${language}. 
    Analyze code for bugs, errors, and potential issues. 
    Provide specific fixes and explanations.
    Respond with JSON in this format: { "response": "string", "suggestions": ["string"], "codeExample": "string" }`;

    const userPrompt = `
    Language: ${language}
    Code to debug:
    ${code}
    ${errorMessage ? `Error message: ${errorMessage}` : ''}
    
    Please identify and fix any issues in this code.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      response: result.response || "No issues found in the code.",
      suggestions: result.suggestions || [],
      codeExample: result.codeExample || "",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to debug code: " + (error as Error).message);
  }
}

export async function optimizeCode(code: string, language: string): Promise<CodeAssistanceResponse> {
  try {
    const systemPrompt = `You are a code optimization expert for ${language}. 
    Analyze code for performance improvements, better algorithms, and cleaner patterns.
    Respond with JSON in this format: { "response": "string", "suggestions": ["string"], "codeExample": "string" }`;

    const userPrompt = `
    Language: ${language}
    Code to optimize:
    ${code}
    
    Please suggest optimizations for better performance and code quality.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      response: result.response || "The code looks well optimized.",
      suggestions: result.suggestions || [],
      codeExample: result.codeExample || "",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to optimize code: " + (error as Error).message);
  }
}

export async function explainCode(code: string, language: string): Promise<CodeAssistanceResponse> {
  try {
    const systemPrompt = `You are a code explanation expert for ${language}. 
    Explain how code works, what algorithms are used, and the purpose of different parts.
    Respond with JSON in this format: { "response": "string", "suggestions": ["string"], "codeExample": "string" }`;

    const userPrompt = `
    Language: ${language}
    Code to explain:
    ${code}
    
    Please explain how this code works and what it does.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      response: result.response || "This code appears to be a standard implementation.",
      suggestions: result.suggestions || [],
      codeExample: result.codeExample || "",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to explain code: " + (error as Error).message);
  }
}
