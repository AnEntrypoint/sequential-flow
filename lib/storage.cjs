/**
 * Storage Implementations for Sequential Flow
 * Extensible storage interfaces for different backends
 */

/**
 * In-Memory Storage
 * Simple in-memory storage for development and testing
 */
class InMemoryStorage {
  constructor() {
    this.storage = new Map();
  }

  async save(task) {
    this.storage.set(task.id, task);
  }

  async load(taskId) {
    return this.storage.get(taskId);
  }

  async delete(taskId) {
    this.storage.delete(taskId);
  }

  async list() {
    return Array.from(this.storage.values());
  }

  async clear() {
    this.storage.clear();
  }
}

/**
 * Redis Storage
 * For distributed systems and persistent storage
 */
class RedisStorage {
  constructor(redisClient, keyPrefix = 'seq-flow:') {
    this.redis = redisClient;
    this.keyPrefix = keyPrefix;
  }

  getKey(taskId) {
    return `${this.keyPrefix}${taskId}`;
  }

  async save(task) {
    const key = this.getKey(task.id);
    const ttl = task.expiresAt ? Math.ceil((new Date(task.expiresAt) - Date.now()) / 1000) : 7200;
    await this.redis.setex(key, ttl, JSON.stringify(task));
  }

  async load(taskId) {
    const key = this.getKey(taskId);
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async delete(taskId) {
    const key = this.getKey(taskId);
    await this.redis.del(key);
  }
}

/**
 * SQL Storage (Generic)
 * Works with any SQL database that has a query interface
 */
class SQLStorage {
  constructor(queryFn, options = {}) {
    this.query = queryFn;
    this.tableName = options.tableName || 'sequential_flow_tasks';
  }

  async save(task) {
    const json = JSON.stringify(task);
    const sql = `
      INSERT INTO ${this.tableName} (id, data, created_at, expires_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET data = ?, expires_at = ?
    `;
    await this.query(sql, [
      task.id,
      json,
      task.createdAt,
      task.expiresAt,
      json,
      task.expiresAt
    ]);
  }

  async load(taskId) {
    const sql = `SELECT data FROM ${this.tableName} WHERE id = ?`;
    const result = await this.query(sql, [taskId]);
    return result && result.length > 0 ? JSON.parse(result[0].data) : null;
  }

  async delete(taskId) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.query(sql, [taskId]);
  }
}

/**
 * Firestore Storage
 * For Google Cloud Firestore integration
 */
class FirestoreStorage {
  constructor(db, collectionName = 'sequential_flow_tasks') {
    this.db = db;
    this.collection = collectionName;
  }

  async save(task) {
    const docRef = this.db.collection(this.collection).doc(task.id);
    await docRef.set(task);
  }

  async load(taskId) {
    const doc = await this.db.collection(this.collection).doc(taskId).get();
    return doc.exists ? doc.data() : null;
  }

  async delete(taskId) {
    await this.db.collection(this.collection).doc(taskId).delete();
  }
}

/**
 * Custom Storage Interface
 * Extend this class to create custom storage implementations
 */
class CustomStorage {
  async save(task) {
    throw new Error('save() method must be implemented');
  }

  async load(taskId) {
    throw new Error('load() method must be implemented');
  }

  async delete(taskId) {
    throw new Error('delete() method must be implemented');
  }
}

module.exports = {
  InMemoryStorage,
  RedisStorage,
  SQLStorage,
  FirestoreStorage,
  CustomStorage
};
