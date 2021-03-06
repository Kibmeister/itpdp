'use strict'

// Initialize requires:
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const express = require('express')
const exphbs = require('express-handlebars')
const bodyParser = require('body-parser')
const Words = require('../db/words').Words
const Recordings = require('../db/recording').Recordings

// Initialize express:
const app = express()
app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs',
  layoutsDir: path.join(__dirname, '../views/layouts')
}))
app.set('view engine', '.hbs')
app.set('views', path.join(__dirname, '../views'))
// Start server and print server IP and port:
const PORT = 8080

require('http').createServer(app).listen(PORT, () => {
  console.log(`Server hosted on ${require('ip').address()}:${PORT}`)
})

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, '../public')))

app.get('/', (request, response, next) => { response.redirect('/index') })
app.get('/index', (request, response, next) => { response.render('index') })

// #1 Get one pool of words
app.get('/groups', (request, response, next) => {
  if (request.accepts('application/json') && !request.accepts('text/html')) {
    Words.wordsGUIQuery((err, res) => {
      if (err) throw err
      let dataWords = []
      Array.prototype.push.apply(dataWords, res)
      Words.recordingsGUIQuery((err, res2) => {
        if (err) throw err
        let dataRecordings = []
        Array.prototype.push.apply(dataRecordings, res2)
        let GUIdata = res
        GUIdata.forEach(function (GUIEntry) {
          GUIEntry.path = []
          dataRecordings.forEach(function (recordingEntry) {
            if (GUIEntry.word === recordingEntry.word) {
              GUIEntry.path.push(recordingEntry.rpath)
            }
          })
        })
        // console.log(GUIdata)
        response.end(JSON.stringify(GUIdata))
      })
    })
  }
})
// #2 Save a mainword with three following quewords to the db
app.post('/index', (request, response, next) => {
  console.log('index POST route.')
  const spawn = {
    word: request.body.main,
    queWord1: request.body.help1,
    queWord2: request.body.help2,
    queWord3: request.body.help3
  }
  console.log(spawn)
  Words.add(spawn, (err, spawn) => {
    if (err) return next(err)
    response.redirect('/index')
  })
})
// #3 Get one pair of mainword and voicerecording
app.get('/dictionary', (request, response, next) => {
  if (request.accepts('application/json') && !request.accepts('text/html')) {
    Words.recordingsGUIQuery((err, data) => {
      if (err) return next(err)
      response.contentType('application/json')
      response.end(JSON.stringify(data))
    })
  } else {
    response.render('index')
  }
})

const upload = multer()

app.post('/uploadAudio', upload.single('file'), function (req, res) {
  var recordingsdir = ('./public/recordings')
  var recordingNo
  fs.readdir(recordingsdir, function (err, files) {
    if (err) throw err
    recordingNo = (files.length.toString() + 1).concat('.wav')
    let uploadLocation = path.join(__dirname, '..', recordingsdir, recordingNo)
    if (path.extname(req.file.originalname).toLowerCase() === '.wav') {
      fs.writeFile(uploadLocation, Buffer.from(new Uint8Array(req.file.buffer)), { flag: 'w' }, function (err) {
        if (err) throw err
        let recordingPath = path.join('/recordings/', recordingNo)
        Recordings.add(req.body.chosenWord, recordingPath, function (err) {
          if (err) throw err
        })
      })
      res.sendStatus(200)
    } else {
      fs.unlink(req.path, function (err) {
        if (err) return err
        res.sendStatus(403)
      })
    }
  })
})
