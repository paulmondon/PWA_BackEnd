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
app.use(cors());

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

app.post('/souscrire', (req, res) => {
    webpush.setVapidDetails(
        'mailto:nico@gmail.com',
        'BOUfXxr7xEFzcjeXmvOFvbdsXosthzgbO5pyAUTWJ76XQ2fOLP0iau6ptvpdNyOVf-inaM3JIr9dXIE5f3oV3uE',
        'jfp4RXbjyCSbvb6d8elhfq0BzmaUQSLf-hCrL0NMRCA'
      );
    console.log('endpoint souscrire',req.body);
    const payload = {
        notification: {
            title: 'Ma notification d\'exemple',
            body: 'Voici le corps de ma notification',
            icon: 'assets/icons/logo512x512.png',
            actions: [
                { action: 'bar', title: 'Action custom' },
                { action: 'baz', title: 'Une autre action' },
            ],
            data: {
                onActionClick: {
                    default: { operation: 'openWindow',url: "http://localhost:3000/settings" },
                    bar: {
                        operation: 'focusLastFocusedOrOpen',
                        url: '/signin',
                    },
                    baz: {
                        operation: 'navigateLastFocusedOrOpen',
                        url: '/signin',
                    },
                },
            },
        },
    };
      webpush.sendNotification(req.body, JSON.stringify(payload));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

server.listen(3002, () => {
    console.log('Server running on port 3001');
});