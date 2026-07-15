import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { SupabaseStorageProvider } from './providers/supabase.provider';
import { LocalStorageProvider } from './providers/local.provider';

@Module({
  providers: [
    LocalStorageProvider,
    SupabaseStorageProvider,
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (
        config: ConfigService,
        supabase: SupabaseStorageProvider,
        local: LocalStorageProvider,
      ) => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'supabase');
        const supabaseUrl = config.get<string>('SUPABASE_URL', '');

        if (provider === 'local' || supabaseUrl.includes('placeholder')) {
          return local;
        }
        return supabase;
      },
      inject: [ConfigService, SupabaseStorageProvider, LocalStorageProvider],
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
