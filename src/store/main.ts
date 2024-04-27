import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';

export class getStore {
  private readonly dbFile: string;
  public db: sqlite3.Database;
  private options: QueryOptions;

  constructor(tableName: string) {
    this.dbFile = '__d.sqlite';
    const dbExists = fs.existsSync(this.dbFile);

    if (!dbExists) {
      fs.closeSync(fs.openSync(this.dbFile, 'w'));
    }

    this.db = new sqlite3.Database(this.dbFile);
    this.options = { tableName };
  }

  public where(field: string, value: any): this {
    this.options.where = { field, value };
    return this;
  }

  public collection(db: sqlite3.Database, tableName: string): Collection {
    return { db, tableName };
  }

  public async getDocs(query: Query | Collection): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if ('db' in query && 'tableName' in query) {
        const { db, tableName } = query;
        let sql = `SELECT * FROM ${tableName}`;
        db.all(sql, (err: any, rows: any[]) => {
          if (err) {
            reject({
              status: 500,
              message: 'Error al obtener los registros:',
              error: err
            });
          } else {
            resolve(rows);
          }
        });
      } else if (
        'collection' in query &&
        'field' in query &&
        'operator' in query &&
        'value' in query
      ) {
        const { collection, field, operator, value } = query;
        let sql = `SELECT * FROM ${collection.tableName}`;
        switch (operator) {
          case '==':
            sql += ` WHERE ${field} = ?`;
            break;
          case '!=':
            sql += ` WHERE ${field} != ?`;
            break;
          default:
            reject('Operador no válido.');
        }
        collection.db.all(sql, [value], (err: any, rows: any[]) => {
          if (err) {
            reject({
              status: 500,
              message: 'Error al obtener los registros:',
              error: err
            });
          } else {
            resolve(rows);
          }
        });
      } else {
        reject('Entrada no válida.');
      }
    });
  }

  public addDoc(tableName: string, record: Record<string, any>): Promise<string> {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(record);
      const values = Object.values(record);
      const placeholders = Array(keys.length).fill('?').join(',');

      const sql = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`;

      this.db.run(sql, values, (err: any) => {
        if (err) {
          reject(
            JSON.stringify({
              status: 501,
              message: 'Error al insertar el registro:',
              err
            })
          );
        } else {
          resolve(
            JSON.stringify({
              status: 200,
              message: 'Registro insertado correctamente.'
            })
          );
        }
      });
    });
  }

  public updateDoc(
    tableName: string,
    id: number,
    updatedFields: Record<string, any>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(updatedFields);
      const values = Object.values(updatedFields);
      const placeholders = keys.map((key) => `${key} = ?`).join(',');

      const sql = `UPDATE ${tableName} SET ${placeholders} WHERE id = ?`;
      values.push(id);

      this.db.run(sql, values, (err: any) => {
        if (err) {
          reject(
            JSON.stringify({
              status: 500,
              message: 'Error al actualizar el registro:',
              err
            })
          );
        } else {
          resolve(
            JSON.stringify({
              status: 200,
              message: 'Registro actualizado correctamente.'
            })
          );
        }
      });
    });
  }

  public removeDoc(tableName: string, id: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM ${tableName} WHERE id = ?`;

      this.db.run(sql, [id], (err: any) => {
        if (err) {
          reject(
            JSON.stringify({
              status: 500,
              message: 'Error al eliminar el registro:',
              err
            })
          );
        } else {
          resolve(
            JSON.stringify({
              status: 200,
              message: 'Registro eliminado correctamente.'
            })
          );
        }
      });
    });
  }
  public async doc(db: sqlite3.Database, tableName: string, value: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM ${tableName} WHERE ${Object.keys(value)[0]} = ? LIMIT 1`;

      db.get(sql, [Object.values(value)[0]], (err: any, row: any) => {
        if (err) {
          reject({
            status: 500,
            message: 'Error al obtener el registro:',
            error: err
          });
        } else {
          resolve(row);
        }
      });
    });
  }

  public async getDoc(query: Query | Collection): Promise<any> {
    return new Promise((resolve, reject) => {
      if ('db' in query && 'tableName' in query) {
        // Si es un Collection
        const { db, tableName } = query;
        let sql = `SELECT * FROM ${tableName} LIMIT 1`;
        db.get(sql, (err: any, row: any) => {
          if (err) {
            reject({
              status: 500,
              message: 'Error al obtener el registro:',
              error: err
            });
          } else {
            resolve(row);
          }
        });
      } else if (
        'collection' in query &&
        'field' in query &&
        'operator' in query &&
        'value' in query
      ) {
        // Si es un Query
        const { collection, field, operator, value } = query;
        let sql = `SELECT * FROM ${collection.tableName}`;
        switch (operator) {
          case '==':
            sql += ` WHERE ${field} = ?`;
            break;
          case '!=':
            sql += ` WHERE ${field} != ?`;
            break;
          // Agrega otros operadores según sea necesario
          default:
            reject('Operador no válido.');
        }
        collection.db.get(sql, [value], (err: any, row: any) => {
          if (err) {
            reject({
              status: 500,
              message: 'Error al obtener el registro:',
              error: err
            });
          } else {
            resolve(row);
          }
        });
      } else {
        reject('Entrada no válida.');
      }
    });
  }
}
