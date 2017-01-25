module.exports = IdbKvStore

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

var global = typeof window === 'undefined' ? self : window // eslint-disable-line
var IDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB

IdbKvStore.INDEXEDDB_SUPPORT = IDB != null
IdbKvStore.BROADCAST_SUPPORT = global.BroadcastChannel != null

inherits(IdbKvStore, EventEmitter)
function IdbKvStore (name, opts, cb) {
  var self = this
  if (typeof name !== 'string') throw new Error('A name must be supplied of type string')
  if (!IDB) throw new Error('IndexedDB not supported')
  if (typeof opts === 'function') return new IdbKvStore(name, null, opts)
  if (!(this instanceof IdbKvStore)) return new IdbKvStore(name, opts, cb)
  if (!opts) opts = {}

  EventEmitter.call(self)

  self._db = null
  self._closed = false
  self._queue = []
  self._channel = null

  var Channel = opts.channel || global.BroadcastChannel
  if (Channel) {
    self._channel = new Channel(name)
    self._channel.onmessage = onChange
  }

  var request = IDB.open(name)
  request.onerror = onerror
  request.onsuccess = onsuccess
  request.onupgradeneeded = onupgradeneeded

  self.on('newListener', onNewListener)

  function onerror (event) {
    self.close()
    self._handleError(event, cb)
  }

  function onsuccess (event) {
    if (self._closed) {
      event.target.result.close()
    } else {
      self._db = event.target.result
      self._db.onclose = onclose
      self._drainQueue()
      if (cb) cb(null)
      self.emit('open')
    }
  }

  function onupgradeneeded (event) {
    if (self._closed) return
    var db = event.target.result
    db.createObjectStore('kv', {autoIncrement: true})
  }

  function onclose () {
    self.close()
  }

  function onNewListener (event) {
    if (event !== 'add' && event !== 'set' && event !== 'remove') return
    if (!self._channel) return self.emit('error', new Error('No BroadcastChannel support'))
  }

  function onChange (event) {
    if (event.data.method === 'add') self.emit('add', event.data)
    else if (event.data.method === 'set') self.emit('set', event.data)
    else if (event.data.method === 'remove') self.emit('remove', event.data)
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
      self._handleError(event, defer.cb)
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
      if (self._channel) {
        self._channel.postMessage({
          method: 'set',
          key: key,
          value: value
        })
      }
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      self._handleError(event, defer.cb)
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
      self._handleError(event, defer.cb)
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
      self._handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.values = function (cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.values, defer.cb])
  } else {
    var transaction = self._db.transaction('kv', 'readonly')
    var request = transaction.objectStore('kv').openCursor()

    var values = []
    request.onsuccess = function (event) {
      var cursor = event.target.result
      if (cursor) {
        values.push(cursor.value)
        cursor.continue()
      } else {
        defer.cb(null, values)
      }
    }

    transaction.onerror = function (event) {
      self._handleError(event, defer.cb)
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
      if (self._channel) {
        self._channel.postMessage({
          method: 'remove',
          key: key
        })
      }
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      self._handleError(event, defer.cb)
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
      self._handleError(event, defer.cb)
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
      self._handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.add = function (key, value, cb) {
  var self = this
  if (self._closed) throw new Error('Database is closed')
  if (typeof value === 'function' || arguments.length === 1) return self.add(undefined, key, value)
  var defer = promisify(cb)

  if (!self._db) {
    self._queue.push([self.add, key, value, defer.cb])
  } else {
    var transaction = self._db.transaction('kv', 'readwrite')
    var request = key == null
      ? transaction.objectStore('kv').add(value)
      : transaction.objectStore('kv').add(value, key)

    request.onsuccess = function (event) {
      if (self._channel) {
        self._channel.postMessage({
          method: 'add',
          key: key,
          value: value
        })
      }
      defer.cb(null)
    }

    transaction.onerror = function (event) {
      self._handleError(event, defer.cb)
    }
  }

  return defer.promise
}

IdbKvStore.prototype.close = function () {
  if (this._closed) return
  this._closed = true

  if (this._db) this._db.close()
  if (this._channel) this._channel.close()

  this._db = null
  this._channel = null
  this._queue = null

  this.emit('close')

  this.removeAllListeners()
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

IdbKvStore.prototype._handleError = function (event, cb) {
  var err = event.target.error
  event.preventDefault()

  if (cb) {
    cb(err)
  } else {
    this.emit('error', err)
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
