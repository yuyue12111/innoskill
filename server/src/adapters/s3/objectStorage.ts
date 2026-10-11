import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorage } from "../../ports/objectStorage.js";

export function createS3ObjectStorage(client: S3Client, bucket: string): ObjectStorage {
  const getObject = async (key: string) => {
    try {
      return await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  };

  return {
    async put(key, bytes, contentType) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }));
    },

    async exists(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch (err) {
        if (isNotFound(err)) return false;
        throw err;
      }
    },

    async getBytes(key) {
      const object = await getObject(key);
      return object?.Body ? object.Body.transformToByteArray() : null;
    },

    async getStream(key) {
      const object = await getObject(key);
      if (!object?.Body) return null;
      return { body: object.Body.transformToWebStream(), size: object.ContentLength ?? null };
    },

    async deleteMany(keys) {
      // 一个版本最多 100 个文件 + 1 个整包,不超过 DeleteObjects 单次 1000 的上限
      if (keys.length === 0) return;
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    },

    presignGet(key, expiresInSeconds, downloadName) {
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${downloadName}"`,
        }),
        { expiresIn: expiresInSeconds },
      );
    },
  };
}

const isNotFound = (err: unknown) =>
  err instanceof Error && (err.name === "NotFound" || err.name === "NoSuchKey");
