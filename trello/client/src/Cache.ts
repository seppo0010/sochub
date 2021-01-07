import WebStorageCache from 'web-storage-cache'
import sha1 from 'sha1'
import stringify from 'json-stringify-deterministic'

const wsCache = new WebStorageCache();

export const fetchOrCreate  = async <T, U>(key: T, exp: number, createCallback: () => Promise<any>): Promise<U> => {
    wsCache.deleteAllExpires();
    const cacheKey = sha1(stringify(key))
    const cached = wsCache.get(cacheKey)
    if (cached) {
        return cached
    }
    const value = await createCallback()
    wsCache.set(cacheKey, value, {exp})
    return value;
}

export const remove = async <T>(key: T): Promise<void> => {
    wsCache.deleteAllExpires();
    const cacheKey = sha1(stringify(key))
    wsCache.delete(cacheKey)
}
