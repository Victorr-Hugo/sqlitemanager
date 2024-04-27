import * as fs from "fs";
import * as path from "path";

interface Metadata {
  filename?: string;
  contentType?: string;
}

interface UploadedFile {
  filename: string;
  contentType?: string;
  path: string;
}

export function getStorage(): string {
  return "__storage";
}

export function uploadBytes(
  storageRef: string,
  buffer: Buffer,
  metadata?: Metadata
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const fileName = metadata?.filename || "archivo";
    const filePath = path.join(getStorage(), fileName);

    if (!fs.existsSync(getStorage())) {
      fs.mkdirSync(getStorage());
    }

    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(err);
      } else {
        const uploadedFile: UploadedFile = {
          filename: fileName,
          contentType: metadata?.contentType,
          path: filePath,
        };
        resolve(uploadedFile);
      }
    });
  });
}

export function uploadString(
  storageRef: string,
  base64String: string,
  metadata?: Metadata
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(base64String, "base64");
    uploadBytes(storageRef, buffer, metadata)
      .then((uploadedFile) => {
        resolve(uploadedFile);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export function deleteObject(
  storage: string,
  storageRef: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const filePath = storageRef.startsWith("/")
      ? storageRef
      : `${storage}/${storageRef}`;

    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      reject(new Error("El archivo no existe."));
    }
  });
}
