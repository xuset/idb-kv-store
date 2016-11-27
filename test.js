var IdbKeyStore = require('.')
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
  var store = createStore({ onready: onready })

  function onready () {
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
    return store.keys()
  })
  .then(function (keys) {
    t.deepEqual(keys, [])
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
  t.throws(function () { return new IdbKeyStore() })
  t.throws(function () { return new IdbKeyStore({}) })
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

function createStore (opts) {
  var name = '' + (Math.round(9e16 * Math.random()))
  return new IdbKeyStore(name, opts)
}
