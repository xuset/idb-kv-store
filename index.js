module.exports = IdbKeyStore

var IDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB

function IdbKeyStore (opts) {
  var self = this
  if (!(this instanceof IdbKeyStore)) return new IdbKeyStore(opts)
  if (!opts) opts = {}

  self._db = null
  self._queue = []

  var request = IDB.open(opts.name || 'idb-key-store')

  request.onerror = function (event) {
    var err = new Error('IDB error')
    err.event = event

    if (opts.onerror) {
      opts.onerror(err)
    } else {
      throw err
    }
  }

  request.onsuccess = function (event) {
    self._db = event.target.result
    self._drainQueue()
    if (opts.onready) opts.onready()
  }

  request.onupgradeneeded = function (event) {
    var db = event.target.result
    db.createObjectStore('kv')
  }
}

IdbKeyStore.prototype.get = function (key, cb) {
  var self = this
  if (!cb) cb = noop
  if (!self._db) {
    self._queue.push({
      type: 'get',
      key: key,
      cb: cb
    })
  } else if (Array.isArray(key)) {
    var result = []
    var erroredOut = false
    var successes = 0
    key.forEach(function (_, index) {
      self.get(key[index], function (err, val) {
        if (erroredOut) return
        if (err) {
          erroredOut = true
          cb(err)
        }
        result[index] = val
        successes++
        if (successes === key.length) cb(null, result)
      })
    })
  } else {
    var request = self._db.transaction(['kv'], 'readonly')
    .objectStore('kv')
    .get(key)

    request.onsuccess = function (event) {
      cb(null, event.target.result)
    }
  }
}

IdbKeyStore.prototype.set = function (key, value, cb) {
  var self = this
  if (!cb) cb = noop
  if (!self._db) {
    self._queue.push({
      type: 'set',
      key: key,
      value: value,
      cb: cb
    })
  } else {
    var request = self._db.transaction(['kv'], 'readwrite')
    .objectStore('kv')
    .put(value, key)

    request.onsuccess = function () {
      cb(null)
    }
  }
}

IdbKeyStore.prototype._drainQueue = function () {
  var self = this
  for (var i = 0; i < self._queue.length; i++) {
    var item = self._queue[i]
    if (item.type === 'get') {
      self.get(item.key, item.cb)
    } else if (item.type === 'set') {
      self.set(item.key, item.value, item.cb)
    }
  }
  self._queue = null
}

function noop () {
  /* do nothing */
}
