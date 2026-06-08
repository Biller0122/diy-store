import { Body, Controller, Post, Res } from '@nestjs/common';
import { VendurePlugin } from '@vendure/core';
import type { Response } from 'express';

type ProductAnalysis = {
  name: string;
  description: string;
  category: string;
  unit: string;
  confidence: number;
};

type AnalyzeProductBody = {
  image?: string;
  mediaType?: string;
};

function extractJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not include JSON');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeAnalysis(value: any): ProductAnalysis {
  return {
    name: String(value?.name ?? '').trim(),
    description: String(value?.description ?? '').trim(),
    category: String(value?.category ?? 'бусад').trim().toLowerCase(),
    unit: String(value?.unit ?? 'ширхэг').trim().toLowerCase(),
    confidence: Math.max(0, Math.min(100, Number(value?.confidence ?? 0))),
  };
}

@Controller('analyze-product')
class ProductAiController {
  @Post()
  async analyze(@Body() body: AnalyzeProductBody, @Res() res: Response) {
    try {
      res.status(200).json(await this.analyzeProductImage(body));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Product image analysis failed';
      console.error('[ProductAI] analyze-product failed', message);
      res.status(message.includes('ANTHROPIC_API_KEY') ? 503 : 500).json({ error: message });
    }
  }

  private async analyzeProductImage(input: AnalyzeProductBody): Promise<ProductAnalysis> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const image = input.image?.includes(',') ? input.image.split(',').pop() ?? '' : input.image ?? '';
    const mediaType = input.mediaType || input.image?.match(/^data:([^;]+);base64,/)?.[1] || 'image/jpeg';
    if (!image || image.length < 20) {
      throw new Error('Image payload is empty');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_VISION_MODEL || process.env.CLAUDE_QUERY_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: image,
              },
            },
            {
              type: 'text',
              text: `Энэ DIY/барилгын материалын барааны зургийг шинжилж зөвхөн JSON буцаа.
JSON schema:
{
  "name": "барааны нэр, Монгол хэлээр, боломжтой бол марк/хэмжээтэй",
  "description": "товч тайлбар 1-2 өгүүлбэр, Монгол хэлээр",
  "category": "цемент|төмөр|мод|будаг|тоосго|сантехник|цахилгаан|багаж|барилга|бусад",
  "unit": "ширхэг|кг|тонн|метр|м2|уут|литр",
  "confidence": 0-100
}
Хэрэв сайн танихгүй бол category="бусад", confidence бага өг. JSON-оос өөр текст битгий бич.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Claude Vision failed with HTTP ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const data = await response.json() as { content?: Array<{ type?: string; text?: string }> };
    const text = data.content?.find((part) => part.type === 'text')?.text ?? data.content?.[0]?.text ?? '';
    return normalizeAnalysis(extractJsonObject(text));
  }
}

@VendurePlugin({
  controllers: [ProductAiController],
})
export class ProductAiPlugin {}
