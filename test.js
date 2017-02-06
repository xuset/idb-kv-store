/* eslint-env browser */

var IdbKvStore = require('.')
var test = require('tape')
var runParallel = require('run-parallel-limit')

test('create/get/set pre-ready', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.set('abc', 'def', function (err) {
    t.equal(err, null)
    store.get('abc', function (err, value) {
      t.equal(err, null)
      t.equal(value, 'def')
      t.end()
    })
  })
})

test('create/get/set post-ready', function (t) {
  t.timeoutAfter(3000)
  var store = createStore(onopen)

  function onopen (err) {
    t.equal(err, null)
    store.set('abc', 'def', function (err) {
      t.equal(err, null)
      store.get('abc', function (err, value) {
        t.equal(err, null)
        t.equal(value, 'def')
        t.end()
      })
    })
  }
})

test('set/get object', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()

  var val = {somekey: 'someval'}

  store.set('abc', val, function (err) {
    t.equal(err, null)
    store.get('abc', function (err, value) {
      t.equal(err, null)
      t.deepEqual(value, val)
      t.end()
    })
  })
})

test('get empty', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.get('badkey', function (err, value) {
    t.equal(err, null)
    t.equal(value, undefined)
    t.end()
  })
})

test('promises', function (t) {
  t.timeoutAfter(3000)

  if (typeof Promise !== 'function') {
    t.skip('Promises not supported')
    t.end()
    return
  }

  var store = createStore()

  store.set('a', 1)
  .then(function () {
    return store.get('a')
  })
  .then(function (value) {
    t.equal(value, 1)
    return store.json()
  })
  .then(function (json) {
    t.deepEqual(json, {a: 1})
    return store.remove('a')
  })
  .then(function () {
    return store.clear()
  })
  .then(function () {
    return store.add('b', 2)
  })
  .then(function () {
    return store.count()
  })
  .then(function (count) {
    t.equal(count, 1)
    return store.keys()
  })
  .then(function (keys) {
    t.deepEqual(keys, ['b'])
    t.end()
  })
  .catch(function (err) {
    t.fail(err)
    t.end()
  })
})

test('json()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.json(function (err, json) {
    t.equal(err, null)
    t.deepEqual(json, {})
    store.set('abc', 'def', function (err) {
      t.equal(err, null)
      store.json(function (err, json) {
        t.equal(err, null)
        t.deepEqual(json, {abc: 'def'})
        t.end()
      })
    })
  })
})

test('keys()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.keys(function (err, keys) {
    t.equal(err, null)
    t.deepEqual(keys, [])
    store.set('abc', 'def', function (err) {
      t.equal(err, null)
      store.keys(function (err, keys) {
        t.equal(err, null)
        t.deepEqual(keys, ['abc'])
        t.end()
      })
    })
  })
})

test('error cases', function (t) {
  t.timeoutAfter(3000)
  t.throws(function () { return new IdbKvStore() })
  t.throws(function () { return new IdbKvStore({}) })
  var store = createStore()
  t.throws(function () { store.get() })
  t.throws(function () { store.set() })
  t.throws(function () { store.set('key') })
  t.throws(function () { store.remove() })
  t.throws(function () { store.iterator() })
  t.throws(function () { store.add() })
  t.throws(function () { store.transaction('foo') })
  t.end()
})

test('remove()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.remove('abc', function (err) {
    t.equal(err, null)
    store.set('abc', 'def', function (err) {
      t.equal(err, null)
      store.remove('abc', function (err) {
        t.equal(err, null)
        store.get('abc', function (err, value) {
          t.equal(err, null)
          t.equal(value, undefined)
          t.end()
        })
      })
    })
  })
})

test('clear()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.clear(function (err) {
    t.equal(err, null)
    store.set('abc', 'def', function (err) {
      t.equal(err, null)
      store.clear(function (err) {
        t.equal(err, null)
        store.get('abc', function (err, value) {
          t.equal(err, null)
          t.equal(value, undefined)
          t.end()
        })
      })
    })
  })
})

test('count()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.count(function (err, count) {
    t.equal(err, null)
    t.equal(count, 0)
    store.set('abc', 'def', function (err) {
      t.equal(err, null)
      store.count(function (err, count) {
        t.equal(err, null)
        t.equal(count, 1)
        t.end()
      })
    })
  })
})

test('add()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()

  t.throws(function () { store.add() })

  store.add('abc', 'def', function (err) {
    t.equal(err, null)
    store.add('abc', 'def', function (err) {
      t.notEqual(err, null)
      t.end()
    })
  })
})

test('single arg add()', function (t) {
  t.timeoutAfter(3000)
  var name = '' + (Math.round(9e16 * Math.random()))
  var store = new IdbKvStore(name, function (err) {
    t.equal(err, null)
    store.add('foobar')
    store.close()
  })

  store.on('close', function () {
    store = new IdbKvStore(name)
    store.json(function (err, json) {
      t.equal(err, null)
      t.deepEqual({1: 'foobar'}, json)
      t.end()
    })
  })
})

test('close()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore(function () {
    store.close()
    t.throws(function () { store.get('foo') })
    t.throws(function () { store.set('foo', 'foo') })
    t.end()
  })
})

test('SUPPORT constants', function (t) {
  t.equal(IdbKvStore.INDEXEDDB_SUPPORT, true)
  t.ok('BROADCAST_SUPPORT' in IdbKvStore)
  t.end()
})

test('open/close event', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.on('open', onOpen)
  store.on('close', onClose)

  function onOpen () {
    store.close()
  }

  function onClose () {
    t.end()
  }
})

test('listen on add/set/remove events fail if not supported', function (t) {
  t.timeoutAfter(3000)
  if (IdbKvStore.BROADCAST_SUPPORT) return t.end()

  var store = createStore()
  store.once('error', addError)

  store.on('add', function () {})

  function addError (err) {
    t.ok(err instanceof Error)
    store.once('error', setError)
    store.on('set', function () {})
  }

  function setError (err) {
    t.ok(err instanceof Error)
    store.once('error', removeError)
    store.on('remove', function () {})
  }

  function removeError (err) {
    t.ok(err instanceof Error)
    t.end()
  }
})

test('add/set/remove events', function (t) {
  t.timeoutAfter(3000)
  if (!IdbKvStore.BROADCAST_SUPPORT) return t.end()
  var name = '' + (Math.round(9e16 * Math.random()))
  var storeA = IdbKvStore(name)
  var storeB = IdbKvStore(name)

  storeA.on('add', fail)
  storeA.on('set', fail)
  storeA.on('remove', fail)

  storeB.on('add', onAdd)
  storeB.on('set', onSet)
  storeB.on('remove', onRemove)

  storeA.add('foo', 'bar', function (err) {
    t.equal(err, null)
  })

  function onAdd (change) {
    t.deepEqual({
      method: 'add',
      key: 'foo',
      value: 'bar'
    }, change)

    storeA.set('foo', 'barbar', function (err) {
      t.equal(err, null)
    })
  }

  function onSet (change) {
    t.deepEqual({
      method: 'set',
      key: 'foo',
      value: 'barbar'
    }, change)

    storeA.remove('foo', function (err) {
      t.equal(err, null)
    })
  }

  function onRemove (change) {
    t.deepEqual({
      method: 'remove',
      key: 'foo'
    }, change)
    t.end()
  }

  function fail () {
    t.fail()
  }
})

test('add() - autoIncremement key', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.set('foo', 'bar', function (err) {
    t.equal(err, null)
    store.add('foobar', function (err) {
      t.equal(err, null)
      store.json(function (err, json) {
        t.equal(err, null)
        t.deepEqual(json, {1: 'foobar', 'foo': 'bar'})
        t.end()
      })
    })
  })
})

test('values()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.add('A', function (err) {
    t.equal(err, null)
    store.add('B', function (err) {
      t.equal(err, null)
      store.values(function (err, values) {
        t.equal(err, null)
        store.json(console.log)
        t.deepEqual(values, ['A', 'B'])
        t.end()
      })
    })
  })
})

test('broadcast event event with no listener', function (t) {
  t.timeoutAfter(3000)
  if (!IdbKvStore.BROADCAST_SUPPORT) return t.end()

  var name = '' + (Math.round(9e16 * Math.random()))
  var storeA = IdbKvStore(name)
  var storeB = IdbKvStore(name)

  storeB.on('add', onAdd)
  storeA.add('foo', 'bar')

  function onAdd (change) {
    t.deepEqual({
      method: 'add',
      key: 'foo',
      value: 'bar'
    }, change)
    t.end()
  }
})

test('transaction', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  var transaction = store.transaction()

  transaction.onfinish = onfinish

  transaction.add('foo')
  transaction.set(1, 'bar')
  transaction.set(2, 'bar')
  transaction.remove(2)
  transaction.json(function (err, json) {
    t.equal(err, null)
    t.deepEqual({1: 'bar'}, json)
  })

  function onfinish (err) {
    t.equal(err, null)
    t.end()
  }
})

test('transaction abort', function (t) {
  t.timeoutAfter(3000)
  t.plan(5)

  var store = createStore()
  var transaction = store.transaction()

  transaction.onfinish = onfinish

  transaction.add('foo', function (err) {
    t.ok(err instanceof Error)
  })

  transaction.abort()

  t.throws(function () { transaction.add('bar') })

  function onfinish (err) {
    t.ok(err instanceof Error)
    store.json(function (err, json) {
      t.equal(err, null)
      t.deepEqual({}, json)
    })
  }
})

test('iterator()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  var transaction = store.transaction()
  var count = 0
  transaction.onfinish = onfinish
  transaction.add('foo')
  transaction.add('bar')

  function onfinish (err) {
    t.equal(err, null)
    store.iterator(iter)
  }

  function iter (err, cursor) {
    t.equal(err, null)
    count++
    if (count === 1) {
      t.notEqual(cursor, null)
      t.equal(cursor.key, 1)
      t.equal(cursor.value, 'foo')
      cursor.continue()
    } else if (count === 2) {
      t.notEqual(cursor, null)
      t.equal(cursor.key, 2)
      t.equal(cursor.value, 'bar')
      cursor.continue()
    } else if (count === 3) {
      t.equal(cursor, null)
      t.end()
    }
  }
})

test('write on readonly fails', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  var transaction = store.transaction('readonly')
  transaction.add('foobar', function (err) {
    t.ok(err instanceof DOMException)
    transaction.set('foo', 'bar', function (err) {
      t.ok(err instanceof DOMException)
      transaction.remove('foobar', function (err) {
        t.ok(err instanceof DOMException)
        transaction.clear(function (err) {
          t.ok(err instanceof DOMException)
          t.end()
        })
      })
    })
  })
})

test('transaction cleanup', function (t) {
  t.timeoutAfter(3000)

  var store = createStore()
  var trans = store.transaction('readonly')
  trans.onfinish = function (err) {
    t.equal(err, null)
    t.equal(trans.finished, true)
    t.throws(function () { trans.get('foo') })
    t.end()
  }
})

test('close db closes transactions', function (t) {
  t.timeoutAfter(3000)
  t.plan(3)

  var store = createStore()
  var trans = store.transaction('readonly')
  trans.get('foo', function (err, result) {
    t.ok(err instanceof Error)
    t.equal(result, undefined)
  })
  trans.onfinish = function (err) {
    t.ok(err instanceof Error)
  }
  store.close()
})

test('transaction before close completes', function (t) {
  t.timeoutAfter(3000)
  t.plan(4)

  var name = '' + (Math.round(9e16 * Math.random()))
  var store = new IdbKvStore(name, function (err) {
    t.equal(err, null)
    store.add('foobar', function (err) {
      t.equal(err, null)
    })
    store.close()
    store = new IdbKvStore(name)
    store.json(function (err, json) {
      t.equal(err, null)
      t.deepEqual({1: 'foobar'}, json)
    })
  })
})

test('close then open is successful', function (t) {
  t.timeoutAfter(3000)

  var name = '' + (Math.round(9e16 * Math.random()))
  var store = new IdbKvStore(name)
  store.close()
  store.close()
  store = new IdbKvStore(name, function (err) {
    t.equal(err, null)
    t.end()
  })
})

test('ranged iterator()', function (t) {
  t.timeoutAfter(3000)

  var store = createStore()
  var transaction = store.transaction()

  transaction.add(1)
  transaction.add(2)
  transaction.add(3)

  transaction.onfinish = function (err) {
    t.equal(err, null)
    var count = 1
    store.iterator(IDBKeyRange.upperBound(2), function (err, cursor) {
      t.equal(err, null)
      if (count < 3) {
        t.notEqual(cursor, null)
        t.equal(cursor.key, count)
        t.equal(cursor.value, count)
        cursor.continue()
      } else if (count === 3) {
        t.equal(cursor, null)
        t.end()
      } else {
        t.fail()
      }
      count++
    })
  }
})

test('ranged keys(), values(), json(), and count()', function (t) {
  t.timeoutAfter(3000)

  var store = createStore()
  var transaction = store.transaction()

  transaction.add(1)
  transaction.add(2)
  transaction.add(3)

  transaction.onfinish = function (err) {
    t.equal(err, null)
    store.json(IDBKeyRange.only(2), function (err, json) {
      t.equal(err, null)
      t.deepEqual(json, {2: 2})
      store.values(IDBKeyRange.lowerBound(2), function (err, values) {
        t.equal(err, null)
        t.deepEqual(values, [2, 3])
        store.keys(IDBKeyRange.upperBound(2), function (err, keys) {
          t.equal(err, null)
          t.deepEqual(keys, [1, 2])
          store.count(IDBKeyRange.only(2), function (err, count) {
            t.equal(err, null)
            t.equal(count, 1)
            t.end()
          })
        })
      })
    })
  }
})

test('transaction ordering on open', function (t) {
  t.timeoutAfter(3000)

  // NOTE: Sometimes IE & Edge will fail this due to not following idb spec

  var store = createStore(function (err) {
    t.equal(err, null)
    store.add('second')
  })
  store.once('open', function () {
    store.add('third', function (err) {
      t.equal(err, null)
      store.json(function (err, json) {
        t.equal(err, null)
        t.deepEqual(json, {
          1: 'first',
          2: 'second',
          3: 'third'
        })
        t.end()
      })
    })
  })
  store.add('first')
})

test.skip('benchmark', function (t) {
  var buffSize = 4 * 1024
  var storeCount = 10000

  var buffer = Buffer.alloc(buffSize)
  var store = createStore()

  var tasks = []
  for (var i = 0; i < storeCount; i++) {
    tasks.push(function (cb) { store.add(buffer, cb) })
  }

  console.log('Storing', storeCount, 'elements at', buffSize / 1024, 'kB per elements')

  var start = new Date().getTime()
  runParallel(tasks, 10, function (err) {
    t.equal(err, null)
    var totalTime = (new Date().getTime() - start) / 1000
    var totalSize = buffSize * storeCount / 1024
    var throughput = Math.round(totalSize / totalTime)

    console.log('total time =', totalTime, 'seconds. throughput =', throughput, 'kB/seconds')
    t.end()
  })
})

function createStore (cb) {
  var name = '' + (Math.round(9e16 * Math.random()))
  return new IdbKvStore(name, cb)
}
