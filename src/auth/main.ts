import * as sqlite3 from "sqlite3";
import * as bcrypt from "bcrypt";

export function getAuth(db: sqlite3.Database) {
  db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
    (err, row) => {
      if (err) {
        console.error(
          "Error al verificar la existencia de la tabla 'users':",
          err.message
        );
        return;
      }

      if (!row) {
        addAuthColumns(db);
      }
    }
  );

  return db;
}

function addAuthColumns(db: sqlite3.Database) {
  db.serialize(() => {
    db.run(
      `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          displayName TEXT,
          email TEXT,
          password TEXT,
          displayImage TEXT
        )
      `,
      (err) => {
        if (err) {
          console.error("Error al crear la tabla 'users':", err.message);
        } else {
          console.log("Tabla 'users' creada con éxito.");
        }
      }
    );
  });
}

export function createUserWithEmailAndPassword(
  db: sqlite3.Database,
  email: string,
  password: string
) {
  bcrypt.hash(password, 10, (err: any, hashedPassword: any) => {
    if (err) {
      console.error("Error al hashear la contraseña:", err);
      return;
    }

    db.run(
      `
        INSERT INTO users (email, password)
        VALUES (?, ?)
      `,
      [email, hashedPassword],
      (insertErr) => {
        if (insertErr) {
          console.error("Error al crear el usuario:", insertErr.message);
        } else {
          console.log("Usuario creado exitosamente.");
        }
      }
    );
  });
}

export function signInWithEmailAndPassword(
  db: sqlite3.Database,
  email: string,
  password: string,
  callback: (error: Error | null, user: any | null) => void
) {
  db.get(
    `
      SELECT * FROM users WHERE email = ?
    `,
    [email],
    (err, row: any) => {
      if (err) {
        console.error("Error al buscar el usuario:", err.message);
        callback(err, null);
        return;
      }

      if (!row) {
        callback(new Error("Usuario no encontrado"), null);
        return;
      }

      bcrypt.compare(password, row.password, (bcryptErr, result) => {
        if (bcryptErr) {
          console.error("Error al comparar contraseñas:", bcryptErr);
          callback(bcryptErr, null);
          return;
        }

        if (result) {
          callback(null, row);
        } else {
          callback(new Error("Contraseña incorrecta"), null);
        }
      });
    }
  );
}

export function onAuthStateChanged(db: sqlite3.Database) {
  let signInListener: ((email: string) => void) | null = null;
  let signOutListener: (() => void) | null = null;

  db.serialize(() => {
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      (err, row) => {
        if (err) {
          console.error(
            "Error al verificar la existencia de la tabla 'users':",
            err.message
          );
          return;
        }

        if (!row) {
          addAuthColumns(db);
        }
      }
    );
  });

  function subscribeListeners(callback: (user: any | null) => void) {
    signInListener = (email: string) => {
      db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        (err, row: any) => {
          if (err) {
            console.error("Error al buscar el usuario:", err.message);
            return;
          }

          if (row) {
            db.run(
              `INSERT INTO authlogs (user_id, event_type) VALUES (?, 'login')`,
              [row.id],
              (insertErr) => {
                if (insertErr) {
                  console.error(
                    "Error al registrar inicio de sesión:",
                    insertErr.message
                  );
                }
              }
            );
          }
        }
      );
    };

    signOutListener = () => {
      db.run(
        `INSERT INTO authlogs (event_type) VALUES ('logout')`,
        (insertErr) => {
          if (insertErr) {
            console.error(
              "Error al registrar cierre de sesión:",
              insertErr.message
            );
          }
        }
      );
    };
  }

  function unsubscribeListeners() {
    signInListener = null;
    signOutListener = null;
  }

  return (callback: (user: any | null) => void) => {
    subscribeListeners(callback);

    return unsubscribeListeners;
  };
}
