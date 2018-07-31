'use strict'

var spawn = require('child_process').spawn

var cp // Recording process

// returns a Readable stream
exports.start = function (options) {
  cp = null // Empty out possibly dead recording process

  var defaults = {
    sampleRate: 16000,
    channels: 1,
    compress: false,
    threshold: 0.5,
    thresholdStart: null,
    thresholdEnd: null,
    silence: '1.0',
    verbose: false,
    recordProgram: 'sox'
  }

  options = Object.assign(defaults, options)

  // Capture audio stream
  var cmd, cmdArgs, cmdOptions, audioType
  switch (options.recordProgram) {
    // On some Windows machines, sox is installed using the "sox" binary
    // instead of "rec"
    case 'sox':
      cmd = "sox"
      audioType = "wav"
      if (options.audioType) audioType = options.audioType
      if (options.asRaw) audioType = "raw"
      cmdArgs = [
        '-q',                                   // show no progress
        '-t', 'waveaudio',
        '-d',
        '-r', options.sampleRate.toString(),    // sample rate
        '-c', '1',                              // channels
        '-e', 'signed-integer',                 // sample encoding
        '-b', '16',                             // precision (bits)
        '-t', audioType,  // audio type
        '-'
      ]
      break
    case 'rec':
    default:
      cmd = "rec"
      audioType = "wav"
      if (options.audioType) audioType = options.audioType
      cmdArgs = [
        '-q',                     // show no progress
        '-r', options.sampleRate, // sample rate
        '-c', options.channels,   // channels
        '-e', 'signed-integer',   // sample encoding
        '-b', '16',               // precision (bits)
        '-t', audioType,              // audio type
        '-',                      // pipe
            // end on silence
        'silence', '1', '0.1', options.thresholdStart || options.threshold + '%',
        '1', options.silence, options.thresholdEnd || options.threshold + '%'
      ]
      break
    // On some systems (RasPi), arecord is the prefered recording binary
    case 'arecord':
      cmd = 'arecord'
      audioType = "wav"
      if (options.audioType) audioType = options.audioType
      cmdArgs = [
        '-q',                     // show no progress
        '-r', options.sampleRate, // sample rate
        '-c', options.channels,   // channels
        '-t', audioType,              // audio type
        '-f', 'S16_LE',           // Sample format
        '-'                       // pipe
      ]
      if (options.device) {
        cmdArgs.unshift('-D', options.device)
      }
      break
  }

  // Spawn audio capture command
  cmdOptions = { encoding: 'binary' }
  if (options.device) {
    cmdOptions.env = Object.assign({}, process.env, { AUDIODEV: options.device })
  }
  cp = spawn(cmd, cmdArgs, cmdOptions)
  var rec = cp.stdout

  if (options.verbose) {
    console.log('Recording', options.channels, 'channels with sample rate',
        options.sampleRate + '...')
    console.time('End Recording')

    rec.on('data', function (data) {
      console.log('Recording %d bytes', data.length)
    })

    rec.on('end', function () {
      console.timeEnd('End Recording')
    })
  }

  return rec
}

exports.stop = function () {
  if (!cp) {
    console.log('Please start a recording first')
    return false
  }

  cp.kill() // Exit the spawned process, exit gracefully
  return cp
}
