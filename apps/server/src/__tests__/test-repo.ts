type EntityWithId = { id?: string | number };

function matchesWhere<T extends EntityWithId>(entity: T, where: Partial<T>) {
  const record = entity as Record<string, unknown>;
  return Object.entries(where).every(([key, value]) => record[key] === value);
}

export function createMockRepository<T extends EntityWithId>() {
  const items: T[] = [];
  let id = 1;

  return {
    items,
    create(input: Partial<T>) {
      return { ...input } as T;
    },
    async save(entity: T) {
      if (!entity.id) entity.id = String(id++);
      const index = items.findIndex((item) => item.id === entity.id);
      if (index >= 0) items[index] = entity;
      else items.push(entity);
      return entity;
    },
    async findOne({ where }: { where: Partial<T> }) {
      return items.find((item) => matchesWhere(item, where)) ?? null;
    },
    async find({ where }: { where?: Partial<T> } = {}) {
      return where ? items.filter((item) => matchesWhere(item, where)) : [...items];
    },
    async findAndCount() {
      return [[...items], items.length] as [T[], number];
    },
    async update(idValue: string | number, patch: Partial<T>) {
      const entity = items.find((item) => String(item.id) === String(idValue));
      if (entity) Object.assign(entity, patch);
      return { affected: entity ? 1 : 0 };
    },
  };
}
