import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import {
  StorageProvider,
  StorageUploadResult,
} from '../interfaces/storage-provider.interface';

@Injectable()
export class SupabaseStorageProvider extends StorageProvider {
  private readonly client: SupabaseClient;
  private readonly bucket: string;
  private readonly logger = new Logger(SupabaseStorageProvider.name);

  constructor(private config: ConfigService) {
    super();
    this.client = createClient(
      config.get<string>('SUPABASE_URL')!,
      config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    this.bucket = config.get<string>('SUPABASE_BUCKET', 'food-images');
  }

  async upload(
    buffer: Buffer,
    mimeType: string,
    userId: string,
  ): Promise<StorageUploadResult> {
    const ext = mimeType.split('/')[1]; // jpeg, png, webp
    const date = format(new Date(), 'yyyy-MM-dd');
    const uuid = randomUUID();
    const storageKey = `${userId}/${date}/${uuid}.${ext}`;

    let { error } = await this.client.storage
      .from(this.bucket)
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error && (error.message?.includes('not found') || error.message?.includes('Bucket') || (error as any).statusCode === '404')) {
      this.logger.warn(`Bucket "${this.bucket}" not found. Attempting auto-creation...`);
      try {
        await this.client.storage.createBucket(this.bucket, { public: true });
        const retry = await this.client.storage
          .from(this.bucket)
          .upload(storageKey, buffer, {
            contentType: mimeType,
            upsert: false,
          });
        error = retry.error;
      } catch (createErr: any) {
        this.logger.error('Failed to auto-create bucket', createErr?.message);
      }
    }

    if (error) {
      this.logger.error(`Supabase upload failed: ${error.message}`);
      throw new Error(`STORAGE_UPLOAD_FAILED: ${error.message}`);
    }

    return { storageKey };
  }

  async getSignedUrl(storageKey: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresIn);

    if (error || !data?.signedUrl) {
      this.logger.error('Signed URL generation failed', error?.message);
      return '';
    }

    return data.signedUrl;
  }

  async delete(storageKey: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([storageKey]);

    if (error) {
      this.logger.warn(`Storage delete failed for key: ${storageKey}`, error.message);
    }
  }
}
