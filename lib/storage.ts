import { mkdir, unlink, writeFile } from "fs/promises";
import { join, resolve, sep } from "path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Stockage des fichiers générés ou téléversés.
 *
 * - Avec les variables R2_* : Cloudflare R2 (compatible S3), utilisable en production sur Vercel.
 * - Sans elles : disque local sous `public/uploads/` (développement uniquement).
 *
 * Dans les deux cas, la fonction retourne l'URL à stocker en base (`fileUrl`).
 */

const LOCAL_ROOT = join(process.cwd(), "public", "uploads");

function getR2Config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
    return null;
  }
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    publicUrl: R2_PUBLIC_URL.replace(/\/+$/, ""),
  };
}

let cachedClient: S3Client | null = null;

function getClient(config: NonNullable<ReturnType<typeof getR2Config>>) {
  cachedClient ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return cachedClient;
}

/** Normalise un dossier (« documents », « /certificates/ »…) et refuse tout segment relatif. */
function cleanFolder(folder: string) {
  const segments = folder
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
  if (segments.some(segment => segment === "." || segment === "..")) {
    throw new Error("Dossier de stockage invalide");
  }
  return segments.join("/");
}

export async function saveFile(params: {
  folder: string;
  filename: string;
  body: Uint8Array;
  contentType: string;
}): Promise<string> {
  const folder = cleanFolder(params.folder);
  const key = folder ? `${folder}/${params.filename}` : params.filename;

  const r2 = getR2Config();
  if (r2) {
    await getClient(r2).send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
        // Les noms de fichiers sont des identifiants uniques : le contenu ne change jamais.
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return `${r2.publicUrl}/${key}`;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Stockage de fichiers non configuré : définissez R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET et R2_PUBLIC_URL."
    );
  }

  const dir = join(LOCAL_ROOT, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, params.filename), params.body);
  return `/uploads/${key}`;
}

/**
 * Chemin (clé) d'un fichier dans le stockage à partir de son URL publique,
 * ou null si l'URL n'appartient pas à ce stockage (lien externe, avatar prédéfini…).
 */
export function storageKeyFromUrl(url: string): string | null {
  const r2 = getR2Config();
  if (r2 && url.startsWith(`${r2.publicUrl}/`)) return url.slice(r2.publicUrl.length + 1);
  if (url.startsWith("/uploads/")) return url.slice("/uploads/".length);
  return null;
}

/** Supprime un fichier du stockage (R2 ou disque local). Sans effet si l'URL n'est pas la nôtre. */
export async function deleteFile(url: string): Promise<void> {
  const key = storageKeyFromUrl(url);
  if (!key || key.split("/").some(segment => segment === ".." || segment === ".")) return;

  const r2 = getR2Config();
  if (r2 && url.startsWith(`${r2.publicUrl}/`)) {
    await getClient(r2).send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));
    return;
  }

  // Disque local : le chemin résolu doit rester dans le dossier des téléversements.
  const target = resolve(LOCAL_ROOT, key);
  if (!target.startsWith(resolve(LOCAL_ROOT) + sep)) return;
  await unlink(target).catch(() => undefined);
}
