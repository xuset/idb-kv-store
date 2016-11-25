# idb-kv-store [![Build Status](https://travis-ci.org/xuset/idb-kv-store.svg?branch=master)](https://travis-ci.org/xuset/idb-kv-store)

Persistent key-value store for web browsers backed by IndexDB

[![Sauce Test Status](https://saucelabs.com/browser-matrix/xuset.svg)](https://saucelabs.com/u/xuset)

idb-kv-store uses asynchronous get/set operations to persist everything in IndexDB. Sometimes IndexDB is needed over something like localStorage due to storage size constraints or simply, localStorage is not available within web workers. Since IndexDB presents a complex api, storing simple key-value pairs can be complicated which this project greatly simplifies. Since everything is persisted to IndexDB, the data you store is available across multiple web sessions and within web workers.

This module can be used with [browserify](http://browserify.org/) or the `idbkvstore.min.js` script can be included.

## Usage

```js
var IdbKvStore = require('idb-kv-store')
var store = new IdbKvStore()

// Store the value 'def' at key 'abc'
store.set('abc', 'def', function (err) {
  store.get('abc', function (err, value) {
    console.log('key=abc  value=' + value)
  })
})
```

Promises are also supported!

```js
var IdbKvStore = require('idb-kv-store')
var store = new IdbKvStore()

// Store the value 'def' at key 'abc'
store.set('abc', 'def')
.then(() => store.get('abc'))
.then((value) => console.log('key=abc  value=' + value))
```

## API

### `store = new IdbKvStore([opts])`

Instantiates a new key-value store.

`opts` can take the following options:
 * `opts.name` - The name of the IndexDB database to open
 * `opts.onready` - A zero argument function to call when the IndexDB database is open
 * `opts.onerror` - This function is called when IndexDB experiences an error. It accepts one error argument. If this is undefined, the error is thrown instead.

### `store.set(key, value, [cb])`

Stores the `value` at `key`; the value can be retreived through `store.get(key)`. When the store operation completes, `cb` is called with `cb(err)`. `err` is null if the store was successful. If `cb` is undefined then a promise is returned instead.

### `store.get(key, [cb])`

Retreives the value at `key`. When the value is retreived, `cb` is called with `cb(err, value)`. If the retreival was successful then `err` will be null. If `cb` is undefined then a promise is returned instead.

## License

MIT. Copyright (c) Austin Middleton.
