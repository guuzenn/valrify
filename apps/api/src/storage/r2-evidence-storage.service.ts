import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { EvidenceStorage, StoredEvidence } from "./evidence-storage";

export type R2StorageConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export type R2ObjectClient = {
  putObject(input: {
    bucket: string;
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void>;
  getObject(input: { bucket: string; key: string }): Promise<Uint8Array>;
};

function required(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} wajib diisi ketika STORAGE_DRIVER=r2.`);
  return value;
}

export function readR2StorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): R2StorageConfig {
  const endpoint = required(env, "STORAGE_ENDPOINT").replace(/\/$/, "");
  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new Error("STORAGE_ENDPOINT harus berupa URL HTTP(S) yang valid.");
  }
  if (!['http:', 'https:'].includes(parsedEndpoint.protocol)) {
    throw new Error("STORAGE_ENDPOINT harus berupa URL HTTP(S) yang valid.");
  }

  return {
    endpoint,
    bucket: required(env, "STORAGE_BUCKET"),
    accessKeyId: required(env, "STORAGE_ACCESS_KEY"),
    secretAccessKey: required(env, "STORAGE_SECRET_KEY"),
    region: env.STORAGE_REGION?.trim() || "auto",
  };
}

class AwsR2ObjectClient implements R2ObjectClient {
  private readonly client: S3Client;

  constructor(config: R2StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async putObject(input: {
    bucket: string;
    key: string;
    body: Buffer;
    contentType: string;
  }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async getObject(input: { bucket: string; key: string }) {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: input.bucket, Key: input.key }),
    );
    if (!result.Body) throw new Error("Isi bukti tidak ditemukan di storage.");
    return result.Body.transformToByteArray();
  }
}

function validateStorageKey(key: string) {
  const parts = key.split("/");
  if (!key || key.startsWith("/") || key.includes("\\") || parts.includes("..")) {
    throw new Error("Storage key tidak valid");
  }
}

export class R2EvidenceStorage extends EvidenceStorage {
  private readonly client: R2ObjectClient;

  constructor(
    private readonly config: R2StorageConfig = readR2StorageConfig(),
    client?: R2ObjectClient,
    private readonly createId: () => string = randomUUID,
  ) {
    super();
    this.client = client ?? new AwsR2ObjectClient(config);
  }

  async put(
    file: Express.Multer.File,
    reportId: number,
  ): Promise<StoredEvidence> {
    const key = `${reportId}/${this.createId()}`;
    await this.client.putObject({
      bucket: this.config.bucket,
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    return {
      key,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async get(key: string): Promise<Buffer> {
    validateStorageKey(key);
    const bytes = await this.client.getObject({
      bucket: this.config.bucket,
      key,
    });
    return Buffer.from(bytes);
  }
}
