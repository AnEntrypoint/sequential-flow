# Sequential Flow

Production-grade JavaScript execution library with automatic pause/resume on fetch calls and custom storage. Built for edge functions, serverless environments, and any JavaScript runtime. Uses the lightweight sequential-fetch library for cross-runtime compatibility.

## Features

- ✅ **JavaScript Execution** - Execute JavaScript code with automatic pause/resume
- ✅ **Automatic Pause/Resume** - Pauses on every `fetch()` call
- ✅ **Custom Storage** - Pluggable storage with In-Memory, Redis, SQL, and Firestore support
- ✅ **Edge Function Ready** - Works in Supabase, Firebase, Vercel, Deno Deploy, and other edge environments
- ✅ **State Management** - Full task lifecycle with TTL and cleanup
- ✅ **Cross-Runtime** - Works in Node.js, Bun, Deno, and Google Apps Script
- ✅ **Zero Core Dependencies** - Uses sequential-fetch library only

## Installation

```bash
npm install sequential-flow
```

```bash
deno add npm:sequential-flow
```

## Quick Start

### Basic Execution

```javascript
const { SequentialFlow } = require('sequential-flow');

const result = await SequentialFlow.execute({
  id: 'my-task',
  code: `
    const userId = 123;
    const user = fetch('https://api.example.com/user/' + userId);
    user.name
  `
});

// result.status === 'paused'
// result.fetchRequest.url === 'https://api.example.com/user/123'
// result.vmState contains execution state
```

### Resume Execution

```javascript
if (result.status === 'paused') {
  const resumed = await SequentialFlow.resume({
    taskId: result.id,
    vmState: result.vmState,
    originalCode: result.code,
    fetchResponse: {
      data: { id: 123, name: 'Alice' }
    }
  });

  // resumed.status === 'completed'
  // resumed.result === 'Alice'
}
```

### Multiple Sequential Fetches

```javascript
const result1 = await SequentialFlow.execute({
  id: 'task-1',
  code: `
    const user = fetch('api/user/1');
    const posts = fetch('api/posts?userId=' + user.id);
    { user: user.name, postCount: posts.length }
  `
});

// First pause at first fetch
const result2 = await SequentialFlow.resume({
  taskId: result1.id,
  vmState: result1.vmState,
  originalCode: result1.code,
  fetchResponse: { data: { id: 42, name: 'Alice' } }
});

// Second pause at second fetch
if (result2.status === 'paused') {
  const result3 = await SequentialFlow.resume({
    taskId: result2.id,
    vmState: result2.vmState,
    originalCode: result2.code,
    fetchResponse: { data: { length: 5 } }
  });

  // result3.result === { user: 'Alice', postCount: 5 }
}
```

## Storage Options

### In-Memory Storage (Default)

```javascript
const { SequentialFlow, InMemoryStorage } = require('sequential-flow');

const storage = new InMemoryStorage();
SequentialFlow.setDefaultStorage(storage);

const result = await SequentialFlow.execute({
  id: 'task-1',
  code: 'const x = 5; x * 2'
});
```

### Redis Storage

```javascript
const { SequentialFlow } = require('sequential-flow');
const { RedisStorage } = require('sequential-flow/storage');
const redis = require('redis');

const client = redis.createClient({ url: 'redis://localhost:6379' });
await client.connect();

const storage = new RedisStorage(client);
SequentialFlow.setDefaultStorage(storage);
```

### SQL Storage (PostgreSQL, MySQL, SQLite)

```javascript
const { SequentialFlow } = require('sequential-flow');
const { SQLStorage } = require('sequential-flow/storage');
const pool = require('pg').Pool;

const pgPool = new pool();

const storage = new SQLStorage(
  (sql, params) => pgPool.query(sql, params),
  { tableName: 'sequential_flow_tasks' }
);

SequentialFlow.setDefaultStorage(storage);

// Create table (run once):
// CREATE TABLE sequential_flow_tasks (
//   id VARCHAR(255) PRIMARY KEY,
//   data JSONB NOT NULL,
//   created_at TIMESTAMP,
//   expires_at TIMESTAMP
// );
```

### Firestore Storage

```javascript
const { SequentialFlow } = require('sequential-flow');
const { FirestoreStorage } = require('sequential-flow/storage');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const storage = new FirestoreStorage(db, 'sequential_flow_tasks');
SequentialFlow.setDefaultStorage(storage);
```

### Custom Storage

```javascript
const { SequentialFlow } = require('sequential-flow');
const { CustomStorage } = require('sequential-flow/storage');

class MyCustomStorage extends CustomStorage {
  async save(task) {
    // Implement your storage logic
  }

  async load(taskId) {
    // Retrieve task from storage
  }

  async delete(taskId) {
    // Delete task from storage
  }
}

const storage = new MyCustomStorage();
SequentialFlow.setDefaultStorage(storage);
```

## API Reference

### SequentialFlow.execute(request, options)

Execute JavaScript code with automatic pause on fetch.

**Parameters:**
- `request.id` - Unique task identifier
- `request.name` - Optional task name
- `request.code` - JavaScript code to execute

**Options:**
- `storage` - Storage implementation (default: InMemoryStorage)
- `saveToStorage` - Save paused tasks to storage (default: true)
- `ttl` - Task expiration time in milliseconds (default: 2 hours)

**Returns:** Task object with:
- `id` - Task ID
- `status` - 'running' | 'paused' | 'completed' | 'error'
- `result` - Execution result (if completed)
- `error` - Error message (if error)
- `vmState` - Execution state (if paused)
- `fetchRequest` - Fetch details {id, url, options}

### SequentialFlow.resume(request, options)

Resume execution from paused state.

**Parameters:**
- `taskId` - Task ID from paused result
- `vmState` - Execution state from paused result
- `originalCode` - Original code
- `fetchResponse` - Response object {data, status, statusText}

**Returns:** Task object with same structure as execute()

### SequentialFlow.getTask(taskId, options)

Load a task from storage.

```javascript
const task = await SequentialFlow.getTask('task-1');
```

### SequentialFlow.deleteTask(taskId, options)

Delete a task from storage.

```javascript
await SequentialFlow.deleteTask('task-1');
```

### SequentialFlow.setDefaultStorage(storage)

Set the default storage backend.

```javascript
SequentialFlow.setDefaultStorage(new RedisStorage(client));
```

## Code Execution Capabilities

### Supported

✅ Variable assignment: `const x = 5;`
✅ Expressions: `x + 10`, `x * 2`
✅ Property access: `obj.prop`, `obj.prop.nested`
✅ String concatenation: `"hello " + name`
✅ Objects: `{a: 1, b: 2}`
✅ Arrays: `[1, 2, 3]`
✅ Arithmetic: `+`, `-`, `*`, `/`, `%`
✅ Fetch pausing: `fetch("url")`
✅ Error handling: `throw new Error("msg")`

### Not Supported

❌ Loops (for, while)
❌ Conditionals (if/else)
❌ Functions
❌ async/await
❌ Closures

These limitations are intentional to maintain cross-runtime compatibility. For loops and conditionals, structure your code as sequential fetches.

## Edge Function Examples

### Firebase Functions

```javascript
const functions = require('firebase-functions');
const { SequentialFlow } = require('sequential-flow');

exports.executeFlow = functions.https.onRequest(async (req, res) => {
  const result = await SequentialFlow.execute({
    id: req.body.id,
    code: req.body.code
  });

  res.json(result);
});

exports.resumeFlow = functions.https.onRequest(async (req, res) => {
  const result = await SequentialFlow.resume({
    taskId: req.body.taskId,
    vmState: req.body.vmState,
    originalCode: req.body.code,
    fetchResponse: req.body.response
  });

  res.json(result);
});
```

### Supabase Edge Functions

```typescript
import { SequentialFlow } from 'npm:sequential-flow';

Deno.serve(async (req) => {
  const { id, code } = await req.json();

  const result = await SequentialFlow.execute({ id, code });

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Vercel Edge Functions

```typescript
import { SequentialFlow } from 'sequential-flow';

export default async function handler(req, res) {
  const result = await SequentialFlow.execute({
    id: req.body.id,
    code: req.body.code
  });

  res.json(result);
}
```

## Performance

- **Startup**: Instantaneous (no VM initialization)
- **Memory**: Minimal (no external engine overhead)
- **Speed**: O(n) for n statements
- **Package Size**: ~6 KB

## Comparison with FlowState

| Feature | Sequential Flow | FlowState |
|---------|-----------------|-----------|
| Core Dependency | sequential-fetch | QuickJS |
| Cross-Runtime | ✅ Yes | ❌ Limited |
| Size | ~6 KB | ~50+ KB |
| Dependencies | 0 required | 2+ required |
| Edge Functions | ✅ Yes | ✅ Yes |
| Storage | ✅ Yes | ✅ Yes |
| TypeScript | ✅ Yes | ✅ Yes |

## License

MIT - See LICENSE file

## Support

- GitHub: https://github.com/AnEntrypoint/sequential-flow
- Issues: https://github.com/AnEntrypoint/sequential-flow/issues
