var config = require('../config/dbconfig')
var mongoose = require('mongoose')
const User = require('../models/user');
const Task = require('../models/task');
const Project = require('../models/project');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

var functions = {
    // User functions
    getUsers: function (req, res) {
        User.find({})
            .exec()
            .then(users => {
                res.json({ success: true, message: users });
            })
            .catch(err => {
                res.json({ success: false, message: err });
            });
    },
    getUser: function (req, res) {
        User.findById(req.params.id, function (err, user) {
            if (err) {
                res.json({ success: false, message: err });
            } else {
                res.json({ success: true, message: user });
            }
        });
    },
    getUserbySearch: async function (req, res) {
        const searchParam = req.params.searchParam; // Assuming the query parameter is named "searchParam"

        try {
            // Use a regular expression for case-insensitive search
            const users = await User.find({
                $or: [
                    { username: { $regex: new RegExp(searchParam, 'i') } },
                    { email: { $regex: new RegExp(searchParam, 'i') } }
                ]
            });

            if (users.length > 0) {
                res.json({ success: true, message: 'Users found successfully', users });
            } else {
                res.json({ success: false, message: 'No users found' });
            }
        } catch (error) {
            console.error('Error searching for users:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },
    addUser: function (req, res) {
        User.findOne({ username: req.body.username })
            .exec()
            .then(existingUser => {
                if (existingUser) {
                    res.json({ success: false, message: 'A user with that username already exists.' });
                } else {
                    return User.findOne({ email: req.body.email }).exec();
                }
            })
            .then(existingEmailUser => {
                if (existingEmailUser) {
                    res.json({ success: false, message: 'A user with that email already exists.' });
                } else {
                    const user = new User(req.body);
                    return user.save();
                }
            })
            .then(savedUser => {
                res.json({ success: true, message: savedUser });
            })
            .catch(err => {
                res.json({ success: false, message: err });
            });
    },
    updateUser: function (req, res) {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.json({ success: false, message: 'Invalid ID' });
            return;
        }
        const modifiedPassword = req.body.password;
        if (modifiedPassword) {
            bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                    res.json({ success: false, message: err });
                } else {
                    bcrypt.hash(modifiedPassword, salt, (err, hash) => {
                        if (err) {
                            res.json({ success: false, message: err });
                        } else {
                            req.body.password = hash;
                            User.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, updatedUser) {
                                if (err) {
                                    res.json({ success: false, message: err });
                                } else {
                                    res.json({ success: true, message: updatedUser });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            const { appointment, discussions, quizz, messages, ...rest } = req.body;
            const update = { $push: {} };
            if (appointment) {
                update.$push.appointment = appointment;
            }
            if (discussions) {
                update.$push.discussions = discussions;
            }
            if (quizz) {
                update.$push.quizz = quizz;
            }
            if (messages) {
                update.$push.messages = messages;
            }
            if (Object.keys(update.$push).length === 0) {
                // if none of the arrays were updated, just update the rest of the fields
                User.findByIdAndUpdate(req.params.id, rest, { new: true }, function (err, updatedUser) {
                    if (err) {
                        res.json({ success: false, message: err });
                    } else {
                        res.json({ success: true, message: updatedUser });
                    }
                });
            } else {
                User.findByIdAndUpdate(req.params.id, update, { new: true }, function (err, updatedUser) {
                    if (err) {
                        res.json({ success: false, message: err });
                    } else {
                        res.json({ success: true, message: updatedUser });
                    }
                });
            }
        }
    },

    deleteUser: async function (req, res) {
        try {
            const result = await User.findByIdAndRemove(req.params.id);
            if (result) {
                res.json({ success: true, message: 'User deleted successfully' });
            } else {
                res.json({ success: false, message: 'User not found' });
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },


    // Authentification functions
    register: async function (req, res) {
        // Validate the request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json({ success: false, errors: errors.array() });
        }

        // Extract user details from the request body
        const { username, email, password } = req.body;

        try {
            // Check if the username and email are unique
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) {
                return res.json({ success: false, message: 'Username or email already exists' });
            }

            // Create a new user
            const newUser = new User({
                username,
                email,
                password, // Already hashed in the pre-save hook
            });

            // Save the user to the database
            const savedUser = await newUser.save();

            return res.json({ success: true, message: 'User registered successfully', user: savedUser });
        } catch (error) {
            console.error('Error registering user:', error);
            return res.json({ success: false, message: 'Internal server error' });
        }
    },

    login: async function (req, res) {
        // Validate the request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return resjson({ success: false, errors: errors.array() });
        }

        // Extract user details from the request body
        const { email, password } = req.body;

        try {
            // Check if the user exists
            const user = await User.findOne({ email });
            if (!user) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }

            // Check if the password is correct
            const isPasswordMatch = await bcrypt.compare(password, user.password);
            if (!isPasswordMatch) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }

            // Generate a JWT token
            const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '1h' });

            return res.json({ success: true, token, user: { username: user.username, email: user.email } });
        } catch (error) {
            console.error('Error logging in user:', error);
            return res.json({ success: false, message: 'Internal server error' });
        }
    },
    validateToken: function (req, res) {
        // Validate the request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json({ success: false, errors: errors.array() });
        }

        // Extract the token from the request body
        const { token } = req.body;

        try {
            // Verify the token
            const decodedToken = jwt.verify(token, 'CQE!q??eMsrtRgFL9s;{ng8/CkC?OK');

            // Respond with the decoded token
            return res.json({ success: true, user: decodedToken });
        } catch (error) {
            console.error('Error validating token:', error);
            return res.json({ success: false, message: 'Invalid token' });
        }
    },

    // Project functions
    getAllProjects: async function (req, res) {
        try {
            const projects = await Project.find().populate('users').populate('tasks');
            res.json({ success: true, projects });
        } catch (error) {
            console.error('Error getting projects:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },    

    getProjectById: async function (req, res) {
        const projectId = req.params.id;
    
        try {
            const project = await Project.findById(projectId).populate('users').populate('tasks');
            if (!project) {
                return res.json({ success: false, message: 'Project not found' });
            }
    
            res.json({ success: true, project });
        } catch (error) {
            console.error('Error getting project by ID:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },    

    createProject: async function (req, res) {
        // Extract project details from the request body
        const { title, users } = req.body;

        try {
            // Create a new project
            const newProject = new Project({
                title,
                users,
            });

            // Save the project to the database
            const savedProject = await newProject.save();
            await User.updateMany(
                { _id: { $in: users } },
                { $push: { projects: savedProject._id } }
            );

            res.json({ success: true, message: 'Project created successfully', project: savedProject });
        } catch (error) {
            console.error('Error creating project:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },

    editProject: async function (req, res) {
        const projectId = req.params.id;
        const { title, users, tasks } = req.body;

        try {
            const updatedProject = await Project.findByIdAndUpdate(
                projectId,
                { title, users, tasks },
                { new: true, runValidators: true }
            );

            if (!updatedProject) {
                return res.json({ success: false, message: 'Project not found' });
            }

            res.json({ success: true, message: 'Project updated successfully', project: updatedProject });
        } catch (error) {
            console.error('Error editing project:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },

    deleteProject: async function (req, res) {
        const projectId = req.params.id;

        try {
            const deletedProject = await Project.findByIdAndRemove(projectId);

            if (!deletedProject) {
                return res.json({ success: false, message: 'Project not found' });
            }

            res.json({ success: true, message: 'Project deleted successfully' });
        } catch (error) {
            console.error('Error deleting project:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },

    // Tasks function
    getAllTasks: async function (req, res) {
        try {
            const tasks = await Task.find().populate('users', 'username email').populate('project');
            res.json({ success: true, tasks });
        } catch (error) {
            console.error('Error getting tasks:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },

    getTaskById: async function (req, res) {
        const taskId = req.params.id;
    
        try {
            const task = await Task.findById(taskId).populate('users').populate('project');
            if (!task) {
                return res.json({ success: false, message: 'Task not found' });
            }
    
            res.json({ success: true, task });
        } catch (error) {
            console.error('Error getting task by ID:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },

    createTask: async function (req, res) {
        // Extract task details from the request body
        const { title, description, users, project, state, dueDate } = req.body;

        try {
            // Create a new task
            const newTask = new Task({
                title,
                description,
                users,
                project,
                state,
                dueDate,
            });

            // Save the task to the database
            const savedTask = await newTask.save();

            // Update the project's tasks array
            await Project.findByIdAndUpdate(
                project,
                { $push: { tasks: savedTask._id } },
                { new: true, runValidators: true }
            );

            res.json({ success: true, message: 'Task created successfully', task: savedTask });
        } catch (error) {
            console.error('Error creating task:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },

    updateTask: async function (req, res) {
        const taskId = req.params.id;
        const { title, description, users, project, state, dueDate } = req.body;
    
        try {
            const updatedTask = await Task.findByIdAndUpdate(
                taskId,
                { title, description, users, project, state, dueDate },
                { new: true, runValidators: true }
            ).populate('users').populate('project');
    
            if (!updatedTask) {
                return res.json({ success: false, message: 'Task not found' });
            }
    
            res.json({ success: true, message: 'Task updated successfully', task: updatedTask });
        } catch (error) {
            console.error('Error updating task:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    },

    deleteTask: async function (req, res) {
        const taskId = req.params.id;
    
        try {
            const deletedTask = await Task.findByIdAndRemove(taskId);
    
            if (!deletedTask) {
                return res.json({ success: false, message: 'Task not found' });
            }
    
            res.json({ success: true, message: 'Task deleted successfully' });
        } catch (error) {
            console.error('Error deleting task:', error);
            res.json({ success: false, message: 'Internal server error' });
        }
    }

}

module.exports = functions;