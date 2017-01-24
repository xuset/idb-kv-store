var IdbKvStore = require('.')
var test = require('tape')

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

test('get multiple', function (t) {
  t.timeoutAfter(3000)
  var store = createStore()
  store.set('a', 1, function (err) {
    t.equal(err, null)
    store.set('b', 2, function (err) {
      t.equal(err, null)
      store.get(['a', 'b'], function (err, values) {
        t.equal(err, null)
        t.deepEqual(values, [1, 2])
        t.end()
      })
    })
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
  store.add('abc', 'def', function (err) {
    t.equal(err, null)
    store.add('abc', 'def', function (err) {
      t.notEqual(err, null)
      t.end()
    })
  })
})

test('close()', function (t) {
  t.timeoutAfter(3000)
  var store = createStore(function () {
    store.close()
    t.throws(function () { store.get() })
    t.throws(function () { store.set() })
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

test('listen on "change" fails if not supported', function (t) {
  t.timeoutAfter(3000)
  if (IdbKvStore.BROADCAST_SUPPORT) return t.end()

  var store = createStore()
  store.on('error', function (err) {
    t.ok(err instanceof Error)
    t.end()
  })

  store.on('change', function () {})
})

test('change event', function (t) {
  t.timeoutAfter(3000)
  if (!IdbKvStore.BROADCAST_SUPPORT) return t.end()
  var name = '' + (Math.round(9e16 * Math.random()))
  var storeA = IdbKvStore(name)
  var storeB = IdbKvStore(name)

  storeA.on('change', function (change) {
    t.fail()
  })

  storeB.once('change', onAdd)
  storeA.add('foo', 'bar', function (err) {
    t.equal(err, null)
  })

  function onAdd (change) {
    t.deepEqual({
      method: 'add',
      key: 'foo',
      value: 'bar'
    }, change)
    storeB.once('change', onSet)
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
    storeB.once('change', onRemove)
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
        t.deepEqual(values, ['A', 'B'])
        t.end()
      })
    })
  })
})

function createStore (cb) {
  var name = '' + (Math.round(9e16 * Math.random()))
  return new IdbKvStore(name, cb)
}
