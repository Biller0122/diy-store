import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmbedding1780488000000 implements MigrationInterface {
  name = 'AddEmbedding1780488000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector;');

    await queryRunner.query(`
      ALTER TABLE product_translation
      ADD COLUMN IF NOT EXISTS embedding vector(1024);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
      product_translation_embedding_idx
      ON product_translation
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);

    await queryRunner.query(`
      ALTER TABLE supplier_product
      ADD COLUMN IF NOT EXISTS embedding vector(1024);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
      supplier_product_embedding_idx
      ON supplier_product
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS supplier_product_embedding_idx;');
    await queryRunner.query('ALTER TABLE supplier_product DROP COLUMN IF EXISTS embedding;');
    await queryRunner.query('DROP INDEX IF EXISTS product_translation_embedding_idx;');
    await queryRunner.query('ALTER TABLE product_translation DROP COLUMN IF EXISTS embedding;');
  }
}
