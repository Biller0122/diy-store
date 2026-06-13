import { DataSource } from 'typeorm';

type RuntimeColumn = {
  table: string;
  name: string;
  definition: string;
};

const RUNTIME_COLUMNS: RuntimeColumn[] = [
  {
    table: 'supplier',
    name: 'otpAttempts',
    definition: 'integer NOT NULL DEFAULT 0',
  },
  {
    table: 'driver',
    name: 'otpAttempts',
    definition: 'integer NOT NULL DEFAULT 0',
  },
  {
    table: 'delivery_request',
    name: 'trackingToken',
    definition: "character varying NOT NULL DEFAULT ''",
  },
];

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function ensureRuntimeSchema(dataSource: DataSource) {
  if (dataSource.options.type !== 'postgres') return;

  for (const column of RUNTIME_COLUMNS) {
    await dataSource.query(
      `ALTER TABLE ${quoteIdentifier(column.table)} ADD COLUMN IF NOT EXISTS ${quoteIdentifier(column.name)} ${column.definition}`,
    );
  }
}
