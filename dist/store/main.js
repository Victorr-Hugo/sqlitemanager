"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = void 0;
const fs = require("fs");
const sqlite3 = require("sqlite3");
class getStore {
  constructor(tableName) {
    this.dbFile = "__d.sqlite";
    const dbExists = fs.existsSync(this.dbFile);
    if (!dbExists) {
      fs.closeSync(fs.openSync(this.dbFile, "w"));
    }
    this.db = new sqlite3.Database(this.dbFile);
    this.options = { tableName };
  }
  where(field, value) {
    this.options.where = { field, value };
    return this;
  }
  collection(db, tableName) {
    return { db, tableName };
  }
  async getDocs(query) {
    return new Promise((resolve, reject) => {
      if ("db" in query && "tableName" in query) {
        const { db, tableName } = query;
        let sql = `SELECT * FROM ${tableName}`;
        db.all(sql, (err, rows) => {
          if (err) {
            reject({
              status: 500,
              message: "Error al obtener los registros:",
              error: err,
            });
          } else {
            resolve(rows);
          }
        });
      } else if (
        "collection" in query &&
        "field" in query &&
        "operator" in query &&
        "value" in query
      ) {
        const { collection, field, operator, value } = query;
        let sql = `SELECT * FROM ${collection.tableName}`;
        switch (operator) {
          case "==":
            sql += ` WHERE ${field} = ?`;
            break;
          case "!=":
            sql += ` WHERE ${field} != ?`;
            break;
          case ">":
            sql += ` WHERE ${field} > ?`;
            break;
          case "<":
            sql += ` WHERE ${field} < ?`;
            break;
          case ">=":
            sql += ` WHERE ${field} >= ?`;
            break;
          case "<=":
            sql += ` WHERE ${field} <= ?`;
            break;
          case "LIKE":
            sql += ` WHERE ${field} LIKE ?`;
            break;
          case "IN":
            sql += ` WHERE ${field} IN (${value.map(() => "?").join(", ")})`;
            break;
          default:
            reject("Operador no válido.");
            return;
        }
        collection.db.all(sql, [value], (err, rows) => {
          if (err) {
            reject({
              status: 500,
              message: "Error al obtener los registros:",
              error: err,
            });
          } else {
            resolve(rows);
          }
        });
      } else {
        reject("Entrada no válida.");
      }
    });
  }
  addDoc(tableName, record) {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(record);
      const values = Object.values(record);
      const placeholders = Array(keys.length).fill("?").join(",");
      const sql = `INSERT INTO ${tableName} (${keys.join(
        ","
      )}) VALUES (${placeholders})`;
      this.db.run(sql, values, (err) => {
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
  updateDoc(tableName, id, updatedFields) {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(updatedFields);
      const values = Object.values(updatedFields);
      const placeholders = keys.map((key) => `${key} = ?`).join(",");
      const sql = `UPDATE ${tableName} SET ${placeholders} WHERE id = ?`;
      values.push(id);
      this.db.run(sql, values, (err) => {
        if (err) {
          reject(
            JSON.stringify({
              status: 500,
              message: "Error al actualizar el registro:",
              err,
            })
          );
        } else {
          resolve(
            JSON.stringify({
              status: 200,
              message: "Registro actualizado correctamente.",
            })
          );
        }
      });
    });
  }
  removeDoc(tableName, id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM ${tableName} WHERE id = ?`;
      this.db.run(sql, [id], (err) => {
        if (err) {
          reject(
            JSON.stringify({
              status: 500,
              message: "Error al eliminar el registro:",
              err,
            })
          );
        } else {
          resolve(
            JSON.stringify({
              status: 200,
              message: "Registro eliminado correctamente.",
            })
          );
        }
      });
    });
  }
  async doc(db, tableName, value) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM ${tableName} WHERE ${
        Object.keys(value)[0]
      } = ? LIMIT 1`;
      db.get(sql, [Object.values(value)[0]], (err, row) => {
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
  async getDoc(query) {
    return new Promise((resolve, reject) => {
      if ("db" in query && "tableName" in query) {
        // Si es un Collection
        const { db, tableName } = query;
        let sql = `SELECT * FROM ${tableName} LIMIT 1`;
        db.get(sql, (err, row) => {
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
      } else if (
        "collection" in query &&
        "field" in query &&
        "operator" in query &&
        "value" in query
      ) {
        const { collection, field, operator, value } = query;
        let sql = `SELECT * FROM ${collection.tableName}`;
        switch (operator) {
          case "==":
            sql += ` WHERE ${field} = ?`;
            break;
          case "!=":
            sql += ` WHERE ${field} != ?`;
            break;
          case ">":
            sql += ` WHERE ${field} > ?`;
            break;
          case "<":
            sql += ` WHERE ${field} < ?`;
            break;
          case ">=":
            sql += ` WHERE ${field} >= ?`;
            break;
          case "<=":
            sql += ` WHERE ${field} <= ?`;
            break;
          case "LIKE":
            sql += ` WHERE ${field} LIKE ?`;
            break;
          case "IN":
            sql += ` WHERE ${field} IN (${value.map(() => "?").join(", ")})`;
            break;
          default:
            reject("Operador no válido.");
            return;
        }
        collection.db.get(sql, [value], (err, row) => {
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
      } else {
        reject("Entrada no válida.");
      }
    });
  }
}
exports.getStore = getStore;
