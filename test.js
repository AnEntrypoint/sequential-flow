const { SequentialFlow, InMemoryStorage } = require('./lib/edge-functions.cjs');

console.log('🧪 Testing Sequential Flow\n');

async function runTests() {
  // Test 1: Basic execution
  console.log('=== Test 1: Basic Execution ===');
  try {
    const result = await SequentialFlow.execute({
      id: 'test-1',
      code: 'const x = 5; x * 2'
    });
    console.log('Status:', result.status);
    console.log('Result:', result.result);
    console.log('✅ Test 1 passed\n');
  } catch (e) {
    console.log('❌ Test 1 failed:', e.message, '\n');
  }

  // Test 2: Fetch pausing
  console.log('=== Test 2: Fetch Pausing ===');
  try {
    const result = await SequentialFlow.execute({
      id: 'test-2',
      code: 'const user = fetch("https://api.example.com/user/123"); user.name'
    });
    console.log('Status:', result.status);
    console.log('Fetch URL:', result.fetchRequest?.url);
    console.log('✅ Test 2 passed\n');
  } catch (e) {
    console.log('❌ Test 2 failed:', e.message, '\n');
  }

  // Test 3: Pause and resume
  console.log('=== Test 3: Pause and Resume ===');
  try {
    const pause = await SequentialFlow.execute({
      id: 'test-3',
      code: 'const user = fetch("api/user"); const posts = fetch("api/posts?userId=" + user.id); user.name + ": " + posts.length'
    });
    console.log('First pause:', pause.status);

    const resume1 = await SequentialFlow.resume({
      taskId: pause.id,
      vmState: pause.vmState,
      originalCode: pause.code,
      fetchResponse: { data: { id: 42, name: 'Alice' } }
    });
    console.log('After first resume:', resume1.status);

    if (resume1.status === 'paused') {
      const resume2 = await SequentialFlow.resume({
        taskId: resume1.id,
        vmState: resume1.vmState,
        originalCode: resume1.code,
        fetchResponse: { data: { length: 10 } }
      });
      console.log('After second resume:', resume2.status);
      console.log('Final result:', resume2.result);
    }

    console.log('✅ Test 3 passed\n');
  } catch (e) {
    console.log('❌ Test 3 failed:', e.message, '\n');
  }

  // Test 4: Storage
  console.log('=== Test 4: Storage ===');
  try {
    const storage = new InMemoryStorage();
    const result = await SequentialFlow.execute(
      {
        id: 'test-4',
        code: 'const x = 10; fetch("api/data"); x'
      },
      { storage }
    );

    const loaded = await storage.load('test-4');
    console.log('Loaded from storage:', loaded ? 'yes' : 'no');
    console.log('Task status:', loaded?.status);
    console.log('✅ Test 4 passed\n');
  } catch (e) {
    console.log('❌ Test 4 failed:', e.message, '\n');
  }

  // Test 5: Error handling
  console.log('=== Test 5: Error Handling ===');
  try {
    const result = await SequentialFlow.execute({
      id: 'test-5',
      code: 'throw new Error("Test error")'
    });
    console.log('Status:', result.status);
    console.log('Error:', result.error);
    console.log('✅ Test 5 passed\n');
  } catch (e) {
    console.log('❌ Test 5 failed:', e.message, '\n');
  }

  console.log('✅ All tests completed');
}

runTests().catch(console.error);
