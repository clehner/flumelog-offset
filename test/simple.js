
var tape = require('tape')
var pull = require('pull-stream')
var Offset = require('../')


var file = '/tmp/offset-test_'+Date.now()+'.log'
var db = Offset(file, 16)
var live = []

pull(
  db.stream({live: true, sync: false, seqs: false}),
  pull.drain(function (data) {
    live.push(data)
  })
)

tape('simple', function (t) {
  t.equal(db.since.value, undefined)
  var offsets = []
  var rm = db.since(function (_v) {
    offsets.push(_v)
  })
  db.since.once(function (_v) {
    t.equal(_v, -1)

    db.append(new Buffer('hello world'), function (err, offset1) {
      if(err) throw err
      console.log(db.since.value, offset1)
      t.equal(offset1, 0)
      //NOTE: 'hello world'.length + 8 (start frame + end frame)
      t.equal(db.since.value, 0)
      db.append(new Buffer('hello offset db'), function (err, offset2) {
        if(err) throw err
        t.equal(offset2, 19)
        t.deepEqual(offsets, [-1, 0, 19], 'appended two records')
        db.get(offset1, function (err, b) {
          if(err) throw err
          t.equal(b.toString(), 'hello world', 'read second value')

          db.get(offset2, function (err, b2) {
            if(err) throw err
            t.equal(b2.toString(), 'hello offset db')
            db.getPrevious(offset2, function (err, b) {
              if(err) throw err
              t.equal(b.toString(), 'hello world')
              t.end()
            })
          })
        })
      })
    })
  })
})

/*
          8,       4,      32,      32           = 76
_header = {offset, length, prev_mac, hash(data)}
        32,           76,      = 108
header = mac(_header)|_header
data (length)
         4
footer = length

OR, encrypted database?

header_mac (16)
  [offset(8), length(4), data_mac(16)]

footer_mac(16)
  [length (4)]

*/
tape('stream', function (t) {

  pull(
    db.stream({min: 0, seqs: false}),
    pull.collect(function (err, ary) {
      if(err) throw err
      console.log(ary)
      t.deepEqual(ary.map(String), ['hello world', 'hello offset db'])
      t.end()
    })
  )

})

tape('live', function (t) {
  t.deepEqual(live.map(String), ['hello world', 'hello offset db'])
  t.end()
})

tape('reverse', function (t) {
  pull(
    db.stream({reverse: true, seqs: false}),
    pull.collect(function (err, ary) {
      t.deepEqual(ary.map(String), ['hello offset db', 'hello world'])
      t.end()
    })
  )
})

tape('append batch', function (t) {
  var file = '/tmp/offset-test_2_'+Date.now()+'.log'
  var db = Offset(file, 16)

  db.append([
    new Buffer('hello world'),
    new Buffer('hello offset db'),
  ], function (err, offsets) {
    if(err) throw err
    t.deepEqual(offsets, 19)
    t.end()
  })

})

tape('stream in empty database', function (t) {
  var file = '/tmp/offset-test_3_'+Date.now()+'.log'
  var db = Offset(file, 16)

//  db.append([
//    new Buffer('hello world'),
//    new Buffer('hello offset db'),
//  ], function (err, offsets) {
//    if(err) throw err
//    t.deepEqual(offsets, [0, 19])
//    console.log('OFFSETS', offsets)
//    t.end()
//  })

  db.since.once(function (_offset) {
    t.equal(_offset, -1, 'offset is zero')
  })

  pull(
    db.stream(),
    pull.collect(function (err, ary) {
      if(err) throw err
      t.deepEqual(ary, [])
      t.end()
    })
  )

})


tape('stream in before append cb', function (t) {
  var file = '/tmp/offset-test_4_'+Date.now()+'.log'
  var db = Offset(file, 16)

//  db.append([
//    new Buffer('hello world'),
//    new Buffer('hello offset db'),
//  ], function (err, offsets) {
//    if(err) throw err
//    t.deepEqual(offsets, [0, 19])
//    console.log('OFFSETS', offsets)
//    t.end()
//  })

  db.since.once(function (_offset) {
    t.equal(_offset, -1, 'offset is zero')
  })

  db.append(new Buffer('hello world'), function (err, offset) {
    
  })

  pull(
    db.stream(),
    pull.collect(function (err, ary) {
      if(err) throw err
      t.deepEqual(ary, [])
      t.end()
    })
  )


})








