module.exports = IdbKeyStore

var IDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB

function IdbKeyStore (name, opts) {
  var self = this
  if (typeof name !== 'string') throw new Error('A name must be supplied of type string')
  if (!(this instanceof IdbKeyStore)) return new IdbKeyStore(name, opts)
  if (!opts) opts = {}

  self._db = null
  self._queue = []

  var request = IDB.open(name)

  request.onerror = function (event) {
    onerror(event, opts.onerror)
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
    var transaction = self._db.transaction('kv', 'readonly')
    var request = transaction.objectStore('kv').get(key)

    request.onsuccess = function (event) {
      defer.cb(null, event.target.result)
    }

    transaction.onerror = function (event) {
      onerror(event, defer.cb)
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
    var transaction = self._db.transaction('kv', 'readwrite')
    var request = transaction.objectStore('kv').put(value, key)

    request.onsuccess = function () {
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      onerror(event, defer.cb)
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
    var transaction = self._db.transaction('kv', 'readonly')
    var request = transaction.objectStore('kv').openCursor()

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

    transaction.onerror = function (event) {
      onerror(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKeyStore.prototype.keys = function (cb) {
  var self = this
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push({
      type: 'keys',
      cb: defer.cb
    })
  } else {
    var transaction = self._db.transaction('kv', 'readonly')
    var request = transaction.objectStore('kv').openCursor()

    var keys = []
    request.onsuccess = function (event) {
      var cursor = event.target.result
      if (cursor) {
        keys.push(cursor.key)
        cursor.continue()
      } else {
        defer.cb(null, keys)
      }
    }

    transaction.onerror = function (event) {
      onerror(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKeyStore.prototype.remove = function (key, cb) {
  var self = this
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push({
      type: 'remove',
      key: key,
      cb: defer.cb
    })
  } else {
    var transaction = self._db.transaction('kv', 'readwrite')
    var request = transaction.objectStore('kv').delete(key)

    request.onsuccess = function (event) {
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      onerror(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKeyStore.prototype.clear = function (cb) {
  var self = this
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push({
      type: 'clear',
      cb: defer.cb
    })
  } else {
    var transaction = self._db.transaction('kv', 'readwrite')
    var request = transaction.objectStore('kv').clear()

    request.onsuccess = function (event) {
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      onerror(event, defer.cb)
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
    } else if (item.type === 'keys') {
      self.keys(item.cb)
    } else if (item.type === 'remove') {
      self.remove(item.key, item.cb)
    } else if (item.type === 'clear') {
      self.clear(item.cb)
    }
  }
  self._queue = null
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

function onerror (event, cb) {
  var err = new Error('IDB error')
  err.event = event

  if (cb) {
    cb(err)
  } else {
    throw err
  }
}
