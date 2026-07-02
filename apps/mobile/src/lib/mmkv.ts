/**
 * The one MMKV store the app uses. Shared so the core storage backend
 * (platform.ts) and the Supabase auth client (supabase.ts) read and write the
 * same synchronous key/value store — core's storage.ts contract requires sync
 * reads, and Supabase's session lookup is happy to be sync too.
 */
import { createMMKV } from 'react-native-mmkv'

export const mmkv = createMMKV()
