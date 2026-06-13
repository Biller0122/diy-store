import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrackingToken1749000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_request" ADD COLUMN IF NOT EXISTS "trackingToken" character varying NOT NULL DEFAULT ''`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_request" DROP COLUMN IF EXISTS "trackingToken"`
    );
  }
}
