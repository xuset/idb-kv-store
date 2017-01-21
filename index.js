module.exports = IdbKvStore

var scope = typeof window === 'undefined' ? self : window // eslint-disable-line
var IDB = scope.indexedDB || scope.mozIndexedDB || scope.webkitIndexedDB || scope.msIndexedDB

IdbKvStore.INDEXEDDB_SUPPORT = IDB != null

function IdbKvStore (name, cb) {
  var self = this
  if (typeof name !== 'string') throw new Error('A name must be supplied of type string')
  if (!IDB) throw new Error('IndexedDB not supported')
  if (!(this instanceof IdbKvStore)) return new IdbKvStore(name, cb)

  self._db = null
  self._closed = false
  self._queue = []

  var request = IDB.open(name)
  request.onerror = onerror
  request.onsuccess = onsuccess
  request.onupgradeneeded = onupgradeneeded

  function onerror (event) {
    self.close()
    handleError(event, cb)
  }

  function onsuccess (event) {
    if (self._closed) {
      event.target.result.close()
    } else {
      self._db = event.target.result
      self._db.onclose = onclose
      self._drainQueue()
      if (cb) cb(null)
    }
  }

  function onupgradeneeded (event) {
    if (self._closed) return
    var db = event.target.result
    db.createObjectStore('kv')
  }

  function onclose () {
    self.close()
  }
}

IdbKvStore.prototype.get = function (key, cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.get, key, defer.cb])
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
      handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.set = function (key, value, cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.set, key, value, defer.cb])
  } else {
    var transaction = self._db.transaction('kv', 'readwrite')
    var request = transaction.objectStore('kv').put(value, key)

    request.onsuccess = function () {
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.json = function (cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.json, defer.cb])
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
      handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.keys = function (cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.keys, defer.cb])
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
      handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.remove = function (key, cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.remove, key, defer.cb])
  } else {
    var transaction = self._db.transaction('kv', 'readwrite')
    var request = transaction.objectStore('kv').delete(key)

    request.onsuccess = function (event) {
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.clear = function (cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.clear, defer.cb])
  } else {
    var transaction = self._db.transaction('kv', 'readwrite')
    var request = transaction.objectStore('kv').clear()

    request.onsuccess = function (event) {
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.count = function (cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.count, defer.cb])
  } else {
    var transaction = self._db.transaction('kv', 'readonly')
    var request = transaction.objectStore('kv').count()

    request.onsuccess = function (event) {
      defer.cb(null, event.target.result)
    }

    transaction.onerror = function (event) {
      handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.add = function (key, value, cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.add, key, value, defer.cb])
  } else {
    var transaction = self._db.transaction('kv', 'readwrite')
    var request = transaction.objectStore('kv').add(value, key)

    request.onsuccess = function (event) {
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.close = function () {
  if (this._closed) return
  this._closed = true
  if (this._db) this._db.close()
  this._queue = null
}

IdbKvStore.prototype._drainQueue = function () {
  var self = this
  for (var i = 0; i < self._queue.length; i++) {
    var item = self._queue[i]
    var args = item.splice(1)
    item[0].apply(self, args)
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

function handleError (event, cb) {
  var err = new Error('IDB error')
  err.event = event

  if (cb) {
    cb(err)
  } else {
    throw err
  }
}
