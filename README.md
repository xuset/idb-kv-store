# idb-kv-store [![Build Status](https://travis-ci.org/xuset/idb-kv-store.svg?branch=master)](https://travis-ci.org/xuset/idb-kv-store) [![npm](https://img.shields.io/npm/v/idb-kv-store.svg)](https://npmjs.org/package/idb-kv-store)

Persistent key-value store for web browsers backed by IndexedDB

[![Sauce Test Status](https://saucelabs.com/browser-matrix/xuset-idb-kv.svg)](https://saucelabs.com/u/xuset-idb-kv)

idb-kv-store uses asynchronous operations to persist and retrieve key-value pairs from the underlying database. The idb-kv-store instance presents a much simpler api than IndexedDB, doesn't have the very limiting data size constraints of localStorage, and the persisted data is available between different instances, web sessions, and web workers.

Additionally, the 'change' event allows users to listen for database changes that occur in different instances, windows, or workers.

This module can be used with [browserify](http://browserify.org/) or the [idbkvstore.min.js](https://raw.githubusercontent.com/xuset/idb-kv-store/master/idbkvstore.min.js) script can be included which will attach `IdbKvStore` to `window`.

## Usage

```js
var store = new IdbKvStore('your stores name')

// Store the value 'def' at key 'abc'
store.set('abc', 'def', function (err) {
  store.get('abc', function (err, value) {
    console.log('key=abc  value=' + value)
  })
})
```

Promises are also supported!

```js
var store = new IdbKvStore('your stores name')

// Store the value 'def' at key 'abc'
store.set('abc', 'def')
.then(() => store.get('abc'))
.then((value) => console.log('key=abc  value=' + value))
```

## API

### `store = new IdbKvStore(name, [opts], [cb])`

Instantiates a new key-value store. `name` is the name of the database used to persist the data. So multiple Store instances with the same name will be sharing the same data.

`cb(err)` is called when the databases is opened. If the open was successful then `err` is null, otherwise `err` contains the error.

`opts` can have the following property:
 * opts.channel - If the browser does not natively support BroadcastChannel then a custom implementation can be passed in.

### `store.set(key, value, [cb])`

Stores the `value` at `key`; the value can be retrieved through `store.get(key)`. When the store operation completes, `cb` is called with `cb(err)`. `err` is null if the store was successful. If `cb` is undefined then a promise is returned instead. If the key already exists then the old value is replaced with the new one.

### `store.add([key], value, [cb])`

The same as `store.set(...)` except if the key already exists, an error is returned in the callback.

Additionally, the key is optional. If left empty then an integer key will be automatically generated. Example: `store.add('value')`

### `store.get(key, [cb])`

Retrieves the value at `key`. When the value is retrieved, `cb` is called with `cb(err, value)`. If the retrieval was successful then `err` will be null. If `cb` is undefined then a promise is returned instead. If the key does not exist then undefined is returned as the `value`; no error is raised.

### `store.remove(key, [cb])`

Removes the given key from the store and calls `cb(err)` upon completion. `err` is null if the removal was successful. If the key did not exist before the removal, the removal is still considered successful. If `cb` is undefined then a promise is returned.

### `store.clear([cb])`

Removes all entries from the store, and calls `cb(err)` upon completion. `err` is null the clear was successful. If `cb` is undefined then a promise is returned.

### `store.keys([cb])`

Retrieves the list of keys stored. When the list is retrieved, `cb` is called with `cb(err, keys)`. If `cb` is undefined then a promise is returned.

### `store.json([cb])`

Retrieves the entire key-value store as a json object. When the json representation has been retrieved, `cb` is called with `cb(err, json)`. If `cb` is undefined, then a promise is returned.

### `store.count([cb])`

Retrieves the number of entries in the store, and calls `cb(err, count)` upon retrieval. `err` is null if the count was successful, in which case `count` will hold the value. If `cb` is undefined, then a promise is returned.

### `store.close()`

Closes the IndexedDB database and frees the internal resources. All subsequent calls to methods in `store` will throw errors.

### `IdbKvStore.INDEXEDDB_SUPPORT`

Detects native IndexedDB support

### `IdbKvStore.BROADCAST_SUPPORT`

Detects native BroadcastChannel support. If the BroadcastChannel api is not present then the 'change' event will never be emitted.

## Events

### `store.on('open', function () {})`

Emitted when the database is open

### `store.on('change', function (change) {})`

When another instance makes a modifying change to the database this event is emitted on all instances of the same database except for the instance that initiated the operation. `change` has the following properties:

 * change.method - Either: 'add', 'set', 'remove'
 * change.key - the key that was modifed
 * change.value - the new value stored at `key`. Only defined for 'add' and 'set'

For the 'change' event to be emitted the browser must have implemented the BroadcastChannel api . If the api does not exist, then setting a listener for this event will throw an error. To detect if native BroadcastChannel support exists, see: `IdbKvStore.BROADCAST_SUPPORT`.

### `store.on('close', function () {})`

Emitted when the database is closed

### `store.on('error', function (err) {})`

Emitted if any unhandled error occures. If an error occures in a function that was passed a callback, the error will be propagated through the callback instead of this event. If there is no callback to handle the error, then this event is emitted.

## License

MIT. Copyright (c) Austin Middleton.
