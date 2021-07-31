const mongoose = require('mongoose')
const assert = require('assert')
// const db_url = process.env.DB_URL;

const db_url = process.env.DB_URL_LOCAL

mongoose.connect(db_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: true
}, (error, link) => {
    assert.strictEqual(error, null, "Connection failed...")
    console.log("Database connection successful");
})

