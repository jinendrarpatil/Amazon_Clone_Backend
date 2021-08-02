const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const moment = require('moment')
const User = require('../models/User')
const token_key = process.env.TOKEN_KEY
const storage = require('./Storage')
const verifyToken = require("./../middleware/verify_token")

//middleware stup
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

//default routes
//access:public
//url:http://localhost:5000/api/users/
//method:get
router.get('/', (req, res) => {
    return res.status(200).json({ status: true, "message": "user default route" });
});

//user register route
//access:public
//url:http://localhost:5000/api/users/register
//method:post
router.post('/register',
    [ //check empty fields    
        check('username').not().isEmpty().trim().escape(),
        check("password").not().isEmpty().trim().escape(),

        //check email
        check('email').isEmail().normalizeEmail()
    ],
    (req, res) => {
        const errors = validationResult(req);

        // check errors is not empty
        if (!errors.isEmpty()) {
            return (res.status(400).json({
                status: false,
                errors: errors.array(),
                "message": "Form validation error"
            }));
        }

        //check email exist or not
        User.findOne({ email: req.body.email }).then((user) => {
            if (user) {
                return res.status(409).json({
                    "status": false,
                    "message": "User email already exist"
                })
            } else {
                // hash user password
                const salt = bcrypt.genSaltSync(10);
                const hashedPassword = bcrypt.hashSync(req.body.password, salt);

                //create user object from usermodel
                const newUser = new User({
                    username: req.body.username,
                    email: req.body.email,
                    password: hashedPassword
                })
                // insert new user
                newUser.save().then((result) => {
                    return res.status(200).json({
                        "status": true,
                        "user": result
                    })

                }).catch((error) => {
                    return res.status(502).json({
                        "status": false,
                        "error": error
                    });
                });
            }
        }).catch((error) => {
            return res.status(502).json({
                "status": false,
                "error": error
            });
        });

    })


//user profile pic upload route
//access:public
//url:http://localhost:5000/api/users/uploadProfilePic
//method: post
router.post('/uploadProfilePic', (req, res) => {
    let upload = storage.getProfilePicUpload()
    upload(req, res, (error) => {
        console.log(req.file);

        if (error) {
            return res.status(400).json({
                "status": false,
                "error": error,
                "message": "File upload failed..."
            });
        } else {
            return res.status(200).json({
                "status": true,
                "message": "File upload successful"
            });
        }
    })
})

//user login route
//access:public
//http://localhost:500/api/users/login
//method: post

router.post('/login', [
    check('password').not().isEmpty().trim().escape(),
    check('email').isEmail().normalizeEmail()
],
    (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                "status": false,
                "errors": errors.array(),
                "message": "Form validation error"
            })
        }

        User.findOne({ email: req.body.email })
            .then((user) => {
                if (!user) {
                    return res.status(404).json({
                        status: false,
                        "message": "User does'nt exist"
                    })
                } else {
                    //match user password
                    let isPasswordMatch = bcrypt.compareSync(req.body.password, user.password)

                    //check if password doesnot match
                    console.log(isPasswordMatch);
                    if (!isPasswordMatch) {
                        return res.status(401).json({
                            status: false,
                            "message": "Password does'nt match"
                        })
                    }


                    //json web token generation
                    let token = jwt.sign(
                        {
                            id: user._id,
                            email: user.email
                        },
                        token_key,
                        {
                            expiresIn: 3600
                        }
                    )

                    //if password matches 
                    return res.status(200).json({
                        "status": true,
                        "message": "User Login Success",
                        "token": token,
                        "user": user
                    })
                }
            })
            .catch((error) => {
                return res.status(502).json({
                    status: false,
                    "message": "Database error..."
                })
            })
    })

// router.get('/testJWT', verifyToken, (req, res) => {
//     console.log(req.user)
//     return res.status(200).json({
//         status: true,
//         "message": "JSON web token working..."
//     })
// })

module.exports = router;