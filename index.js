//library include
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const morgan = require("morgan");
const database = require("./database");

const port = process.env.PORT;

//user routes
const userRoutes = require("./routes/UserRoute");

//middleware
app.use(cors());
app.use(morgan("dev"));
app.use("/api/user", userRoutes);
app.use(express.static("public"));

//routes
app.get("/", (req, res) => {
  res.status(200).json({
    status: true,
    message: "Hello from server",
  });
});

//server start
app.listen(port, () => {
  console.log(`server running at ${port}`);
});
