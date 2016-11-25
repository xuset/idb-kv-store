var IdbKeyStore = require('.')
var test = require('tape')

test('create/get/set pre-ready', function (t) {
  t.timeoutAfter(1000)
  var store = createStore()
  store.set('abc', 'def', function (err) {
    t.equal(err, null)
    store.get('abc', function (err, result) {
      t.equal(err, null)
      t.equal(result, 'def')
      t.end()
    })
  })
})

test('create/get/set post-ready', function (t) {
  t.timeoutAfter(1000)
  var store = createStore({ onready: onready })

  function onready () {
    store.set('abc', 'def', function (err) {
      t.equal(err, null)
      store.get('abc', function (err, result) {
        t.equal(err, null)
        t.equal(result, 'def')
        t.end()
      })
    })
  }
})

test('set/get object', function (t) {
  t.timeoutAfter(1000)
  var store = createStore()

  var val = {somekey: 'someval'}

  store.set('abc', val, function (err) {
    t.equal(err, null)
    store.get('abc', function (err, result) {
      t.equal(err, null)
      t.deepEqual(result, val)
      t.end()
    })
  })
})

test('get empty', function (t) {
  t.timeoutAfter(1000)
  var store = createStore()
  store.get('badkey', function (err, result) {
    t.equal(err, null)
    t.equal(result, undefined)
    t.end()
  })
})

test('get multiple', function (t) {
  t.timeoutAfter(1000)
  var store = createStore()
  store.set('a', 1, function (err) {
    t.equal(err, null)
    store.set('b', 2, function (err) {
      t.equal(err, null)
      store.get(['a', 'b'], function (err, result) {
        t.equal(err, null)
        t.deepEqual(result, [1, 2])
        t.end()
      })
    })
  })
})

test('promises', function (t) {
  t.timeoutAfter(1000)

  if (typeof Promise !== 'function') {
    t.skip('Promises not supported')
    t.end()
    return
  }

  var store = createStore()

  store.set('a', 1)
  .then(function () { return store.get('a') })
  .then(function (result) {
    t.equal(result, 1)
    t.end()
  })
  .catch(function (err) { t.fail(err) })
})

function createStore (opts) {
  var name = '' + (Math.round(9e16 * Math.random()))
  return new IdbKeyStore(name, opts)
}
