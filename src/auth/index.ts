import * as bcrypt from "bcrypt";
import { getStore } from "../store";

const db = getStore();

export interface User {
  id: number;
  displayName: string;
  role: string;
  email: string;
  password: string;
  displayImage: string;
}

let currentUser: User | null = null;

export function getAuth(): { currentUser: User | null } {
  //@TODO implementar opciones en la conf del proj
  return { currentUser };
}

export async function loginWithEmailAndPassword(
  email: string,
  password: string
): Promise<User | null> {
  const query = "SELECT * FROM users WHERE email = ?";
  return new Promise((resolve, reject) => {
    db.get(query, [email], async (err, row: any) => {
      if (err) {
        reject(err);
      } else {
        if (!row) {
          resolve(null);
        } else {
          const isValidPassword = await bcrypt.compare(password, row.password);
          if (isValidPassword) {
            const currentUser: User = {
              id: row.id,
              email: row.email,
              password: row.password,
              displayName: row.displayName,
              role: row.role,
              displayImage: row.displayImage,
            };
            setCurrentUser(currentUser);
            resolve(currentUser);
          } else {
            resolve(null);
          }
        }
      }
    });
  });
}

export async function createUserWithEmailAndPassword(
  email: string,
  password: string
): Promise<User | null> {
  const hashedPassword = await bcrypt.hash(password, 10);
  const query =
    'INSERT INTO users (email, password, displayName, role, displayImage) VALUES (?, ?, "", "","")';
  return new Promise((resolve, reject) => {
    db.run(query, [email, hashedPassword], function (err) {
      if (err) {
        reject(err);
      } else {
        const currentUser: User = {
          id: this.lastID,
          email,
          password: hashedPassword,
          displayName: "",
          role: "",
          displayImage: "",
        };
        setCurrentUser(currentUser);
        resolve(currentUser);
      }
    });
  });
}

function setCurrentUser(user: User | null) {
  currentUser = user;
}
