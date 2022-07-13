// Importing all required node modules
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const ejs = require("ejs");
const { body, validationResult } = require("express-validator");
const e = require("express");
const db_config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'librarymanagement'
};
const validateLoginConfig = [ body('libid').trim().isLength({min: 4}).withMessage("Enter a valid Lib-Id").isNumeric().withMessage("Enter a valid Lib-Id") ];
const validateSignUpConfig = [  body('fname').trim().escape().isLength({min:3}).withMessage('Enter a valid first name').isAlpha().withMessage('Enter a valid first name'),
                                body('lname').trim().escape().isLength({min:0}).withMessage('Enter a valid last name').isAlpha().withMessage('Enter a valid last name'),
                                body('email').trim().escape().toLowerCase().isEmail().withMessage('Enter a valid email').normalizeEmail({gmail_remove_dots: false}),
                                body('pass').trim().escape().isLength({min:5}).withMessage("Password must be atleast 6 characters").matches('[0-9]').withMessage("Password must contain a number").matches('[A-Z]').withMessage("Password must contain atleast a uppercase letter").matches('[a-z]').withMessage("Password must contain atleast a lowercase letter"),
                                body('roll').trim().escape().isLength({min:10, max:10}).withMessage("Enter a valid roll no."),
                                body('uniqueNum').trim().escape().isNumeric().withMessage('Enter a valid unique number').isLength({min: 14, max: 14}).withMessage('Enter a valid unique number') 
                            ];
const validateSearchConfig = [body('searchBar').trim().escape().toLowerCase()];   
const defSearch = [{ 'name': '12 Rule to Learn to Code', 'author': 'Angele Yu', 'year': '2020', 'genre': 'education', 'price': '378.12', 'isbn': '9798671342703', 'noOfCopies': 1 }];
const defSearchConfig = [ {'searchTag': 'Search By:', 'searchBarText': ''} ];                     


// Setting the express environment
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));


// Function to create a temporary connection to MySql DB 
function sconnect(){
    return new Promise(function(resolve, reject){
        const connection = mysql.createConnection(db_config);
        connection.connect(function(errc){
            if(errc){
                return reject(errc);
            }
        });
        resolve(connection);
    });
}

// Function to get pass from DB
function exeLogin(id, connection){
    return new Promise(function (resolve, reject){
        const lQuery = "SELECT pass FROM librarymanagement.libusers WHERE libid = ?";
        connection.query(lQuery, [ id ], function(err1, rows){
            if(err1){
                return reject(err1);
            }
            resolve(rows);     
        });
    });
} 

// Function to check if the entered password matches
function hashCheck(p, h){
    return new Promise(function (resolve, reject){
        const temp = bcrypt.compareSync(p, h);
        if (!temp){
            return reject(false);
        }
        resolve(true);
    });
}

// Getting new Lib-id 
function newLibId(connection){
    return new Promise(function(resolve, reject){
        const libIdQuery = "SELECT newlibid FROM librarymanagement.libcalc WHERE id = 1";
        const upLibId = "UPDATE librarymanagement.libcalc SET newlibid = ? WHERE id = 1";
        connection.query(libIdQuery, function(errL, rows){
            if(errL){
                return reject(errL);
            }
            connection.query(upLibId, rows[0]['newlibid']+1, function(errU, _r){
                if(errU){
                    return reject(errU);
                }
                resolve(rows)
            });
        });
    });
}

// Function to insert all data into DB after sigup
function signupInsert(dataArr, connection){
    return new Promise(function (resolve, reject) {
        console.log(dataArr);
        const insertQuery = "INSERT INTO librarymanagement.libusers (userType, firstName, lastName, email, dob, roll, dept, pass, uniqueNum, created, libid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const newUserTableQuery = "CREATE TABLE "+ " (Uid int(4) PRIMARY KEY AUTO_INCREMENT, isbn varchar(14) NOT NULL, dateBorrowed DATE , dateReturned DATE)"
        connection.query(insertQuery, dataArr, function(errMy){
            if(errMy){
                return reject(errMy);
            }
            connection.query(newUserTableQuery, function (errN) { 
                if (errN) { 
                    return reject(errN);
                }
                console.log(newUserTableQuery);
                resolve("Success");
            });
        });
    });
}

// Function to get the search results from DB
function searchDB(searchValue, searchFactor, connection) {
    return new Promise(function (resolve, reject) {
        var query = "";
        if (searchFactor == "Book Name" || searchFactor == "Search By:") {
            query = "SELECT * FROM librarymanagement.books WHERE name LIKE ?";
        }
        else if (searchFactor == "Author Name") {
            query = "SELECT * FROM librarymanagement.books WHERE author LIKE ?";
        } else if (searchFactor == "ISBN") { 
            query = "SELECT * FROM librarymanagement.books WHERE isbn LIKE ?";
        } else {
            query = "SELECT * FROM librarymanagement.books WHERE genre LIKE ?";
        }
        if (searchValue == '*') { 
            query = "SELECT * FROM librarymanagement.books";
        }
        connection.query(query, [searchValue+"%"], function (errSQ, rows) { 
            if (errSQ) { 
                return reject(errSQ);
            }
            resolve(rows);
        });
     });
 }

//Function to update the no of copies of borrowed books
function updateCopies(books, connection) {
    return new Promise(function (resolve, reject) { 
        const updateQuery = "UPDATE librarymanagement.books SET noOfCopies = noOfCopies - 1 WHERE isbn = ? and noOfCopies > 0";
        for (let isbn in books) { 
            connection.query(updateQuery, [i], function (err, rows) {
                if (err) { 
                    return reject(err);
                }
                resolve("Success");
            });
        }
    });
}


// Sending the homepage on get request  
app.get("/home", function(_req, res){
    res.render('index', {lUserErr: '', lPassErr: '', fname: '', lname: '', email: '', pass: '', roll: '', uniqueNum: ''});
});

// Validating and processing the login form
app.post("/home", validateLoginConfig, function(req, res){
    var bpErr = {'libErr': '', 'passErr': ''};
    var sErr = {'fname': '', 'lname': '', 'email': '', 'pass': '', 'roll': '', 'uniqueNum': ''};
    if(Object.keys(validationResult(req)['errors']).length != 0){
        bpErr['libErr'] = validationResult(req)['errors'][0]['msg'];
        res.render('index', {lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr'], fname: sErr['fname'], lname: sErr['lname'], email: sErr['email'], pass: sErr['pass'], roll: sErr['roll'], uniqueNum: sErr['uniqueNum']});
    }
    else{
        sconnect().then(function(resc){
            exeLogin(req.body.libid, resc).then(function(rows){
                if(rows.length == 0){
                    bpErr['passErr'] = "Lib-Id or Password mismatch";
                    res.render('index', {lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr'], fname: sErr['fname'], lname: sErr['lname'], email: sErr['email'], pass: sErr['pass'], roll: sErr['roll'], uniqueNum: sErr['uniqueNum']});
                }else{
                    hashCheck(req.body.lpass, rows[0]['pass']).then(function(_resh){
                        res.sendFile(__dirname + "/student.html");
                    }).catch(_errh => {
                        bpErr['passErr'] = "Lib-Id or Password mismatch";
                        res.render('index', {lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr'], fname: sErr['fname'], lname: sErr['lname'], email: sErr['email'], pass: sErr['pass'], roll: sErr['roll'], uniqueNum: sErr['uniqueNum']});
                    }); 
                }
             }).catch(err3 => console.log(err3));
        }).catch(_errc1 => console.log("Could not establish a connection"));
    }
});

// Validating and processing the signup form 
app.post( "/newUserSignUp", validateSignUpConfig, function(req, res){
    var sErr = {'fname': '', 'lname': '', 'email': '', 'pass': '', 'roll': '', 'uniqueNum': ''};
    var bpErr = {'libErr': '', 'passErr': ''};

    if(Object.keys(validationResult(req)['errors']).length == 0){
        var userData = Object.values(req.body);
        const date = new Date();
        const dobTemp = new Date(userData[userData.length-2]);
        const salt = bcrypt.genSaltSync(10);
        const hpass = bcrypt.hashSync(userData[4], salt);
        userData[4] = hpass;
        userData[userData.length-1] = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(); 
        userData[userData.length-2] = dobTemp.getFullYear() + "-" + (dobTemp.getMonth()+1) + "-" + dobTemp.getDate();
    
        sconnect().then(function(resS){
            newLibId(resS).then(function(nLibId){
                userData.push(nLibId[0]['newlibid']);
                signupInsert(userData, resS).then(function(_statusI){
                    res.render('student', { searchData: defSearch, searchConfig: defSearchConfig });
                }).catch(errI => console.log(errI));
            }).catch(errL => console.log(errL));
        }).catch(errS => console.log(errS));
    }else{
        const valErr = validationResult(req)['errors'];
        for(let errIter in valErr){
            switch(valErr[errIter]['param']){
                case 'fname':
                    sErr['fname'] = valErr[errIter]['msg'];
                    break;
                case 'lname':
                    sErr['lname'] = valErr[errIter]['msg'];
                    break;
                case 'email':
                    sErr['email'] = valErr[errIter]['msg'];
                    break;
                case 'roll':
                    sErr['roll'] = valErr[errIter]['msg'];
                    break;
                case 'pass':
                    sErr['pass'] = valErr[errIter]['msg'];
                    break;
                case 'uniqueNum':
                    sErr['uniqueNum'] = valErr[errIter]['msg'];
                    break;
            }
        }
        res.render('index', {lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr'], fname: sErr['fname'], lname: sErr['lname'], email: sErr['email'], pass: sErr['pass'], roll: sErr['roll'], uniqueNum: sErr['uniqueNum']});
    }
});


// Sending the student page on get request
app.get("/student", function (_req, res) { 
    res.render("student", {searchData: defSearch, searchConfig: defSearchConfig} );
});

// Processing the search from student page to server and back
app.post("/student", validateSearchConfig, function (req, res){
    
    sconnect().then(function (resQ) {
        searchDB(req.body.searchBar, req.body.searchFactor, resQ).then(function (searchResults) {
            const searchConfig = [{ 'searchTag': req.body.searchFactor, 'searchBarText': req.body.searchBar, 'noOfSearchResults': Object.keys(searchResults).length}];
            res.render('student', {searchData: searchResults,  searchConfig: searchConfig} );
        }).catch(errDB => console.log(errDB));
    }).catch(errCBD => console.log(errCBD));
    
 });

//Selecting and update the no of copies
app.post("/confirmBooks", function (req, res){
    const booksArray = req.body['booksSelected'].split(" ");
    res.send(booksArray);
    // res.render('confirmPage');

    // sconnect().then(function (resL) {
    //     updateCopies(booksArray, resL).then(function (msg) { 
            
    //     })

    // }).catch(errU1 => console.log(errU1));
});

// Listening to port 3000
app.listen(3000, function(){
    console.log("Server is up and running in port 3000!");
});