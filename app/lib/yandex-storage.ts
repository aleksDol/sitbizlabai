import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.YANDEX_STORAGE_ENDPOINT?.trim() ?? "";
const bucket = process.env.YANDEX_STORAGE_BUCKET?.trim() ?? "";
const region = process.env.YANDEX_STORAGE_REGION?.trim() ?? "ru-central1";
const accessKeyId = process.env.YANDEX_STORAGE_ACCESS_KEY?.trim() ?? "";
const secretAccessKey = process.env.YANDEX_STORAGE_SECRET_KEY?.trim() ?? "";

function assertStorageConfig(): void {
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Yandex storage is not configured.");
  }
}

function getClient(): S3Client {
  assertStorageConfig();

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function guessExtension(fileName: string, mimeType: string): string {
  const byMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };

  if (byMime[mimeType]) {
    return byMime[mimeType];
  }

  const fileExt = fileName.split(".").pop()?.toLowerCase();
  return fileExt && /^[a-z0-9]+$/.test(fileExt) ? fileExt : "bin";
}

function buildPublicUrl(objectKey: string): string {
  const normalizedEndpoint = endpoint.replace(/\/+$/, "");
  return `${normalizedEndpoint}/${bucket}/${objectKey}`;
}

export async function uploadImageToYandexStorage(file: File): Promise<string> {
  assertStorageConfig();

  const ext = guessExtension(file.name, file.type);
  const objectKey = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return buildPublicUrl(objectKey);
}
