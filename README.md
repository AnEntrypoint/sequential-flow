# Sequential Flow

Explicit xstate VM with state graphs for complex workflows. Built on sequential-fetch.

## Installation

```bash
npm install sequential-flow
```

## Usage

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

if (result.status === 'paused') {
  const resumed = await SequentialFlow.resume({
    taskId: result.id,
    vmState: result.vmState,
    originalCode: result.code,
    fetchResponse: { data: { id: 123, name: 'Alice' } }
  });
}
```

## Storage Options

```javascript
const { SequentialFlow, InMemoryStorage } = require('sequential-flow');

SequentialFlow.setDefaultStorage(new InMemoryStorage());
```

Supported: InMemoryStorage, RedisStorage, SQLStorage, FirestoreStorage, CustomStorage

## API

### SequentialFlow.execute(request, options)

```javascript
const result = await SequentialFlow.execute({
  id: 'task-1',
  name: 'My Task',
  code: 'const x = 5; x * 2'
}, {
  storage: myStorage,
  saveToStorage: true,
  ttl: 7200000
});
```

### SequentialFlow.resume(request, options)

```javascript
const result = await SequentialFlow.resume({
  taskId: 'task-1',
  vmState: previousResult.vmState,
  originalCode: previousResult.code,
  fetchResponse: { data: responseData }
});
```

### SequentialFlow.getTask(taskId)

### SequentialFlow.deleteTask(taskId)

### SequentialFlow.setDefaultStorage(storage)

## Result Object

```javascript
{
  id: 'task-1',
  status: 'running' | 'paused' | 'completed' | 'error',
  result: value,
  error: message,
  vmState: executionState,
  fetchRequest: { id, url, options }
}
```

## Edge Function Support

Works with Supabase, Firebase, Vercel, Deno Deploy edge functions.

## License

MIT
