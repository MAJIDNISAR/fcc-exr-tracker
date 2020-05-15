// All requirements
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
const dotenv = require('dotenv').config()
// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

// Use the requirements
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// let's make json a bit cleaner
app.set('json spaces', 2)

// Send the HTML
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// Import model
const user = require('./schema.js').user

//  /api/exercise/new-user  code
app.post('/api/exercise/new-user', function (req, res, next) {
  const username = req.body.username

  if (username) {
    // check if name is entered in field
    const userAdd = { username: username, count: 0, log: [] }
    user.findOne({ username: userAdd.username }, (err, data) => {
      if (err) next(err)
      if (data) {
        res.send('Username is already taken.')
      } else {
        user.create(userAdd, (err, data) => {
          if (err) next(err)
          res.json({ username: data.username, _id: data._id })
        })
      }
    })
  } else {
    res.send('Please provide a username')
  }
})

//  /api/exercise/add  code
app.post('/api/exercise/add', function (req, res, next) {
  const userId = req.body.userId
  const description = req.body.description
  const duration = req.body.duration
  const date = req.body.date ? new Date(req.body.date) : new Date()
  console.log('userid', userId)
  console.log('description', description)
  console.log('duration', duration)
  console.log('date', date)
  let exerciseData
  console.log('value of the and operation is: ', userId && description && duration)
  if (userId && description && duration) {
    user.findById(userId, function (err, data) {
      if (err) next(err)
      if (data) {
        data.count = data.count + 1
        const additionExercise = {
          description: description,
          duration: duration,
          date: new Date(date)// date.toDateString()
        }
        data.log.push(additionExercise)
        data.save((err, data) => {
          if (err) console.log(err)
          exerciseData = {
            username: data.username,
            _id: data._id,
            description: description,
            duration: duration,
            date: new Date(date) // date.toDateString()
          }
          console.log(exerciseData)
          console.log(additionExercise)
          res.json(exerciseData)
        })
      }
    })
  } else {
    res.send('Please fill in all required fields.')
  }
})

app.get('/api/exercise/log', function (req, res, next) {
  const userId = req.query.userId

  if (userId) {
    const from = new Date(req.query.from)
    const to = new Date(req.query.to)
    const limit = req.query.limit
    const limitOptions = {}
    if (limit) limitOptions.limit = limit
    console.log('from =', from, 'to=', to, 'limit=', limit)
    console.log('from =', typeof from, 'to=', typeof to, 'limit=', typeof limit)
    // console.log(from.toDateString())
    user
      .findById(userId)
      // .populate({
      //   path: 'log',
      //   match: {},
      //   select: '_id',
      //   options: limitOptions
      // })
      .exec((err, data) => {
        if (err) next(err)
        if (data) {
          console.log('unfiltered data====>', data)
          console.table(data.log)
          const displayData = {
            id: data.id,
            username: data.username,
            count: data.count
            // log: data.log
          }
          if (from) displayData.from = from.toDateString() // new Date(from) //from.toDateString();
          if (to) displayData.to = to.toDateString()// new Date(to) //to.toDateString();
          displayData.log = data.log.filter(item => {
            if (from && to) {
              return item.date >= from && item.date <= to
            } else if (from) {
              return item.date >= from
            } else if (to) {
              return item.date <= to
            } else {
              return true
            }
          })
          res.json(displayData)
        } else {
          next()
        }
      })
  } else {
    res.send(
      'UserId is required. For example, api/exercise/log?userId=554fejdcdd485fje'
    )
  }
})

// app.get('/api/exercise/log', function (req, res, next) {
//   const userId = req.query.userId

//   if (userId) {
//     const from = req.query.from
//     const to = req.query.to
//     const limit = req.query.limit
//     const limitOptions = {}
//     console.log('from,to,limit', from, to, limit)

//     if (limit) limitOptions.limit = limit

//     user
//       .findById(userId)
//       .populate({
//         path: 'log',
//         match: {},
//         select: '-_id',
//         options: limitOptions
//       })
//       .exec((err, data) => {
//         if (err) next(err)
//         if (data) {
//           console.log('data=>', data)
//           const displayData = {
//             id: data.id,
//             username: data.username,
//             count: data.count
//           }
//           if (from) displayData.from = from.toDateString() // new Date(from)
//           if (to) displayData.to = to.toDateString()// new Date(to)
//           displayData.log = data.log.filter(item => {
//             if (from && to) {
//               return item.date >= from && item.date <= to
//             } else if (from) {
//               return item.date >= from
//             } else if (to) {
//               return item.date <= to
//             } else {
//               return true
//             }
//           })
//           res.json(displayData)
//         } else {
//           next()
//         }
//       })
//   } else {
//     res.send(
//       'UserId is required. For example, api/exercise/log?userId=554fejdcdd485fje'
//     )
//   }
// })

app.get('/api/exercise/users', function (req, res) {
  console.log('loading///')
  user.find({}, function (err, data) {
    if (err) err
    const obj = data.map(item => {
      return `username:${item.username}, _id:${item._id}`
    })
    res.json(obj)
  })
})

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res
    .status(errCode)
    .type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
