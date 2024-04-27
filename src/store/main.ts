import * as fs from "fs";
import * as sqlite3 from "sqlite3";
import * as path from "path";

export function getStore(): sqlite3.Database {
  const dbFile = "__d.sqlite";
  const dbExists = fs.existsSync(dbFile);

  if (!dbExists) {
    fs.closeSync(fs.openSync(dbFile, "w"));
  }
  scheduleDailyBackup(dbFile);

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
): Promise<string> {
  return new Promise((resolve, reject) => {
    const keys = Object.keys(record);
    const values = Object.values(record);
    const placeholders = Array(keys.length).fill("?").join(",");

    const sql = `INSERT INTO ${tableName} (${keys.join(
      ","
    )}) VALUES (${placeholders})`;

    db.run(sql, values, (err: any) => {
      if (err) {
        reject(
          JSON.stringify({
            status: 501,
            message: "Error al insertar el registro:",
            err,
          })
        );
      } else {
        resolve(
          JSON.stringify({
            status: 200,
            message: "Registro insertado correctamente.",
          })
        );
      }
    });
  });
}

export function updateDoc(
  db: sqlite3.Database,
  docRef: any,
  newData: any
): Promise<void> {
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
          resolve();
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
  });
}
