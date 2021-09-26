// include library
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const fs = require("fs");

const User = require("./../models/User");
const token_key = process.env.TOKEN_KEY;

const verifyToken = require("./../middleware/verify_token");

const storage = require("./storage");

// middleware setup
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// default route
// Access: public
// url: http://localhost:500/api/users/
// method: GET
router.get("/", (req, res) => {
  return res.status(200).json({
    status: true,
    message: "User default route.",
  });
});

router.post(
  "/register",
  //body input fields not empty
  [
    body("username").not().isEmpty().trim().escape(),
    body("email").isEmail().normalizeEmail(),
    body("password").not().isEmpty().trim().escape(),
    body("password2").not().isEmpty().trim().escape(),
  ],
  (req, res) => {
    const { username, email, password, password2 } = req.body;

    const errors = validationResult(req);
    //if error exists as an empty input fields.
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        errors: errors.array(),
      });
    }
    // if no error
    else {
      //body if email i.e user already exists
      return User.findOne({ email })
        .then((user) => {
          if (user) {
            return res.status(409).json({
              status: false,
              Message: "User already exist",
            });
          }
          //body password and confirmpassword are same
          else if (password !== password2) {
            return res.status(400).json({
              status: false,
              Message: "Password not matching, retry",
            });
          }
          //if everything is ok, register new user

          // hash user password
          else {
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(password, salt);
            const hashedpassword2 = bcrypt.hashSync(password2, salt);

            // create user object from user model
            const newUser = new User({
              username,
              email,
              password: hashedPassword,
              password2: hashedpassword2,
            });

            // insert new user
            newUser
              .save()
              .then((result) => {
                res.status(200).json({
                  status: true,
                  Message: "User SuccessFully Registerd",
                  user: result,
                });
              })
              .catch((err) => {
                res.status(502).json({
                  status: false,
                  Message: "User Registeration failed",
                  err: err,
                });
              });
          }
        })
        .catch((error) => {
          res.status(502).json({
            status: false,
            error: error,
          });
        });
    }
  }
);

// user profile pic upload route
// Access: private
// url: http://localhost:500/api/users/uploadProfilePic
// method: POST
router.post("/uploadProfilePic", verifyToken, (req, res) => {
  let upload = storage.getProfilePicUpload();

  upload(req, res, (error) => {
    // If profile pic upload has errors
    if (error) {
      return res.status(400).json({
        status: false,
        error: {
          profile_pic: "validation.profile_pic_error",
        },
        message: "File upload fail...",
      });
    }

    // if profile pic not uploaded
    if (!req.file) {
      return res.status(400).json({
        status: false,
        error: {
          profile_pic: "validation.profile_pic_empty",
        },
        message: "Please upload profile pic...",
      });
    }

    let temp = {
      profile_pic: req.file.filename,
      updatedAt:
        moment().format("DD/MM/YYYY") + ";" + moment().format("hh:mm:ss"),
    };

    // store new profile pic name to user document
    User.findOneAndUpdate({ _id: req.user.id }, { $set: temp })
      .then((user) => {
        if (user.profile_pic != "empty-avatar.jpg") {
          // remove old image
          fs.unlinkSync("./public/profile_pic/" + user.profile_pic);
        }

        return res.status(200).json({
          status: true,
          message: "File upload success",
          user: {
            username: user.username,
            email: user.email,
            id: user._id,
            profile_pic: req.file.filename,
          },
        });
      })
      .catch((error) => {
        return res.status(502).json({
          status: false,
          error: {
            db_error: "validation.db_error",
          },
          message: "Database error...",
        });
      });
  });
});

// user login route
// Access: public
// url: http://localhost:500/api/users/login
// method: POST
router.post(
  "/login",
  [
    // body empty fields
    body("password")
      .not()
      .isEmpty()
      .withMessage("validation.password_empty")
      .trim()
      .escape(),

    // body email
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("validation.invalid_email"),
  ],
  (req, res) => {
    const errors = validationResult(req);

    // body errors is not empty
    if (!errors.isEmpty()) {
      let error = {};

      for (index = 0; index < errors.array().length; index++) {
        error = {
          ...error,
          [errors.array()[index].param]: errors.array()[index].msg,
        };
      }

      return res.status(400).json({
        status: false,
        error: error,
        message: "Form validation error...",
      });
    }

    User.findOne({ email: req.body.email })
      .then((user) => {
        // if user dont exist
        if (!user) {
          return res.status(404).json({
            status: false,
            error: {
              email: "validation.email_not_exists",
            },
            message: "User don't exists",
          });
        } else {
          // match user password
          let isPasswordMatch = bcrypt.compareSync(
            req.body.password,
            user.password
          );

          // body is not password match
          if (!isPasswordMatch) {
            return res.status(401).json({
              status: false,
              error: {
                password: "validation.password_not_match",
              },
              message: "Password don't match...",
            });
          }

          // JSON Web Token Generate
          let token = jwt.sign(
            {
              id: user._id,
              email: user.email,
            },
            token_key,
            {
              expiresIn: 3600,
            }
          );

          // if login success
          return res.status(200).json({
            status: true,
            message: "User login success",
            token: token,
            user: {
              email: user.email,
              username: user.username,
              profile_pic: user.profile_pic,
              id: user._id,
            },
          });
        }
      })
      .catch((error) => {
        return res.status(502).json({
          status: false,
          error: {
            db_error: "validation.db_error",
          },
          message: "Database error...",
        });
      });
  }
);

// user change password route
// Access: private
// url: http://localhost:500/api/users/change_password
// method: PUT
router.put(
  "/change_password",
  verifyToken,
  [
    // body empty fields
    body("username")
      .not()
      .isEmpty()
      .withMessage("validation.username_empty")
      .trim()
      .escape(),
    body("newPassword")
      .not()
      .isEmpty()
      .withMessage("validation.password_empty")
      .trim()
      .escape(),
    body("newPassword2")
      .not()
      .isEmpty()
      .withMessage("validation.password2_empty")
      .trim()
      .escape(),
    body("oldPassword")
      .not()
      .isEmpty()
      .withMessage("validation.password_empty")
      .trim()
      .escape(),
  ],
  (req, res) => {
    const errors = validationResult(req);

    // body errors is not empty
    if (!errors.isEmpty()) {
      let error = {};

      for (index = 0; index < errors.array().length; index++) {
        error = {
          ...error,
          [errors.array()[index].param]: errors.array()[index].msg,
        };
      }
      return res.status(400).json({
        status: false,
        error: error,
        message: "Form validation error...",
      });
    }

    // body password = retype passsword
    if (req.body.newPassword != req.body.newPassword2) {
      return res.status(400).json({
        status: false,
        error: {
          newPassword2: "validation.password2_not_same",
        },
        message: "Form validation error...",
      });
    }

    // body email already exists or not
    User.findOne({ _id: req.user.id })
      .then((user) => {
        // body old password match with password in database
        const isMatch = bcrypt.compareSync(req.body.oldPassword, user.password);

        if (!isMatch) {
          return res.status(400).json({
            status: false,
            error: {
              oldPassword: "validation.oldPassword_not_match",
            },
            message: "Old password not match in database.",
          });
        }

        // hash new password
        const salt = bcrypt.genSaltSync(10);
        const hashedPasssword = bcrypt.hashSync(req.body.newPassword, salt);

        // update new password
        const newData = {
          username: req.body.username,
          password: hashedPasssword,
          updatedAt:
            moment().format("DD/MM/YYYY") + ";" + moment().format("hh:mm:ss"),
        };

        User.findOneAndUpdate(
          { _id: req.user.id },
          { $set: newData },
          { new: true }
        )
          .then((user) => {
            return res.status(200).json({
              status: true,
              user: {
                username: user.username,
                email: user.email,
                profile_pic: user.profile_pic,
                id: user._id,
              },
            });
          })
          .catch((error) => {
            return res.status(502).json({
              status: false,
              error: {
                db_error: "validation.db_error",
              },
            });
          });
      })
      .catch((error) => {
        return res.status(502).json({
          status: false,
          error: {
            db_error: "validation.db_error",
          },
        });
      });
  }
);

module.exports = router;
