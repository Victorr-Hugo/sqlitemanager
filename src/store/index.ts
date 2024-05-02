import * as fs from "fs";
import * as sqlite3 from "sqlite3";
import * as path from "path";

export interface QueryOptions {
  column: string;
  operand: string;
  value: any;
}

export interface Collection {
  db: any;
  table: string;
}

export function getStore(): sqlite3.Database {
  const dbFile = "__d.sqlite";
  const dbExists = fs.existsSync(dbFile);

  if (!dbExists) {
    fs.closeSync(fs.openSync(dbFile, "w"));
  }
  scheduleDailyBackup(dbFile);
  sqlite3.verbose();
  return new sqlite3.Database(dbFile);
}

function scheduleDailyBackup(dbFile: string): void {
  const backupDir = "__backups";
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  setInterval(() => {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const backupFile = `${backupDir}/backup_${timestamp}.sqlite`;

    fs.copyFileSync(dbFile, backupFile);
    console.log(`Backup realizado en: ${backupFile}`);

    deleteOldBackups(backupDir);
  }, 24 * 60 * 60 * 1000);
}

function deleteOldBackups(backupDir: string): void {
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  fs.readdir(backupDir, (err, files) => {
    if (err) {
      console.error("Error al leer el directorio de backups:", err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(backupDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error("Error al obtener información del archivo:", err);
          return;
        }

        const fileAge = now - stats.mtime.getTime();
        if (fileAge > maxAge) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error("Error al eliminar el archivo de backup:", err);
              return;
            }
            console.log(`Backup más antiguo eliminado: ${filePath}`);
          });
        }
      });
    });
  });
}

export function collection(db: sqlite3.Database, table: string) {
  return { db, table };
}

export function where(
  column: string,
  operand: string,
  value: any
): QueryOptions {
  return { column, operand, value };
}

export function getDocs(
  collection: Collection,
  queryOptions?: QueryOptions
): Promise<any[]> {
  const { db, table } = collection;

  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM ${table}`;
    let params: any[] = [];

    if (queryOptions) {
      sql += ` WHERE ${queryOptions.column} ${queryOptions.operand} ?`;
      params.push(queryOptions.value);
    }

    db.all(sql, params, (err: any, rows: any[] | PromiseLike<any[]>) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}
export function addDoc(
  db: sqlite3.Database,
  tableName: string,
  record: Record<string, any>
): Promise<any> {
  const timestamp = new Date().toISOString();
  const recordWithTimestamp = { ...record, timestamp };

  return new Promise((resolve, reject) => {
    const keys = Object.keys(recordWithTimestamp);
    const values = Object.values(recordWithTimestamp);
    const placeholders = Array(keys.length).fill("?").join(",");

    // Check if the table already exists
    db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName],
      (err: any, row: any) => {
        if (err) {
          reject({
            message: "Error al verificar la existencia de la tabla:",
            err,
          });
        } else if (!row) {
          // Table doesn't exist, create it first
          const createTableSql = `CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${keys
            .map((key) => `${key} TEXT`)
            .join(", ")})`;
          db.run(createTableSql, (err: any) => {
            if (err) {
              reject({
                message: "Error al crear la tabla:",
                err,
              });
            } else {
              // Table created successfully, insert the record
              insertRecord(db, tableName, keys, values, placeholders)
                .then((insertedRecord) => resolve(insertedRecord))
                .catch((err) => reject(err));
            }
          });
        } else {
          // Table already exists, insert the record directly
          insertRecord(db, tableName, keys, values, placeholders)
            .then((insertedRecord) => resolve(insertedRecord))
            .catch((err) => reject(err));
        }
      }
    );
  });
}

function insertRecord(
  db: sqlite3.Database,
  tableName: string,
  keys: string[],
  values: any[],
  placeholders: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const insertSql = `INSERT INTO ${tableName} (${keys.join(
      ", "
    )}) VALUES (${placeholders})`;
    db.run(insertSql, values, function (err: any) {
      if (err) {
        console.log(err);
        reject({
          message: "Error al insertar el registro:",
          err,
        });
      } else {
        const insertedId = this.lastID;
        db.get(
          `SELECT * FROM ${tableName} WHERE rowid = ?`,
          [insertedId],
          (err: any, row: any) => {
            if (err) {
              reject({
                message: "Error al recuperar el registro insertado:",
                err,
              });
            } else {
              const doc = { ...row, id: insertedId };
              resolve(doc);
            }
          }
        );
      }
    });
  });
}

export function updateDoc(
  db: sqlite3.Database,
  docRef: any,
  newData: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const tableName = docRef.tableName;
    const idColumn = docRef.idColumn;
    const idValue = docRef.idValue;
    const updateData = Object.keys(newData)
      .map((key) => `${key} = ?`)
      .join(", ");
    const sql = `UPDATE ${tableName} SET ${updateData} WHERE ${idColumn} = ?`;

    const values = [...Object.values(newData), idValue];

    db.run(sql, values, function (err: any) {
      if (err) {
        reject({
          status: 500,
          message: "Error al actualizar el documento:",
          error: err,
        });
      } else {
        if (this.changes > 0) {
          resolve({
            stauts: 201,
            message: "Elemento actualizado",
          });
        } else {
          reject(new Error("No se encontró el documento para actualizar."));
        }
      }
    });
  });
}

export async function deleteDoc(
  db: sqlite3.Database,
  tableName: string,
  queryOptions: QueryOptions
): Promise<void> {
  try {
    const docRef = await doc(db, tableName, queryOptions);

    if (!docRef) {
      throw new Error("No se encontró el documento para eliminar.");
    }

    const idColumn = Object.keys(queryOptions)[0];
    const idValue = Object.values(queryOptions)[0];
    const sql = `DELETE FROM ${tableName} WHERE ${idColumn} = ?`;

    await new Promise<void>((resolve, reject) => {
      db.run(sql, [idValue], function (err: any) {
        if (err) {
          reject({
            status: 500,
            message: "Error al eliminar el documento:",
            error: err,
          });
        } else {
          if (this.changes > 0) {
            resolve();
          } else {
            reject(new Error("No se encontró el documento para eliminar."));
          }
        }
      });
    });
  } catch (error) {
    throw error;
  }
}
export function doc(
  db: sqlite3.Database,
  tableName: string,
  value: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM ${tableName} WHERE ${
      Object.keys(value)[0]
    } = ? LIMIT 1`;

    db.get(sql, [Object.values(value)[0]], (err: any, row: any) => {
      if (err) {
        reject({
          status: 500,
          message: "Error al obtener el registro:",
          error: err,
        });
      } else {
        resolve(row);
      }
    });
  });
}
export function getDoc(
  collection: Collection,
  queryOptions?: QueryOptions
): Promise<any> {
  const { db, table } = collection;

  return new Promise((resolve, reject) => {
    const tableExistsQuery = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
    const columnExistsQuery = `PRAGMA table_info(${table})`;

    db.get(tableExistsQuery, [table], (err: any, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      if (!row) {
        resolve(false);
        return;
      }
      db.all(columnExistsQuery, [], (err: any, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        const columnExists = rows.some(
          (row) => row.name === queryOptions?.column
        );
        if (!columnExists) {
          resolve(false);
          return;
        }

        executeQuery(db, table, queryOptions, resolve, reject);
      });
    });
  });
}

function executeQuery(
  db: any,
  table: string,
  queryOptions: QueryOptions | undefined,
  resolve: any,
  reject: any
) {
  let sql = `SELECT * FROM ${table}`;
  let params: any[] = [];

  if (queryOptions) {
    sql += ` WHERE ${queryOptions.column} ${queryOptions.operand} ?`;
    params.push(queryOptions.value);
  }

  sql += " LIMIT 1";

  db.get(sql, params, (err: any, row: any) => {
    if (err) {
      reject(err);
    } else {
      resolve(row);
    }
  });
}

export async function queryDoc(
  db: sqlite3.Database,
  query: string,
  params: any[]
): Promise<any> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err: any, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}
