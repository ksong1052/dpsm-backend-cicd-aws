// const mongoose = require('mongoose');

// mongoose.connect(config.mongoURI, {
//     useNewUrlParser:true, useUnifiedTopology:true, 
//     // useCreateIndex: true, useFindAndModify: false
// }).then(() => console.log("MongoDB Connected..."))
//   .catch((err) => console.log(err))

const mongoose = require('mongoose');

const config = require('../key');

const dbConnect = async () => {
    try {
        await mongoose.connect(
            config.mongoURI,
            {
                // useCreateIndex: true,
                // useFindAndModify: true,
                useUnifiedTopology: true,
                useNewUrlParser: true,
            }
        );
        console.log('DB is connected successfully');
    } catch (error) {
        console.log(`Error ${error.message}`);
    }
};

module.exports = dbConnect;