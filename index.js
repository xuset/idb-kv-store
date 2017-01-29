/* eslint-env browser */

module.exports = IdbKvStore

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

var global = typeof window === 'undefined' ? self : window
var IDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB

IdbKvStore.INDEXEDDB_SUPPORT = IDB != null
IdbKvStore.BROADCAST_SUPPORT = global.BroadcastChannel != null

inherits(IdbKvStore, EventEmitter)
function IdbKvStore (name, opts, cb) {
  var self = this
  if (typeof name !== 'string') throw new Error('A name must be supplied of type string')
  if (!IDB) throw new Error('IndexedDB not supported')
  if (typeof opts === 'function') return new IdbKvStore(name, null, opts)
  if (!(self instanceof IdbKvStore)) return new IdbKvStore(name, opts, cb)
  if (!opts) opts = {}

  EventEmitter.call(self)

  self._db = null
  self._closed = false
  self._channel = null
  self._waiters = []

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
    handleError(event)
    self._close(event.target.error)
    if (cb) cb(event.target.error)
  }

  function onDbError (event) {
    handleError(event)
    self._close(event.target.error)
  }

  function onsuccess (event) {
    if (self._closed) {
      event.target.result.close()
    } else {
      self._db = event.target.result
      self._db.onclose = onclose
      self._db.onerror = onDbError
      for (var i in self._waiters) self._waiters[i]._init(null)
      self._waiters = null
      if (cb) cb(null)
      self.emit('open')
    }
  }

  function onupgradeneeded (event) {
    var db = event.target.result
    db.createObjectStore('kv', {autoIncrement: true})
  }

  function onclose () {
    self._close()
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
  return this.transaction('readonly').get(key, cb)
}

IdbKvStore.prototype.set = function (key, value, cb) {
  return this.transaction('readwrite').set(key, value, cb)
}

IdbKvStore.prototype.json = function (cb) {
  return this.transaction('readonly').json(cb)
}

IdbKvStore.prototype.keys = function (cb) {
  return this.transaction('readonly').keys(cb)
}

IdbKvStore.prototype.values = function (cb) {
  return this.transaction('readonly').values(cb)
}

IdbKvStore.prototype.remove = function (key, cb) {
  return this.transaction('readwrite').remove(key, cb)
}

IdbKvStore.prototype.clear = function (cb) {
  return this.transaction('readwrite').clear(cb)
}

IdbKvStore.prototype.count = function (cb) {
  return this.transaction('readonly').count(cb)
}

IdbKvStore.prototype.add = function (key, value, cb) {
  return this.transaction('readwrite').add(key, value, cb)
}

IdbKvStore.prototype.iterator = function (next) {
  return this.transaction('readonly').iterator(next)
}

IdbKvStore.prototype.transaction = function (mode) {
  if (this._closed) throw new Error('Database is closed')
  var transaction = new Transaction(this, mode)
  if (this._db) transaction._init(null)
  else this._waiters.push(transaction)
  return transaction
}

IdbKvStore.prototype.close = function () {
  this._close()
}

IdbKvStore.prototype._close = function (err) {
  if (this._closed) return
  this._closed = true

  if (this._db) this._db.close()
  if (this._channel) this._channel.close()

  this._db = null
  this._channel = null

  if (err) this.emit('error', err)

  this.emit('close')

  for (var i in this._waiters) this._waiters[i]._init(err || new Error('Database is closed'))
  this._waiters = null

  this.removeAllListeners()
}

function Transaction (kvStore, mode) {
  this._kvStore = kvStore
  this._mode = mode || 'readwrite'
  this._objectStore = null
  this._waiters = null

  this.finished = false
  this.onfinish = null

  if (this._mode !== 'readonly' && this._mode !== 'readwrite') {
    throw new Error('mode must be either "readonly" or "readwrite"')
  }
}

Transaction.prototype._init = function (err) {
  var self = this

  if (self.finished) return
  if (err) return self._close(err)

  var transaction = self._kvStore._db.transaction('kv', self._mode)
  transaction.oncomplete = oncomplete
  transaction.onerror = onerror

  self._objectStore = transaction.objectStore('kv')

  for (var i in self._waiters) self._waiters[i](null, self._objectStore)
  self._waiters = null

  function oncomplete () {
    self._close(null)
  }

  function onerror (event) {
    handleError(event)
    self._close(event.target.error)
  }
}

Transaction.prototype._getObjectStore = function (cb) {
  if (this.finished) throw new Error('Transaction is finished')
  if (this._objectStore) return cb(null, this._objectStore)
  this._waiters = this._waiters || []
  this._waiters.push(cb)
}

Transaction.prototype.set = promisify(function (key, value, cb) {
  var self = this
  if (key == null || value == null) throw new Error('A key and value must be given')
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err)

    try {
      var request = objectStore.put(value, key)
    } catch (e) {
      return cb(e)
    }

    request.onerror = handleError.bind(this, cb)
    request.onsuccess = function () {
      if (self._kvStore._channel) {
        self._kvStore._channel.postMessage({
          method: 'set',
          key: key,
          value: value
        })
      }
      cb(null)
    }
  })
})

Transaction.prototype.add = promisify(function (key, value, cb) {
  var self = this
  if (value == null && key != null) return self.add(undefined, key, cb)
  if (typeof value === 'function' || value == null && cb == null) return self.add(undefined, key, value)
  if (value == null) throw new Error('A value must be provided as an argument')
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err)

    try {
      var request = key == null ? objectStore.add(value) : objectStore.add(value, key)
    } catch (e) {
      return cb(e)
    }

    request.onerror = handleError.bind(this, cb)
    request.onsuccess = function () {
      if (self._kvStore._channel) {
        self._kvStore._channel.postMessage({
          method: 'add',
          key: key,
          value: value
        })
      }
      cb(null)
    }
  })
})

Transaction.prototype.get = promisify(function (key, cb) {
  var self = this
  if (key == null) throw new Error('A key must be given as an argument')
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err)

    try {
      var request = objectStore.get(key)
    } catch (e) {
      return cb(e)
    }

    request.onerror = handleError.bind(this, cb)
    request.onsuccess = function (event) {
      cb(null, event.target.result)
    }
  })
})

Transaction.prototype.json = promisify(function (cb) {
  var self = this
  var json = {}
  self.iterator(function (err, cursor) {
    if (err) return cb(err)
    if (cursor) {
      json[cursor.key] = cursor.value
      cursor.continue()
    } else {
      cb(null, json)
    }
  })
})

Transaction.prototype.keys = promisify(function (cb) {
  var self = this
  var keys = []
  self.iterator(function (err, cursor) {
    if (err) return cb(err)
    if (cursor) {
      keys.push(cursor.key)
      cursor.continue()
    } else {
      cb(null, keys)
    }
  })
})

Transaction.prototype.values = promisify(function (cb) {
  var self = this
  var values = []
  self.iterator(function (err, cursor) {
    if (err) return cb(err)
    if (cursor) {
      values.push(cursor.value)
      cursor.continue()
    } else {
      cb(null, values)
    }
  })
})

Transaction.prototype.remove = promisify(function (key, cb) {
  var self = this
  if (key == null) throw new Error('A key must be given as an argument')
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err)

    try {
      var request = objectStore.delete(key)
    } catch (e) {
      return cb(e)
    }

    request.onerror = handleError.bind(this, cb)
    request.onsuccess = function () {
      if (self._kvStore._channel) {
        self._kvStore._channel.postMessage({
          method: 'remove',
          key: key
        })
      }
      cb(null)
    }
  })
})

Transaction.prototype.clear = promisify(function (cb) {
  var self = this
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err)

    try {
      var request = objectStore.clear()
    } catch (e) {
      return cb(e)
    }

    request.onerror = handleError.bind(this, cb)
    request.onsuccess = function () {
      cb(null)
    }
  })
})

Transaction.prototype.count = promisify(function (cb) {
  var self = this
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err)

    try {
      var request = objectStore.count()
    } catch (e) {
      return cb(e)
    }

    request.onerror = handleError.bind(this, cb)
    request.onsuccess = function (event) {
      cb(null, event.target.result)
    }
  })
})

Transaction.prototype.iterator = function (next) {
  var self = this
  if (typeof next !== 'function') throw new Error('A function must be given')
  self._getObjectStore(function (err, objectStore) {
    if (err) return next(err)

    try {
      var request = objectStore.openCursor()
    } catch (e) {
      return next(e)
    }

    request.onerror = handleError.bind(this, next)
    request.onsuccess = function (event) {
      var cursor = event.target.result
      next(null, cursor)
    }
  })
}

Transaction.prototype.abort = function () {
  if (this.finished) throw new Error('Transaction is finished')
  if (this._objectStore) this._objectStore.transaction.abort()
  this._close(new Error('Transaction aborted'))
}

Transaction.prototype._close = function (err) {
  if (this.finished) return
  this.finished = true

  this._kvStore = null
  this._objectStore = null

  for (var i in this._waiters) this._waiters[i](err || new Error('Transaction is finished'))
  if (this.onfinish) this.onfinish(err)

  this.onfinish = null
  this._waiters = null
}

function handleError (cb, event) {
  if (event == null) return handleError(null, cb)
  event.preventDefault()
  event.stopPropagation()
  if (cb) cb(event.target.error)
}

function promisify (func) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var promise
    var pResolve
    var pReject

    var cbType = typeof args[args.length - 1]
    if (cbType !== 'function') {
      if (cbType === 'undefined') args[args.length - 1] = cb
      else args[args.length] = cb
      if (typeof Promise !== 'undefined') {
        promise = new Promise(function (resolve, reject) {
          pResolve = resolve
          pReject = reject
        })
      }
    }

    func.apply(this, args)
    return promise

    function cb (err, result) {
      if (promise) {
        if (err) pReject(err)
        else pResolve(result)
      } else {
        if (err) throw err
      }
    }
  }
}
