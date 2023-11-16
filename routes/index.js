const express = require('express')
const actions = require('../methods/action')
const router = express.Router()

// User routes
router.get('/protected', actions.validateToken, actions.protectedRoute);
router.get('/users', actions.getUsers)
router.get('/users/except/:id', actions.getUsersExcept)
router.get('/users/:id', actions.getUser)
router.get('/users/search/:search', actions.getUserbySearch)
router.post('/users', actions.addUser)
router.put('/users/:id', actions.updateUser)
router.delete('/users/:id', actions.deleteUser)
router.post('/validate-token', actions.validateToken)
router.post('/login', actions.login)
router.post('/register', actions.register)

// project routes
router.get('/projects', actions.getAllProjects);
router.get('/projects/user/:id', actions.getProjectsByUser)
router.get('/projects/:id', actions.getProjectById);
router.post('/projects', actions.createProject)
router.put('/projects/:id', actions.editProject);
router.delete('/projects/:id', actions.deleteProject);

// tasks routes
router.get('/tasks', actions.getAllTasks);
router.get('/tasks/:id', actions.getTaskById);
router.post('/tasks', actions.createTask);
router.put('/tasks/:id', actions.updateTask);
router.delete('/tasks/:id', actions.deleteTask);

router.post('/subscribe/:id', actions.subscribe)

module.exports = router