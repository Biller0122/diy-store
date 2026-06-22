import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierProfileMedia1782000000000 implements MigrationInterface {
  name = 'AddSupplierProfileMedia1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE supplier ADD COLUMN IF NOT EXISTS "coverImage" character varying');
    await queryRunner.query('ALTER TABLE supplier ADD COLUMN IF NOT EXISTS "youtubeUrl" character varying');
    await queryRunner.query('ALTER TABLE supplier ADD COLUMN IF NOT EXISTS "posterUrls" text');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE supplier DROP COLUMN IF EXISTS "posterUrls"');
    await queryRunner.query('ALTER TABLE supplier DROP COLUMN IF EXISTS "youtubeUrl"');
    await queryRunner.query('ALTER TABLE supplier DROP COLUMN IF EXISTS "coverImage"');
  }
}
