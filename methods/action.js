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

    deleteUser: function (req, res) {
        User.findByIdAndRemove(req.params.id, function (err) {
            if (err) {
                res.json({ success: false, message: err });
            } else {
                res.json({ success: true, message: 'User deleted successfully' });
            }
        });
    },

    // Authentification functions
    authenticate: function (req, res) {
        User.findOne({ email: req.body.email }, function (err, user) {
            if (err) {
                return res.json({ success: false, message: 'Error while fetching user.' });
            }
            if (!user) {
                return res.json({ success: false, message: "Échec de l'authentification, l'utilisateur n'a pas été trouvé" });
            }
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (err) {
                    return res.json({ success: false, message: 'Error while comparing passwords.' });
                }
                if (isMatch) {
                    const token = jwtweb.sign({ id: user._id }, '2e3bef7352257d3422fc2e1803c468be04902785c2ce1b3d3b0b2962a12a229798ccb11cb5b1300c5f704e557056557e18c999a6afb49c2ec47f1aabef900a52', { expiresIn: '2h' });
                    res.json({ success: true, token: token, user: user, message: 'connecté avec succès' })
                } else {
                    return res.json({ success: false, message: "Échec de l'authentification : mot de passe erroné" });
                }
            });
        });
    },
    register: async function (req, res) {
        // Validate the request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Extract user details from the request body
        const { username, email, password } = req.body;

        try {
            // Check if the username and email are unique
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Username or email already exists' });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create a new user
            const newUser = new User({
                username,
                email,
                password: hashedPassword,
            });

            // Save the user to the database
            const savedUser = await newUser.save();

            return res.status(201).json({ success: true, message: 'User registered successfully', user: savedUser });
        } catch (error) {
            console.error('Error registering user:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    login: async function (req, res) {
        // Validate the request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Extract user details from the request body
        const { email, password } = req.body;

        try {
            // Check if the user exists
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }

            // Check if the password is correct
            const isPasswordMatch = await bcrypt.compare(password, user.password);
            if (!isPasswordMatch) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }

            // Generate a JWT token
            const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '1h' });

            return res.status(200).json({ success: true, token, user: { username: user.username, email: user.email } });
        } catch (error) {
            console.error('Error logging in user:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    validateToken: function (req, res) {
        // Validate the request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Extract the token from the request body
        const { token } = req.body;

        try {
            // Verify the token
            const decodedToken = jwt.verify(token, 'CQE!q??eMsrtRgFL9s;{ng8/CkC?OK');

            // Respond with the decoded token
            return res.status(200).json({ success: true, user: decodedToken });
        } catch (error) {
            console.error('Error validating token:', error);
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
    },
    createTask: async function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Extract task details from the request body, including the state
        const { title, description, user, project, state } = req.body;

        try {
            // Create a new task
            const newTask = new Task({
                title,
                description,
                user,
                project,
                state,
            });

            // Save the task to the database
            const savedTask = await newTask.save();

            return res.status(201).json({ success: true, message: 'Task created successfully', task: savedTask });
        } catch (error) {
            console.error('Error creating task:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    getTasksByProject: async function (req, res) {
        try {
            const tasks = await Task.find({ project: req.params.projectId });
            res.json({ success: true, tasks });
        } catch (error) {
            console.error('Error fetching tasks:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    getTaskOfProjectById: async function (req, res) {
        try {
            const task = await Task.findOne({
                _id: req.params.taskId,
                project: req.params.projectId,
            });

            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }

            res.json({ success: true, task });
        } catch (error) {
            console.error('Error fetching task:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    updateTaskOfProjectById: async function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Extract task details from the request body, including the state
        const { title, description, user, project, state } = req.body;

        try {
            // Update the task in the database based on the task ID
            const updatedTask = await Task.findByIdAndUpdate(
                req.params.id,
                {
                    title,
                    description,
                    user,
                    project,
                    state, // Include the state from the request body
                },
                { new: true } // Return the updated task
            );

            if (!updatedTask) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }

            return res.status(200).json({ success: true, message: 'Task updated successfully', task: updatedTask });
        } catch (error) {
            console.error('Error updating task:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    deleteTaskOfProject: async function (req, res) {
        try {
            const deletedTask = await Task.findOneAndDelete({
                _id: req.params.taskId,
                project: req.params.projectId,
            });

            if (!deletedTask) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }

            res.json({ success: true, message: 'Task deleted successfully' });
        } catch (error) {
            console.error('Error deleting task:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

}

module.exports = functions;