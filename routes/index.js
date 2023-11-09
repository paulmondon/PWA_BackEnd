const express = require('express')
const actions = require('../methods/action')
const router = express.Router()

// User routes
router.get('/users', actions.getUsers)
router.get('/users/:id', actions.getUser)
router.post('/users', actions.addUser)
router.put('/users/:id', actions.updateUser)
router.delete('/users/:id', actions.deleteUser)
router.post('/validate-token', actions.validateToken)
router.post('/login', actions.login)
router.post('/register', actions.register)

// tasks routes
router.get('/tasks/:projectId', actions.getTasksByProject)
router.get('/tasks/:projectId/:taskId', actions.getTaskOfProjectById)
router.post('/tasks/:projectId', actions.createTask)
router.put('/tasks/:projectId/:taskId', actions.updateTaskOfProjectById)
router.delete('/tasks/:projectId/:taskId', actions.deleteTaskOfProject)

module.exports = router