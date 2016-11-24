var IdbKeyStore = require('.')
var test = require('tape')

test('create/get/set pre-ready', function (t) {
  var store = new IdbKeyStore()
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
  var store = new IdbKeyStore({ onready: onready })

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
  var store = new IdbKeyStore()

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
  var store = new IdbKeyStore()
  store.get('badkey', function (err, result) {
    t.equal(err, null)
    t.equal(result, undefined)
    t.end()
  })
})

