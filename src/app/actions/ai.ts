'use server';

import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { getFinancialContext } from '@/lib/services/ai-context';

// Helper function to get authenticated user ID
async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();

  // Try getUser first (recommended, verifies with DB)
  let userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    // Fallback to getSession (JWT only, no DB verification)
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  return userId || null;
}

// System prompt for the AI financial advisor
const systemPrompt = `You are a witty, slightly ruthless, but ultimately helpful financial advisor named "Money Coach".

Your personality:
- Direct and honest, but not mean
- Use light humor and occasional gentle roasts
- Encouraging when things are going well
- Constructive when things need improvement

Your task:
- Analyze the user's financial health based on the provided summary
- Keep your response SHORT (2-3 sentences max)
- Focus on the most important insight or action item
- If they're doing great, celebrate them!
- If they're overspending, give them a gentle reality check
- Always end with one specific, actionable tip

Response format:
- Be conversational, not formal
- Use simple language
- No bullet points, just natural sentences`;

/**
 * Generates personalized financial advice using OpenAI
 * Analyzes the user's financial context and returns actionable insights
 */
export async function generateFinancialAdvice(): Promise<{
  success: boolean;
  advice?: string;
  error?: string;
}> {
  try {
    // Check for API key first
    if (!process.env.OPENAI_API_KEY) {
      console.error('generateFinancialAdvice: OpenAI API key not configured');
      return {
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    // Get authenticated user
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return {
        success: false,
        error: 'You must be logged in to get financial advice',
      };
    }

    // Get financial context
    const context = await getFinancialContext(userId);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Make API call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here's my financial summary:\n\n${context}` },
      ],
      max_tokens: 200,
      temperature: 0.7, // Some creativity for varied responses
    });

    const advice = completion.choices[0]?.message?.content;

    if (!advice) {
      console.error('generateFinancialAdvice: No content in API response');
      return {
        success: false,
        error: 'Unable to generate advice at this time.',
      };
    }

    return {
      success: true,
      advice,
    };
  } catch (error) {
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      console.error('generateFinancialAdvice: OpenAI API error', {
        status: error.status,
        message: error.message,
        code: error.code,
      });

      // Handle rate limiting
      if (error.status === 429) {
        return {
          success: false,
          error: 'Too many requests. Please try again in a moment.',
        };
      }

      // Handle authentication errors
      if (error.status === 401) {
        return {
          success: false,
          error: 'AI service authentication failed. Please contact support.',
        };
      }

      // Handle quota exceeded
      if (error.code === 'insufficient_quota') {
        return {
          success: false,
          error: 'AI service quota exceeded. Please try again later.',
        };
      }

      return {
        success: false,
        error: 'Failed to generate advice. Please try again.',
      };
    }

    // Log unexpected errors but don't expose details
    console.error('generateFinancialAdvice: Unexpected error', error);

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
