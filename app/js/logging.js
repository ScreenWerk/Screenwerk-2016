Object.defineProperty(global, '__stack', {
  get: function() {
    var orig = Error.prepareStackTrace
    Error.prepareStackTrace = function(_, stack) {
        return stack
    }
    var err = new Error
    Error.captureStackTrace(err, arguments.callee)
    var stack = err.stack
    Error.prepareStackTrace = orig
    return stack
  }
})

const fs = require('fs')
const path = require('path')
const LOGFILE = path.resolve(__dirname, '..', '..', 'local', 'console.log')
console.log(LOGFILE)
var streamer = fs.createWriteStream(LOGFILE, 'utf8')

// process.stdout.write = process.stderr.write = streamer.write.bind(streamer)
streamer.write('fo')
streamer.end()
// console.log('asdas')

setTimeout(function () {
  process.exit(0)
}, 0)

// process.__defineGetter__('stdout', function() { return streamer })
// process.__defineGetter__('stderr', function() { return streamer })

const clc = require('cli-color')
const mapping = {
    log: clc.blue,
    warn: clc.yellow,
    error: clc.red
}
const methods = Object.keys(mapping)

methods.forEach(function(method) {
  var oldMethod = console[method].bind(console)
  console[method] = function() {
    oldMethod.apply(
      console,
      [mapping[method](new Date().toISOString()).replace(/[TZ]/g, ' ')
        + __stack[1].getFileName().substr(__stack[1].getFileName().lastIndexOf('/')+1)
        + (__stack[1].getFunctionName() ? ' ' + __stack[1].getFunctionName() : '') + ':' + __stack[1].getLineNumber()
        + '']
        .concat(Array.prototype.slice.apply(arguments))
    )
  }
})
