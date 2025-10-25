/**
 * Sequential Flow - JavaScript Execution with Pause/Resume
 * Uses sequential-fetch library for cross-runtime compatibility
 */

const { SequentialFetchVM } = require('sequential-fetch');

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
}

class SequentialFlow {
  static defaultStorage = new InMemoryStorage();

  static setDefaultStorage(storage) {
    this.defaultStorage = storage;
  }

  static async execute(request, options = {}) {
    const {
      storage = this.defaultStorage,
      saveToStorage = true,
      ttl = 2 * 60 * 60 * 1000
    } = options;

    const taskId = request.id || `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const vm = new SequentialFetchVM();

    try {
      await vm.initialize();
      const result = await vm.executeCode(request.code);

      const task = {
        id: taskId,
        name: request.name || taskId,
        code: request.code,
        status: result.type === 'pause' ? 'paused' : result.type === 'complete' ? 'completed' : 'error',
        result: result.result,
        error: result.error,
        vmState: result.state,
        pausedState: result.type === 'pause' ? vm.paused : null,
        fetchRequest: result.fetchRequest,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl).toISOString()
      };

      if (saveToStorage && task.status === 'paused') {
        await storage.save(task);
      }

      return task;
    } catch (error) {
      const task = {
        id: taskId,
        name: request.name || taskId,
        code: request.code,
        status: 'error',
        error: error.message,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl).toISOString()
      };

      return task;
    } finally {
      vm.dispose();
    }
  }

  static async resume(request, options = {}) {
    const {
      storage = this.defaultStorage
    } = options;

    const { taskId, vmState, pausedState, originalCode, fetchResponse } = request;

    const storedTask = await storage.load(taskId);
    if (!storedTask) {
      throw new Error(`Task ${taskId} not found in storage`);
    }

    const vm = new SequentialFetchVM();

    try {
      await vm.initialize();

      // Restore the paused state in the VM
      if (pausedState || storedTask.pausedState) {
        vm.paused = pausedState || storedTask.pausedState;
      }

      // Resume execution from the paused state
      const result = await vm.resumeExecution(vmState, fetchResponse.data || fetchResponse);

      const task = {
        id: taskId,
        name: storedTask.name,
        code: originalCode || storedTask.code,
        status: result.type === 'pause' ? 'paused' : result.type === 'complete' ? 'completed' : 'error',
        result: result.result,
        error: result.error,
        vmState: result.state,
        pausedState: result.type === 'pause' ? vm.paused : null,
        fetchRequest: result.fetchRequest,
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      if (task.status === 'paused') {
        await storage.save(task);
      } else if (task.status === 'completed' || task.status === 'error') {
        await storage.delete(taskId);
      }

      return task;
    } catch (error) {
      const task = {
        id: taskId,
        name: storedTask.name,
        code: originalCode || storedTask.code,
        status: 'error',
        error: error.message,
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      await storage.delete(taskId);
      return task;
    } finally {
      vm.dispose();
    }
  }

  static async getTask(taskId, options = {}) {
    const { storage = this.defaultStorage } = options;
    return storage.load(taskId);
  }

  static async deleteTask(taskId, options = {}) {
    const { storage = this.defaultStorage } = options;
    await storage.delete(taskId);
  }
}

module.exports = {
  SequentialFlow,
  InMemoryStorage
};
