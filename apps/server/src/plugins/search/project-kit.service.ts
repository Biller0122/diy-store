import { Injectable, OnModuleInit } from '@nestjs/common';
import { TransactionalConnection } from '@vendure/core';
import { EmbeddingService, SemanticSearchItem } from './embedding.service';

type ClaudeMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
};

export type ProjectKitItem = {
  id: string;
  variantId: string | null;
  name: string;
  slug: string;
  category: string | null;
  image: string | null;
  price: number;
  source: 'catalog' | 'supplier';
  supplierId: string | null;
  reason: string;
  qtyHint: string;
  required: boolean;
};

export type ProjectKitGroup = {
  title: string;
  items: ProjectKitItem[];
};

export type ProjectKitResult = {
  query: string;
  jobUnderstood: string;
  groups: ProjectKitGroup[];
  notes: string;
  fromCache: boolean;
};

/**
 * "Ажил → барааны багц" зөвлөх давхарга.
 *
 * Хэрэглэгч "ханын обой солих" гэх мэт ажлын зорилгоор хайхад:
 *   1. одоо байгаа `semanticSearch`-ээр (hybrid retrieval) нэр дэвшигч бараа олно,
 *   2. Claude-аар тэдгээрийг утга төрлөөр бүлэглэж (үндсэн материал / багаж /
 *      туслах), тоо хэмжээ санал болгож, заавал/нэмэлтийг ялгана,
 *   3. үр дүнг pgvector cache-д хадгалж, ойролцоо ажлын хайлт дахин ирэхэд
 *      Claude дуудалгүйгээр буцаана (зардал 70-80% буурна).
 */
@Injectable()
export class ProjectKitService implements OnModuleInit {
  private readonly dim = Number(process.env.EMBEDDING_DIMENSIONS || 1024);
  private readonly cacheMinSim = Number(process.env.PROJECT_KIT_CACHE_MIN_SIM || 0.93);
  private readonly cacheTtlDays = Number(process.env.PROJECT_KIT_CACHE_TTL_DAYS || 14);
  // Cache хувилбар. Хайлтын логик өөрчлөгдөхөд энэ тоог нэмэгдүүлбэл хуучин
  // (бохирдсон) cache бичлэгүүд үл тоомсорлогдоно. Reset = энэ тоог нэмэх.
  private readonly cacheVersion = Number(process.env.PROJECT_KIT_CACHE_VERSION || 2);
  private cacheReady = false;

  constructor(
    private readonly connection: TransactionalConnection,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCacheTable();
  }

  async projectKit(query: string, take = 24): Promise<ProjectKitResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { query: '', jobUnderstood: '', groups: [], notes: '', fromCache: false };
    }

    // Cache-д ашиглах query embedding (cache байхгүй ч энэ нэг л дуудлага)
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await this.embeddingService.createEmbedding(trimmed, 'query');
    } catch (error) {
      console.error('[ProjectKit] query embedding failed', error);
    }

    // Давхарга: semantic cache
    if (queryEmbedding) {
      const cached = await this.readCache(queryEmbedding).catch(() => null);
      if (cached) return { ...cached, fromCache: true };
    }

    // Retrieval — ажлыг материалын нэр болгон задлаад (Claude) нэр тус бүрээр
    // хайна. "хана будах" гэх ажлын хэллэг шууд тааруулахад сул, харин "цагаан
    // будаг", "акрил праймер" гэх материалын нэр сайн олддог тул задлалт чухал.
    const terms = await this.decomposeJob(trimmed);
    const searchTerms = [trimmed, ...terms];
    const perTermTake = Math.max(6, Math.min(take, 12));
    const groups = await Promise.all(
      searchTerms.map((t) =>
        this.embeddingService
          .semanticSearch(t, perTermTake)
          .then((r) => r.items)
          .catch(() => [] as SemanticSearchItem[]),
      ),
    );
    const best = new Map<string, SemanticSearchItem>();
    for (const item of groups.flat()) {
      const key = `${item.source}:${item.id}`;
      const ex = best.get(key);
      if (!ex || item.score > ex.score) best.set(key, item);
    }
    const items = Array.from(best.values()).sort((a, b) => b.score - a.score).slice(0, 40);
    if (items.length === 0) {
      return { query: trimmed, jobUnderstood: '', groups: [], notes: '', fromCache: false };
    }

    // Claude-аар бүлэглэх
    const result = await this.advise(trimmed, items);

    // Cache-д хадгалах
    if (queryEmbedding && result.groups.length > 0) {
      await this.writeCache(trimmed, queryEmbedding, result).catch((error) =>
        console.error('[ProjectKit] cache write failed', error),
      );
    }

    return result;
  }

  // ---------- Claude зөвлөх ----------
  private async advise(query: string, candidates: SemanticSearchItem[]): Promise<ProjectKitResult> {
    const byRef = new Map<string, SemanticSearchItem>();
    for (const item of candidates) byRef.set(`${item.source}:${item.id}`, item);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return this.fallback(query, candidates);

    const candidateLines = candidates
      .map(
        (c) =>
          `- ${c.source}:${c.id} | ${c.name} | ${c.category || 'ангилалгүй'} | ${Math.round(c.price)}₮`,
      )
      .join('\n');

    const system =
      'Чи DIY (засвар, барилгын материал) дэлгүүрийн туршлагатай зөвлөх. ' +
      'Хэрэглэгчийн хийх гэж буй ажилд хэрэгтэй барааг доорх НЭР ДЭВШИГЧ жагсаалтаас ' +
      'СОНГОЖ, утга төрлөөр нь бүлэглэ (жишээ: "Үндсэн материал", "Багаж хэрэгсэл", ' +
      '"Туслах материал"). Зөвхөн жагсаалтад буй ref-үүдийг ашигла, шинэ бараа зохиож ' +
      'болохгүй. Хэрэв хайлт нь тодорхой ажил биш, зүгээр нэг бараа бол ганц бүлэгт ' +
      'хийгээд орхи. Зөвхөн компакт JSON-оор хариул.';

    const userContent =
      `Хайлт: "${query}"\n\nНэр дэвшигч бараа:\n${candidateLines}\n\n` +
      'Яг ийм бүтэцтэй JSON буцаа:\n' +
      '{"jobUnderstood":"ажлын товч тайлбар","groups":[{"title":"Үндсэн материал",' +
      '"items":[{"ref":"catalog:12","reason":"яагаад хэрэгтэй","qtyHint":"~2 рулон",' +
      '"required":true}]}],"notes":"нэмэлт зөвлөмж"}';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.CLAUDE_QUERY_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 1200,
          system,
          messages: [{ role: 'user', content: userContent }],
        }),
      });

      if (!response.ok) return this.fallback(query, candidates);

      const data = (await response.json()) as ClaudeMessageResponse;
      const text = data.content?.find((part) => part.type === 'text' && part.text)?.text ?? '';
      const parsed = this.parseJson(text);
      if (!parsed) return this.fallback(query, candidates);

      const groups: ProjectKitGroup[] = [];
      const seen = new Set<string>();
      for (const rawGroup of Array.isArray(parsed.groups) ? parsed.groups : []) {
        const title = String(rawGroup?.title ?? '').trim() || 'Санал болгох бараа';
        const items: ProjectKitItem[] = [];
        for (const rawItem of Array.isArray(rawGroup?.items) ? rawGroup.items : []) {
          const ref = String(rawItem?.ref ?? '').trim();
          const base = byRef.get(ref);
          if (!base || seen.has(ref)) continue; // зөвхөн жинхэнэ бараа, давхардуулахгүй
          seen.add(ref);
          items.push({
            id: base.id,
            variantId: base.variantId,
            name: base.name,
            slug: base.slug,
            category: base.category,
            image: base.image,
            price: Math.round(base.price),
            source: base.source,
            supplierId: base.supplierId,
            reason: String(rawItem?.reason ?? '').trim(),
            qtyHint: String(rawItem?.qtyHint ?? '').trim(),
            required: rawItem?.required !== false,
          });
        }
        if (items.length > 0) groups.push({ title, items });
      }

      if (groups.length === 0) return this.fallback(query, candidates);

      return {
        query,
        jobUnderstood: String(parsed.jobUnderstood ?? '').trim(),
        groups,
        notes: String(parsed.notes ?? '').trim(),
        fromCache: false,
      };
    } catch (error) {
      console.error('[ProjectKit] advise failed', error);
      return this.fallback(query, candidates);
    }
  }

  /** Claude идэвхгүй / алдаа гарсан үед: бүлэглэхгүйгээр хайлтын үр дүнг буцаана. */
  private fallback(query: string, candidates: SemanticSearchItem[]): ProjectKitResult {
    return {
      query,
      jobUnderstood: '',
      groups: [
        {
          title: 'Санал болгож буй бараа',
          items: candidates.slice(0, 12).map((c) => ({
            id: c.id,
            variantId: c.variantId,
            name: c.name,
            slug: c.slug,
            category: c.category,
            image: c.image,
            price: Math.round(c.price),
            source: c.source,
            supplierId: c.supplierId,
            reason: '',
            qtyHint: '',
            required: false,
          })),
        },
      ],
      notes: '',
      fromCache: false,
    };
  }

  /** Ажлыг бараа хайлтад тохирох материал/багажийн нэр болгон задална (Claude). */
  private async decomposeJob(query: string): Promise<string[]> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return [];
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.CLAUDE_QUERY_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system:
            'Чи DIY (засвар, барилга) дэлгүүрийн зөвлөх. Хэрэглэгчийн ажилд хэрэгтэй ' +
            'материал, багажийг бараа хайхад тохирох богино монгол нэр болгон гаргана. ' +
            'Зөвхөн компакт JSON буцаа.',
          messages: [
            {
              role: 'user',
              content:
                `Ажил: "${query}".\nЭнэ ажилд хэрэгтэй 4-8 материал/багажийн хайлтын нэр гарга. ` +
                'Яг ийм формат: {"terms":["цагаан будаг","акрил праймер","будгийн валик","шпатель"]}',
            },
          ],
        }),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as ClaudeMessageResponse;
      const text = data.content?.find((p) => p.type === 'text' && p.text)?.text ?? '';
      const parsed = this.parseJson(text);
      const terms = parsed?.terms;
      if (!Array.isArray(terms)) return [];
      return terms.map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
    } catch (error) {
      console.error('[ProjectKit] decomposeJob failed', error);
      return [];
    }
  }

  private parseJson(text: string): Record<string, unknown> | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  // ---------- Semantic cache (pgvector) ----------
  private async ensureCacheTable(): Promise<void> {
    try {
      await this.connection.rawConnection.query('CREATE EXTENSION IF NOT EXISTS vector');
    } catch {
      // extension аль хэдийн байгаа / эрх дутуу — embedding ажиллаж байгаа тул орхино
    }
    try {
      await this.connection.rawConnection.query(
        `CREATE TABLE IF NOT EXISTS project_kit_cache (
           id bigserial PRIMARY KEY,
           query text NOT NULL,
           embedding vector(${this.dim}),
           result jsonb NOT NULL,
           version integer NOT NULL DEFAULT 0,
           created_at timestamptz NOT NULL DEFAULT now()
         )`,
      );
      // Хуучин (version-гүй) хүснэгтэд багана нэмнэ — өмнөх бичлэгүүд version=0
      // болж, шинэ cacheVersion-аар уншихад үл тоомсорлогдоно.
      await this.connection.rawConnection.query(
        'ALTER TABLE project_kit_cache ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0',
      );
      this.cacheReady = true;
    } catch (error) {
      console.warn('[ProjectKit] cache table бэлдэж чадсангүй — cache идэвхгүй', error);
    }
  }

  private async readCache(queryEmbedding: number[]): Promise<ProjectKitResult | null> {
    if (!this.cacheReady) return null;
    const vector = this.toVectorLiteral(queryEmbedding);
    const rows = (await this.connection.rawConnection.query(
      `SELECT result, 1 - (embedding <=> $1::vector) AS sim
       FROM project_kit_cache
       WHERE version = $3 AND created_at > now() - make_interval(days => $2)
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      [vector, this.cacheTtlDays, this.cacheVersion],
    )) as Array<{ result: ProjectKitResult; sim: string | number }>;

    const row = rows[0];
    if (!row) return null;
    if (Number(row.sim) < this.cacheMinSim) return null;
    return row.result;
  }

  private async writeCache(query: string, queryEmbedding: number[], result: ProjectKitResult): Promise<void> {
    if (!this.cacheReady) return;
    const vector = this.toVectorLiteral(queryEmbedding);
    await this.connection.rawConnection.query(
      `INSERT INTO project_kit_cache (query, embedding, result, version) VALUES ($1, $2::vector, $3::jsonb, $4)`,
      [query, vector, JSON.stringify(result), this.cacheVersion],
    );
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
}
