const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const taskSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],    
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
    },
    state: {
        type: String,
        enum: ['started', 'progress', 'finished'],
        default: 'started',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    dueDate: {
        type: Date,
    }
});

module.exports = mongoose.model('Task', taskSchema)
