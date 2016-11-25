module.exports = IdbKeyStore

var IDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB

function IdbKeyStore (name, opts) {
  var self = this
  if (!name) throw new Error('A name must be supplied')
  if (!(this instanceof IdbKeyStore)) return new IdbKeyStore(name, opts)
  if (!opts) opts = {}

  self._db = null
  self._queue = []

  var request = IDB.open(name)

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

function promisify (cb) {
  var defer = {cb: cb}

  if (typeof Promise === 'function' && cb == null) {
    defer.promise = new Promise(function (resolve, reject) {
      defer.cb = function (err, result) {
        if (err) return reject(err)
        else return resolve(result)
      }
    })
  }

  if (!defer.cb) defer.cb = function noop () {}

  return defer
}

IdbKeyStore.prototype.get = function (key, cb) {
  var self = this
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push({
      type: 'get',
      key: key,
      cb: defer.cb
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
          defer.cb(err)
        }
        result[index] = val
        successes++
        if (successes === key.length) defer.cb(null, result)
      })
    })
  } else {
    var request = self._db.transaction('kv', 'readonly')
    .objectStore('kv')
    .get(key)

    request.onsuccess = function (event) {
      defer.cb(null, event.target.result)
    }
  }

  return defer.promise
}

IdbKeyStore.prototype.set = function (key, value, cb) {
  var self = this
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push({
      type: 'set',
      key: key,
      value: value,
      cb: defer.cb
    })
  } else {
    var request = self._db.transaction('kv', 'readwrite')
    .objectStore('kv')
    .put(value, key)

    request.onsuccess = function () {
      defer.cb(null)
    }
  }

  return defer.promise
}

IdbKeyStore.prototype.json = function (cb) {
  var self = this
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push({
      type: 'json',
      cb: defer.cb
    })
  } else {
    var request = self._db.transaction('kv', 'readonly')
    .objectStore('kv')
    .openCursor()

    var json = {}
    request.onsuccess = function (event) {
      var cursor = event.target.result
      if (cursor) {
        json[cursor.key] = cursor.value
        cursor.continue()
      } else {
        defer.cb(null, json)
      }
    }
  }

  return defer.promise
}
IdbKeyStore.prototype._drainQueue = function () {
  var self = this
  for (var i = 0; i < self._queue.length; i++) {
    var item = self._queue[i]
    if (item.type === 'get') {
      self.get(item.key, item.cb)
    } else if (item.type === 'set') {
      self.set(item.key, item.value, item.cb)
    } else if (item.type === 'json') {
      self.json(item.cb)
    }
  }
  self._queue = null
}

