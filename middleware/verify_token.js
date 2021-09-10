const jsw = require("jsonwebtoken");
const token_key = process.env.TOKEN_KEY;
const User = require("./../models/User");

function verifyToken(req, res, next) {
  //read jsw Token from HTTP header
  const token = req.headers["x-access-token"];

  //check token is empty
  if (!token) {
    res.status(404).json({
      status: false,
      message: "JSON web Token not found....",
    });
  }

  jsw.verify(token, token_key, (error, decoded) => {
    //chech error
    if (error) {
      res.status(401).json({
        status: false,
        message: "JSON web Token Decoding failed....",
      });
    }

    //check user exist or not in database
    User.findById(decoded.id, {
      password: 0,
      createdAt: 0,
      updatedAt: 0,
      profile_pic: 0,
    })
      .then((user) => {
        if (!user) {
          res.status(404).json({
            status: false,
            message: "user not exist ...",
          });
        }

        //set user object in req object
        req.user = {
          id: user._id,
          email: user.email,
          username: user.username,
        };

        return next();
      })
      .catch((error) => {
        res.status(502).json({
          status: false,
          message: "DB error ...",
        });
      });
  });
}

module.exports = verifyToken;
