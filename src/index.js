const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {addUser, getUser, removeUser, getUsersInRoom} = require('./utils/users')

const port = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = socketio(server)

// Define paths for Express config
const publicDirectoryPath = path.join(__dirname,'../public')

app.use(express.static(publicDirectoryPath))


// server(emit) -> client(receive) - countUpdated
// client(emit) -> server(receive) - increment

io.on('connection', (socket)=> {
    console.log('New Websocket connection')

        socket.on('join', (options, callback) => {
            const {error, user} = addUser({ id: socket.id, ...options })
            if(error) {
                callback(error)
            }

            socket.join(user.room)
            socket.emit('message', generateMessage('Admin', 'Welcome!'))
            socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })

            callback()
        })

    socket.on('sendMessage', (inputMessage, callback) => {
        const filter = new Filter()
        const user = getUser(socket.id)

        if(filter.isProfane(inputMessage)){
            return callback('Profanity is not allowed')
        }

        io.to(user.room).emit('message', generateMessage(user.username, inputMessage))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })


    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })


    // socket.on('increment', () => {
    //     count++
        // socket.emit('countUpdated', count)
        // io.emit('countUpdated', count)
    // })
})

server.listen(port, () => {
    console.log('Server is up on port' + port)
})

// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '../public/index.html'))
// })