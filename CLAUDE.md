# Sequential Flow - AI Context Guide

## Project Overview

**Sequential Flow** is a production-grade JavaScript execution library that automatically pauses/resumes on fetch calls with pluggable storage backends. Built for edge functions, serverless environments, and cross-runtime compatibility (Node.js, Deno, Bun, Google Apps Script).

**Core Value Proposition**: Lightweight alternative to FlowState (~6 KB vs ~50+ KB) using sequential-fetch instead of QuickJS, enabling true cross-runtime support.

## Architecture

### Execution Model
1. **VM Integration**: Wraps `SequentialFetchVM` from the `sequential-fetch` library
2. **Pause/Resume Pattern**: Automatically pauses on every `fetch()` call, stores execution state, resumes with fetch response
3. **State Management**: Task lifecycle with TTL-based expiration and automatic cleanup
4. **Storage Abstraction**: Pluggable storage layer (in-memory, Redis, SQL, Firestore, custom)

### Key Components

#### `/lib/edge-functions.cjs` (Main Entry Point)
- **SequentialFlow**: Static class with core methods (execute, resume, getTask, deleteTask)
- **InMemoryStorage**: Default storage implementation (Map-based)
- **execute()**: Initialize VM, run code, handle pause/complete/error states
- **resume()**: Load task from storage, restore VM state, continue execution
- **State transitions**: running → paused → completed/error
- **TTL**: Default 2 hours for paused tasks

#### `/lib/storage.cjs` (Storage Providers)
- **InMemoryStorage**: Development/testing (Map-based, process-scoped)
- **RedisStorage**: Distributed systems (uses SETEX for TTL)
- **SQLStorage**: Generic SQL adapter (PostgreSQL, MySQL, SQLite)
- **FirestoreStorage**: Google Cloud Firestore integration
- **CustomStorage**: Base class for custom implementations

### Task Object Structure
```javascript
{
  id: string,              // Unique task identifier
  name: string,            // Optional human-readable name
  code: string,            // Original JavaScript code
  status: string,          // 'running' | 'paused' | 'completed' | 'error'
  result: any,             // Execution result (if completed)
  error: string,           // Error message (if failed)
  vmState: object,         // Serialized VM state (for resume)
  pausedState: object,     // VM internal paused state
  fetchRequest: object,    // {id, url, options} for paused fetch
  createdAt: string,       // ISO timestamp
  expiresAt: string,       // TTL expiration timestamp
  updatedAt: string        // ISO timestamp (on resume)
}
```

## Dependencies

### Production
- **sequential-fetch** (^1.0.0): Core VM for JavaScript execution with fetch interception
- **tasker-utils** (^1.0.0): Utility functions for task management

### Peer Dependencies (Optional)
- **redis** (^4.0.0): For RedisStorage
- **firebase-admin** (^11.0.0): For FirestoreStorage

### Zero Core Dependencies
Core functionality has NO external dependencies beyond sequential-fetch.

## Code Capabilities & Limitations

### Supported Features
- ✅ Variable assignment: `const x = 5`
- ✅ Expressions: `x + 10`, `x * 2`
- ✅ Property access: `obj.prop.nested`
- ✅ String operations: `"hello " + name`
- ✅ Objects/Arrays: `{a: 1}`, `[1, 2, 3]`
- ✅ Arithmetic: `+`, `-`, `*`, `/`, `%`
- ✅ Fetch pausing: `fetch("url")`
- ✅ Error handling: `throw new Error()`

### Intentional Limitations (Cross-Runtime Compatibility)
- ❌ Loops (for, while)
- ❌ Conditionals (if/else)
- ❌ Functions
- ❌ async/await
- ❌ Closures

**Design Philosophy**: Sequential execution model replaces control flow with multiple fetch-pause-resume cycles.

## Development Patterns

### Error Handling Strategy
```javascript
try {
  // VM operations
} catch (error) {
  return {
    status: 'error',
    error: error.message,
    // ... other task fields
  };
} finally {
  vm.dispose(); // Always cleanup VM
}
```

### Storage Pattern
```javascript
// Save on pause
if (task.status === 'paused') {
  await storage.save(task);
}

// Delete on completion/error
if (task.status === 'completed' || task.status === 'error') {
  await storage.delete(taskId);
}
```

### VM Lifecycle
1. `new SequentialFetchVM()` - Create instance
2. `await vm.initialize()` - Setup environment
3. `await vm.executeCode(code)` or `await vm.resumeExecution(state, data)` - Run
4. `vm.dispose()` - Cleanup (always in finally block)

## File Structure

```
sequential-flow/
├── lib/
│   ├── edge-functions.cjs    # Core SequentialFlow class + InMemoryStorage
│   └── storage.cjs            # Storage implementations (Redis, SQL, Firestore, Custom)
├── package.json               # Metadata, exports, dependencies
├── README.md                  # User documentation with examples
├── LICENSE                    # MIT License
└── .gitignore                 # Standard Node.js ignores
```

## Package Configuration

### Exports
- **Main**: `./lib/edge-functions.cjs` (SequentialFlow, InMemoryStorage)
- **Storage**: `./lib/storage.cjs` (RedisStorage, SQLStorage, FirestoreStorage, CustomStorage)

### Runtime Support
- **Node.js**: >=18.0.0
- **Deno**: >=1.40.0
- **Bun**: Compatible (no explicit version requirement)
- **Google Apps Script**: Compatible

### Module System
- **Type**: CommonJS (`require`/`module.exports`)
- **Build**: Not needed (source is distribution)

## Testing Approach

### Test Execution
```bash
npm test  # Runs test.js
```

### Key Test Scenarios
1. **Execute → Pause**: Code with fetch pauses correctly
2. **Resume → Complete**: Resuming with response completes execution
3. **Multiple Fetches**: Sequential pause/resume cycles
4. **Storage**: Save/load/delete operations
5. **Error Handling**: Invalid code, storage failures, VM errors
6. **TTL**: Expiration timestamps
7. **Edge Functions**: Firebase, Supabase, Vercel examples

## Common Tasks

### Adding New Storage Provider
1. Create class extending `CustomStorage` or implementing interface
2. Implement `save(task)`, `load(taskId)`, `delete(taskId)` methods
3. Add to `module.exports` in `/lib/storage.cjs`
4. Document in README.md with example
5. Add peer dependency if needed

### Modifying Execution Logic
- Edit `/lib/edge-functions.cjs`
- Focus on `execute()` and `resume()` methods
- Maintain task state transitions: running → paused → completed/error
- Always call `vm.dispose()` in finally block
- Preserve backward compatibility for vmState serialization

### Documentation Updates
- **README.md**: User-facing features, examples, API reference
- **CLAUDE.md**: Architecture, development patterns, AI context
- **package.json**: Version, description, keywords

## Edge Function Integration

### Supported Platforms
- **Firebase Functions**: HTTP triggers with req/res
- **Supabase Edge Functions**: Deno.serve with fetch API
- **Vercel Edge Functions**: Next.js API routes
- **Cloudflare Workers**: Compatible (addEventListener)
- **Deno Deploy**: Native Deno support

### Integration Pattern
```javascript
// 1. Parse request (id, code)
// 2. Call SequentialFlow.execute() or .resume()
// 3. Return JSON response with task object
// 4. Client handles paused state (fetch URL, retry with response)
```

## Performance Characteristics

- **Startup**: Instantaneous (no VM initialization overhead)
- **Memory**: Minimal (no QuickJS or heavy runtime)
- **Speed**: O(n) for n statements
- **Package Size**: ~6 KB total
- **Cold Start**: Optimized for edge functions

## Security Considerations

### Code Execution
- **Sandboxed**: sequential-fetch VM provides isolation
- **No eval()**: Uses structured AST execution
- **Limited scope**: No access to Node.js/Deno APIs by default
- **Fetch-only I/O**: Network requests are the only side effect

### Storage
- **Task IDs**: User-provided, ensure uniqueness and validation
- **TTL**: Automatic expiration prevents storage bloat
- **Sensitive Data**: Tasks may contain code/results, encrypt if needed
- **Redis/SQL/Firestore**: Use secure connections and authentication

## Comparison with FlowState

| Aspect | Sequential Flow | FlowState |
|--------|----------------|-----------|
| VM Engine | sequential-fetch | QuickJS WASM |
| Bundle Size | ~6 KB | ~50+ KB |
| Required Deps | 0 (sequential-fetch only) | 2+ |
| Cross-Runtime | ✅ All (Node/Deno/Bun/GAS) | ⚠️ Limited |
| Edge Functions | ✅ Native support | ✅ Supported |
| Storage | ✅ Pluggable | ✅ Pluggable |

## Git Workflow

### Current Branch
`claude/create-comprehensive-claude-md-01RBF2yXNUXm1VPa6gqGc1nK`

### Commit Guidelines
- **Format**: `<type>: <description>`
- **Types**: feat, fix, docs, refactor, test, chore
- **Examples**:
  - `feat: Add DynamoDB storage provider`
  - `fix: Handle VM disposal on early error`
  - `docs: Update API reference for resume()`

### Versioning
- **Current**: 1.0.0
- **Scheme**: Semantic Versioning (MAJOR.MINOR.PATCH)
- **Breaking changes**: Require major version bump

## Important Notes for AI Assistants

1. **No Build Step**: `lib/` contains source code that is directly distributed
2. **CommonJS Only**: Do not introduce ES modules without package.json changes
3. **Storage Interface**: All storage implementations must support save/load/delete
4. **VM Lifecycle**: Always dispose VM in finally block to prevent memory leaks
5. **State Serialization**: vmState and pausedState are opaque objects from sequential-fetch
6. **Error Handling**: Never throw from SequentialFlow methods, return error task object
7. **TTL Management**: Storage implementations should respect expiresAt for cleanup
8. **Cross-Runtime**: Test changes in Node.js and Deno minimum

## Key Concepts

### Pause/Resume Cycle
```
User submits code with fetch()
    ↓
execute() runs until first fetch()
    ↓
Returns paused task with fetchRequest
    ↓
Client performs actual HTTP request
    ↓
resume() continues with fetch response
    ↓
Repeats until code completes or errors
```

### Storage Strategy
- **In-Memory**: Fast, ephemeral, single-process (default)
- **Redis**: Distributed, persistent, auto-expiration (SETEX)
- **SQL**: Relational, queryable, manual TTL cleanup needed
- **Firestore**: NoSQL, Google Cloud, automatic scaling
- **Custom**: Implement any backend (S3, DynamoDB, etc.)

### Task Lifecycle States
1. **running**: Active execution in progress
2. **paused**: Waiting for fetch response
3. **completed**: Successfully finished
4. **error**: Failed with exception

---

**Last Updated**: 2025-11-14
**License**: MIT
**Repository**: https://github.com/AnEntrypoint/sequential-flow
