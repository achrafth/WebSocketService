var crypto = require('crypto');
var uuid = require('uuid');
var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var multer = require('multer')
var path = require('path');
var fs = require('fs');

//Connect to MySQL
var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'my-app',
    connectionLimit: 10
});

var genRandomString = function (length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') //Convert to hexa format 
        .slice(0, length); //Return required number of characters
};

var sha512 = function (password, salt) {
    var hash = crypto.createHmac('sha512', salt); //Uses SHA512
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
};

function saltHashPassword(userPassword) {
    var salt = genRandomString(16); //GenRandomString with 16 characters to salt
    var passwordData = sha512(userPassword, salt);
    return passwordData;
};

function checkHashPassword(userPassword, salt) {
    var passwordData = sha512(userPassword, salt);
    return passwordData;
};

var app = express();
app.use(bodyParser.json()); //Accepts JSON Params
app.use(bodyParser.urlencoded({
    extended: true
})); //Accepts URL Encoded params

//Register
app.post('/register/', (req, res, next) => {
    var post_data = req.body; //Get POST params
    var uid = uuid.v4(); //Get UUID  V4
    var plaint_password = post_data.password; //Get Password from POST params
    var hash_data = saltHashPassword(plaint_password);
    var password = hash_data.passwordHash; //Get hash value
    var salt = hash_data.salt; //Get salt 
    var firstName = post_data.firstName;
    var lastName = post_data.lastName;
    var phone = post_data.phone;
    var email = post_data.email;
    con.query('SELECT * FROM user WHERE email = ?', [email], function (err, result, fields) {
        con.on('error', function (err) {
            console.log('[MySQL ERROR]');
        });
        if (result && result.length)
            res.json('User already exists!!');
        else {
            con.query('INSERT INTO `user` (`firstName`, `lastName`, `phone`, `email`, `unique_id`, `encrypted_password`, `salt`, `created_at`) VALUES(?, ?, ?, ?, ?, ?, ?, NOW())',
                [firstName, lastName, phone, email, uid, password, salt], function (err, result, fields) {
                    con.on('error', function (err) {
                        console.log('[MySQL ERROR]', err);
                        res.json('Register Error: ', err);

                    });
                    res.json('Register Successful!');
                })
        }
    });
});

//Login
app.post('/login/', (req, res, next) => {
    var post_data = req.body;
    //Extract email and password from request
    var user_password = post_data.password;
    var email = post_data.email;
    con.query('SELECT * FROM user WHERE email = ?', [email], function (err, result, fields) {
        con.on('error', function (err) {
            console.log('[MySQL ERROR]');
        });
        if (result && result.length) {
            var salt = result[0].salt; //Get salt of result if account exists
            var encrypted_password = result[0].encrypted_password;
            //Hash password from Login request with salt in Database
            var hashed_password = checkHashPassword(user_password, salt).passwordHash;
            if (encrypted_password == hashed_password)
                res.json(result);
            else
                res.end(JSON.stringify('Wrong Password!'));
        }
        else {
            res.json('User Not Found!!!');
        }
    });
});

//Delete User
app.delete('/user/delete/:id', (req, res) => {
    con.query('DELETE FROM user WHERE idUser = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            res.send('Deleted Successfully!');
        else
            console.log(err);
    })
});

//Update User
app.put('/user/update/:id', (req, res) => {
    var post_data = req.body;  //Get POST params
    var id = req.params.id;
    var firstName = post_data.firstName;
    var lastName = post_data.lastName;
    var phone = post_data.phone;
    var email = post_data.email;
    con.query('UPDATE `user` SET `firstName` = ?, `lastName` = ?, `phone` = ?, `email` = ? WHERE idUser = ?', [firstName, lastName, phone, email, id], function (err, result, fields) {
        if (err) throw err;
        res.json('User Updated!');
    });
});

//GET list User
app.get('/getUsers/', (req, res, next) => {
    con.query('SELECT * FROM user', function (err, result, fields) {
        con.on('error', function (err) {
            console.log('[MYSQL ERROR]', err);
        });
        if (result && result.length) {
            res.end(JSON.stringify(result));
        }
        else {
            res.end(JSON.stringify("Nothing Was Found!"));
        }
    });
});

//Add Type
app.post('/addType/', (req, res, next) => {
    var post_data = req.body; //Get POST params 
    var nameType = post_data.nameType;
    con.query('SELECT * FROM type WHERE nameType = ?', [nameType], function (err, result, fields) {
        con.on('error', function (err) {
            console.log('[MySQL ERROR]');
        });
        if (result && result.length)
            res.json('Type already exists!!');
        else {
            con.query('INSERT INTO `type` (`nameType`) VALUES(?)',
                [nameType], function (err, result, fields) {
                    con.on('error', function (err) {
                        console.log('[MySQL ERROR]', err);
                        res.json('Add Type Error: ', err);
                    });
                    res.json('Add Type Successful!');
                })
        }
    });
});

//GET list Type
app.get('/getTypes/', (req, res, next) => {
    con.query('SELECT * FROM type', function (err, result, fields) {
        con.on('error', function (err) {
            console.log('[MYSQL ERROR]', err);
        });
        if (result && result.length) {
            res.end(JSON.stringify(result));
        }
        else {
            res.end(JSON.stringify("Nothing Was Found!"));
        }
    });
});

//Delete Type
app.delete('/type/delete/:id', (req, res) => {
    con.query('DELETE FROM type WHERE idType = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            res.send('Deleted Successfully!');
        else
            console.log(err);
    })
});

//Update Type
app.put('/type/update/:id', (req, res) => {
    var post_data = req.body;  //Get POST params
    var idType = req.params.id
    var nameType = post_data.nameType;
    con.query('UPDATE `type` SET `nameType` = ? WHERE idType = ?', [nameType, idType], function (err, result, fields) {
        if (err) throw err;
        res.json('Type Updated!');
    });
});

//Add Event
app.post('/addEvent/', (req, res, next) => {
    var post_data = req.body; //Get POST params
    var name = post_data.name;
    var descr = post_data.descr;
    var dateS = post_data.date;
    var date = new Date(dateS);
    var type = post_data.type;
    var user = post_data.user;
    con.query('SELECT * FROM event WHERE name = ?', [name], function (err, result, fields) {
        con.on('error', function (err) {
            console.log('[MySQL ERROR]');
        });
        if (result && result.length)
            res.json('Event already exists!!');
        else {
            con.query('INSERT INTO `event` (`name`, `descr`, `date`, `type`, `user`) VALUES(?, ?, ?, ?, ?)',
                [name, descr, date, type, user], function (err, result, fields) {
                    con.on('error', function (err) {
                        console.log('[MySQL ERROR]', err);
                        res.json('Add Event Error: ', err);

                    });
                    res.json('Add Event Successful!');
                })
        }
    });
});

//GET list Event
app.get('/getEvents/', (req, res, next) => {
    con.query('SELECT * FROM event', function (err, result, fields) {
        con.on('error', function (err) {
            console.log('[MYSQL ERROR]', err);
        });
        if (result && result.length) {
            res.end(JSON.stringify(result));
        }
        else {
            res.end(JSON.stringify("Nothing Was Found!"));
        }
    });
});

//GET list Event with ID Type
app.get('/type/getEvents/:id', (req, res, next) => {
    con.query('SELECT * FROM event where type = ?', [req.params.id], function (err, result, fields) {
        con.on('error', function (err) {
            console.log('[MYSQL ERROR]', err);
        });
        if (result && result.length) {
            res.end(JSON.stringify(result));
        }
        else {
            res.end(JSON.stringify("Nothing Was Found!"));
        }
    });
});

//GET list Event with ID User
app.get('/user/getEvents/:id', (req, res, next) => {
    con.query('SELECT * FROM event where user = ?', [req.params.id], function (err, result, fields) {
        con.on('error', function (err) {
            console.log('[MYSQL ERROR]', err);
        });
        if (result && result.length) {
            res.end(JSON.stringify(result));
        }
        else {
            res.end(JSON.stringify("Nothing Was Found!"));
        }
    });
});

//Delete Event
app.delete('/event/delete/:id', (req, res) => {
    con.query('DELETE FROM event WHERE idEvent = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            res.send('Deleted Successfully!');
        else
            console.log(err);
    })
});

//Update Event
app.put('/event/update/:id', (req, res) => {
    var post_data = req.body;  //Get POST params
    var id = req.params.id;
    var name = post_data.name;
    var descr = post_data.descr;
    var date = post_data.date;
    var type = post_data.type;
    var user = post_data.user;
    con.query('UPDATE `event` SET `name` = ?, `descr` = ?, `date` = ?, `type` = ?, `user` = ? WHERE idEvent = ?', [name, descr, date, type, user, id], function (err, result, fields) {
        if (err) throw err;
        res.json('Event Updated!');
    });
});

//Upload Pics
var form = "<!DOCTYPE HTML><html><body>" +
    "<form method='post' action='/upload' enctype='multipart/form-data'>" +
    "<input type='file' name='upload'/>" +
    "<input type='submit' /></form>" +
    "</body></html>";
app.get('/', function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(form);

});
//Include the node file module
storage = multer.diskStorage({
    destination: './Uploads/',
    filename: function (req, file, cb) {
        return crypto.pseudoRandomBytes(16, function (err, raw) {
            if (err) {
                return cb(err);
            }
            return cb(null, "" + (raw.toString('hex')) + (path.extname(file.originalname)));
        });
    }
});
//Post files
app.post(
    "/upload",
    multer({
        storage: storage
    }).single('upload'), function (req, res) {
        console.log(req.file);
        console.log(req.body);
        res.redirect("/Uploads/" + req.file.filename);
        console.log(req.file.filename);
        return res.status(200).end();
    });

app.get('/uploads/:upload', function (req, res) {
    file = req.params.upload;
    console.log(req.params.upload);
    var img = fs.readFileSync(__dirname + "/Uploads/" + file);
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(img, 'binary');
});

//Start Server
app.listen(3000, () => {
    console.log('RESTFUL API running on port 3000');
})
//module.exports = con; Export to a file