interface QueryOptions {
  column: string;
  operand: string;
  value: any;
}

interface Query {
  collection: Collection;
  field: string;
  operator: string;
  value: any;
}

interface Collection {
  db: any;
  table: string;
}
