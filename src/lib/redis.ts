import { Redis } from "ioredis"
// Connect to Redis via default params and port without password (Default)
export const redis = new Redis()