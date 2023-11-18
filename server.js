const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
const passport = require('passport')
const bodyParser = require('body-parser')
const routes = require('./routes/index')
const webpush = require('web-push');
const http = require('http');
const socketIo = require('socket.io');

connectDB()

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
//mise en place du CORS
const corsOptions = {
    origin: 'https://front-pwa-eight.vercel.app',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,  // enable set cookie
    optionsSuccessStatus: 204,
  };
app.use(cors(corsOptions));

//Recuperation facile des parametres POST
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json())
app.use(routes)
app.use(passport.initialize())
require('./config/passport')(passport)


io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle events related to user joining a project room
    socket.on('joinRoom', (projectId) => {
        socket.join(projectId);
        console.log(`User joined room: ${projectId}`);
    });

    // Handle events related to task changes
    socket.on('taskUpdated', (projectId, taskId) => {
        // Broadcast the event to all users in the project room
        socket.to(projectId).emit('taskUpdated', taskId);
    });

    // ... other event handlers
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// server.listen(3002, () => {
//     console.log('Server running on port 3001');
// });