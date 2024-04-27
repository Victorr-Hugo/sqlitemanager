interface QueryOptions {
  tableName: string;
  where?: { field: string; value: any };
}

interface Query {
  collection: Collection;
  field: string;
  operator: string;
  value: any;
}

interface Collection {
  db: any;
  tableName: string;
}
