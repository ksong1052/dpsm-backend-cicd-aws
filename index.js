const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');


/* DB 연결 */ 
const dbConnect = require("./config/db/dbConnect");
dbConnect();


/* Middleware 연결 */ 
//to not get any deprecation warning or error
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));
//to get json data
// support parsing of application/json type post data
app.use(bodyParser.json());;
// Cookies에 있는 정보를 분석해 준다.
app.use(cookieParser());
app.use(cors());


/* Router 연결 */ 
const usersRoute = require('./routes/users');
const productsRoute = require('./routes/products');

app.use('/api/users', usersRoute);
app.use('/api/products', productsRoute);


/* Uploading Files */
//use this to show the image you have in node js server to client (react js)
//https://stackoverflow.com/questions/48914987/send-image-path-from-node-js-express-server-to-react-client
app.use('/uploads', express.static('uploads'));

// Serve static assets if in production
if (process.env.NODE_ENV === "production") {

  // Set static folder   
  // All the javascript and css files will be read and served from this folder
  app.use(express.static("client/build"));

  // index.html for all page routes    html or routing and naviagtion
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client", "build", "index.html"));
  });
}


/* Listening Port */
const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log(`Server Listening on ${port}`)
});