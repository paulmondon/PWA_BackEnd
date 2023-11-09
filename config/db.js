const mongoose = require('mongoose')
const dbCOnfig = require('./dbconfig')
const connectDB = async() => {
    try {
        const connection = await mongoose.connect(dbCOnfig.database, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            autoIndex: true
        })
        console.log(`MongoDB Connected: ${connection.connection.host}`)
    } catch (err) {
        console.log(err)
        process.exit(1)
    }
}

module.exports = connectDB