const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});
const userSchema = new mongoose.Schema({
        username: {
                type: String,
                required: true
        },
        log: [{
                description: {
                        type: String
                },
                duration: {
                        type: Number
                },
                date: {
                        type: Date
                }
        }]
});
const User = mongoose.model('User', userSchema);
let maxDate = new Date(8640000000000000);
let minDate = new Date(-8640000000000000);
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});


app.post("/api/users", (req, res) => {
        if(req.body.username === "") {
                res.json({"error": "username is required"});
        } else {
                const newUser = new User({username: req.body.username, log: []});
                newUser.save((err, data) => {
                        if(err) return console.error(err);
                });
                res.json({username: req.body.username, _id: newUser._id});
        }
});

app.get("/api/users", async (req, res) => {
        try {
                const usersDocs = await User.find().select("-log -__v");
                if(usersDocs !== null) {
                        res.json(usersDocs);
                } else {
                        res.json({error: "No users"});
                }
        } catch {
                res.json({error: "Error getting users"});
        }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
        if(req.params._id === "0") {
                res.json({error: "_id is required"});
        }
        if(req.body.description === "") {
                res.json({error: "description is required"});
        }
        if(req.body.duration === "") {
                res.json({error: "duration is required"});
        }
        console.log(req.body.date);
        const userId = req.params._id;
        const description = req.body.description;
        const duration = parseInt(req.body.duration);
        const date = (req.body.date !== undefined && req.body.date !== "" ? new Date(req.body.date) : new Date());
        console.log(date);

        if(isNaN(duration)) {
                res.json({error: "duration is not a number"});
        }

        if(date === "Invalid Date") {
                res.json({error: "date is invalid"});
        }
        
        User.findByIdAndUpdate(userId, {$push: {log: {description: description, duration: duration, date: date}}}, {new: true}, (err, user) => {
                if(err) return console.log(err);
                if(user) {
                        console.log({username: user.username, description: description, duration: duration, date: date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' }).replace(/,/g, ''), _id: userId});
                        res.json({username: user.username, description: description, duration: duration, _id: userId, date: date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' }).replace(/,/g, '')});
                } else {
                        res.json({error: "user not found"});
                }
        });

});

app.get("/api/users/:_id/logs", async (req, res) => {
        const userId = req.params._id;
        console.log(`${req.query.from} ${req.query.to} ${req.query.limit}`);
        console.log(req.query.limit !== undefined);
        try {
                const userDoc = await User.findById(userId);
                if(userDoc !== null) {
                        let userLog = userDoc.log;
                        if(req.query.from !== undefined && req.query.from !== "") {
                                userLog = userLog.filter(entry => entry.date >= new Date(req.query.from));
                        }
                        if(req.query.to !== undefined && req.query.to !== "") {
                                userLog = userLog.filter(entry => entry.date <= new Date(req.query.to));
                        }
                        if(req.query.limit !== undefined && req.query.limit !== "" && !isNaN(parseInt(req.query.limit))) {
                                userLog = userLog.slice(0, parseInt(req.query.limit));
                        }
                        userLog = userLog.map(entry => ({
                                description: entry.description,
                                duration: entry.duration,
                                date: entry.date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' }).replace(/,/g, '')
                        }));
                        console.log({
                                username: userDoc.username,
                                count: userDoc.log.length,
                                _id: userDoc._id,
                                log: userLog
                        });

                        res.json({
                                username: userDoc.username,
                                count: userDoc.log.length,
                                _id: userDoc._id,
                                log: userLog
                        });
                } else {
                        res.json({error: "User not found"});
                }
        } catch {
                res.json({error: "Error finding user"});
        }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
