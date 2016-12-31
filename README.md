# idb-kv-store [![Build Status](https://travis-ci.org/xuset/idb-kv-store.svg?branch=master)](https://travis-ci.org/xuset/idb-kv-store) [![npm](https://img.shields.io/npm/v/idb-kv-store.svg)](https://npmjs.org/package/idb-kv-store)

Persistent key-value store for web browsers backed by IndexedDB

[![Sauce Test Status](https://saucelabs.com/browser-matrix/xuset-idb-kv.svg)](https://saucelabs.com/u/xuset-idb-kv)

idb-kv-store uses asynchronous get/set operations to persist everything in IndexedDB. Sometimes IndexedDB is needed over something like localStorage due to storage size constraints or simply, localStorage is not available within web workers. Since IndexedDB presents a complex api, storing simple key-value pairs can be complicated which this project greatly simplifies. Since everything is persisted to IndexedDB, the data you store is available across multiple web sessions and within web workers.

This module can be used with [browserify](http://browserify.org/) or the [idbkvstore.min.js](idbkvstore.min.js) script can be included which will attach `IdbKvStore` to `window`.

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

### `store = new Store(name, [cb])`

Instantiates a new key-value store. `name` is the name of the database used to persist the data. So multiple Store instances with the same name will be sharing the same data.

`cb(err)` is called when the databases is opened. If the open was successful then `err` is null, otherwise `err` contains the error.

### `store.set(key, value, [cb])`

Stores the `value` at `key`; the value can be retrieved through `store.get(key)`. When the store operation completes, `cb` is called with `cb(err)`. `err` is null if the store was successful. If `cb` is undefined then a promise is returned instead. If the key already exists then the old value is replaced with the new one.

### `store.add(key, value, [cb])`

The same as `store.set(...)` except if the key already exists, an error is returned in the callback.

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

## License

MIT. Copyright (c) Austin Middleton.
