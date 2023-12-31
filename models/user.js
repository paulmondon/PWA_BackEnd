const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt')

const userSchema = new Schema({
    username: {
        type: String,
        unique: true,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    tasks: [{
        type: Schema.Types.ObjectId,
        ref: 'Task',
    }],
    projects: [{
        type: Schema.Types.ObjectId,
        ref: 'Project',
    }],
    endpoint: {
        type: String,
        default: false,
    },
    subscription: {
        type: Object,
        properties: {
            endpoint: {
                type: String,
            },
            expirationTime: {
                type: Number,
                nullable: true,
            },
            keys: {
                type: Object,
                properties: {
                    p256dh: {
                        type: String,
                    },
                    auth: {
                        type: String,
                    },
                },
                // required: ['p256dh', 'auth'],
            },
        },
        // required: ['endpoint', 'keys'],
    },
    notification: {
        type: Boolean,
        default: false
    },
});

userSchema.pre('save', function(next) {
    var user = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function(err, salt) {
            if (err) {
                return next(err)
            }
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) {
                    return next(err)
                }
                user.password = hash;
                next()
            })
        })
    }
    else {
        return next()
    }
})

userSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function(err, isMatch) {
        if (err) {
            return cb(err)
        }
        cb(null, isMatch)
    })
}

module.exports = mongoose.model('User', userSchema)