// Importing all required node modules
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const cookieParser = require("cookie-parser");
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

//Default values for all configuration
const defSearch = [{ 'name': '12 Rule to Learn to Code', 'author': 'Angele Yu', 'year': '2020', 'genre': 'education', 'price': '378.12', 'isbn': '9798671342703', 'noOfCopies': 1 }];
const defSearchConfig = [{ 'searchTag': 'Search By:', 'searchBarText': '' }];
var defPrevBooksData = {};
var defCurrBorrowedBooks = {};  
var defPendingBooks = {};                   

// Setting the express environment
const app = express();
app.use(cookieParser());
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
        const lQuery = "SELECT libid, pass, userType FROM librarymanagement.libusers WHERE libid = ?";
        connection.query(lQuery, [ id ], function(err1, rows){
            if(err1){
                return reject(err1);
            }
            resolve(rows);     
        });
    });
} 

// Getting new Lib-id 
function newLibId(connection){
    return new Promise(function(resolve, reject){
        const libIdQuery = "SELECT newlibid FROM librarymanagement.libcalc WHERE id = 1";
        const upLibId = "UPDATE librarymanagement.libcalc SET newlibid = newlibid + 1 WHERE id = 1";

        connection.query(libIdQuery, function(errL, rows){
            if (errL) {
                
                return reject(errL);
            }
            connection.query(upLibId, function(errU){
                if(errU){
                    return reject(errU);
                }
                resolve(rows);
            });
        });
    });
}

// Function to insert all data into DB after sigup
function signupInsert(dataArr, connection){
    return new Promise(function (resolve, reject) {
        const insertQuery = "INSERT INTO librarymanagement.libusers (userType, firstName, lastName, email, pass, roll, dept, uniqueNum, dob, created, libid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        connection.query(insertQuery, dataArr, function(errMy){
            if(errMy){
                return reject(errMy);
            }
            resolve("Success");
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
function updateCopies(isbnArr, connection) {
    return new Promise(function (resolve, reject) { 
        var updateQuery = "UPDATE librarymanagement.books SET noOfCopies = noOfCopies - 1 WHERE noOfCopies > 0 AND ( ";
        for (let i in isbnArr) { 
            updateQuery += "isbn = " + isbnArr[i] + " OR "; 
        }
        updateQuery = updateQuery.substring(0, updateQuery.length - 4) + ")";
        connection.query(updateQuery, [isbnArr], function (errU, result) { 
            if (errU) { 
                return reject(errU);
            }
            resolve("Success");
        });
    });
}

//Function to get previously borrowed books of the logged in user
function getPreviousBooks(id, connection){ 
    return new Promise(function (resolve, reject) { 
        const prevBooksQuery = "SELECT * FROM librarymanagement.booktransaction WHERE libid = ? AND dateReturned IS NOT NULL";
        connection.query(prevBooksQuery,[ id ], function (errP, prevBooks) { 
            if (errP) { 
                return reject(errP);
            }
            resolve(prevBooks);
        });
    });
}

//Function to get the data of book based in isbn
function getBookDetails(isbns, connection) { 
    return new Promise(function (resolve, reject) {
        if (isbns.length == 0) { 
            resolve("NIL");
        }
        var bookDataQuery = "SELECT isbn, name, author, year, genre, price, isbn FROM librarymanagement.books WHERE ";
        const isbnArr = isbns.toString().split(" ");
        for (let isbn in isbnArr) { 
            bookDataQuery += "isbn = " + isbnArr[isbn] + " OR ";
        }
        bookDataQuery =  bookDataQuery.substring(0, bookDataQuery.length - 4);
        connection.query(bookDataQuery, function (errPBD, bookDetails) { 
            if (errPBD) { 
                return reject(errPBD);
            }
            resolve(bookDetails);
        });
    });
}

//Function to get all the pending books of all users
function getPendingBooks(connection) {
    return new Promise(function (resolve, reject) { 
        let pendingBooksQuery = "SELECT * FROM librarymanagement.booktransaction WHERE dateReturned IS NULL";
        connection.query(pendingBooksQuery, function (err1, pendingBooks) {
            if (err1) {
                return reject(err1);
            } 
            var isbnArr = [];
            var libidArr = [];
            var finalPendingBooksData = {};
            for (let i in pendingBooks) {
                pendingBooks[i]['dateBorrowed'] = new Date(pendingBooks[i]['dateBorrowed']).toDateString();
                isbnArr.push(pendingBooks[i]['isbn']);
                libidArr.push(pendingBooks[i]['libid']);
                finalPendingBooksData[pendingBooks[i]['isbn']] = pendingBooks[i];
            }
            getBookDetails(isbnArr, connection).then(function (bookData) {
                for (let i in bookData) {
                    finalPendingBooksData[bookData[i]['isbn']]['name'] = bookData[i]['name'];
                    finalPendingBooksData[bookData[i]['isbn']]['author'] = bookData[i]['author'];
                    finalPendingBooksData[bookData[i]['isbn']]['year'] = bookData[i]['year'];
                    finalPendingBooksData[bookData[i]['isbn']]['genre'] = bookData[i]['genre'];
                    finalPendingBooksData[bookData[i]['isbn']]['price'] = bookData[i]['price'];
                }
                getUserDetails(libidArr, connection).then(function (userData) {
                    var finalUserData = {};
                    for (let i in userData) {
                        finalUserData[userData[i]['libid']] = userData[i];
                    }
                    for (let isbn in finalPendingBooksData) {
                        finalPendingBooksData[isbn]['stuName'] = finalUserData[finalPendingBooksData[isbn]['libid']]['firstName'];
                        finalPendingBooksData[isbn]['uniqueNum'] = finalUserData[finalPendingBooksData[isbn]['libid']]['uniqueNum'];
                    }
                    resolve(finalPendingBooksData);
                }).catch(errU => console.log(errU));
            }).catch(errB => console.log(errB));  
        });
    });
}

//Function to get details about student users
function getUserDetails(libids, connection) { 
    return new Promise(function (resolve, reject) {
        if (libids.length == 0) {
            resolve("NIL");
        }
        var userDataQuery = "SELECT libid, firstName, uniqueNum FROM librarymanagement.libusers WHERE ";
        const libidArr = libids.toString().split(" ");
        for (let id in libidArr) {
            userDataQuery += "libid = " + libidArr[id] + " OR ";
        }
        userDataQuery = userDataQuery.substring(0, userDataQuery.length - 4);
        connection.query(userDataQuery, function (errPBD, userData) {
            if (errPBD) {
                return reject(errPBD);
            }
            resolve(userData);
        });
    });
}

//Function the get the currently borrowed books of the user
function getCurrBooksData(libid, connection) { 
    return new Promise(function (resolve, reject) { 
        const currBookDataQuery = "SELECT * FROM librarymanagement.booktransaction WHERE libid = ? AND dateReturned IS NULL";
        connection.query(currBookDataQuery, [libid], function (err, bookData) { 
            if (err) { 
                return reject(err);
            }
            resolve(bookData);
        });
    });
}

//Function to get the previously borrowed books of the user
function getPrevBooksData(libid) { 
    return new Promise(function (resolve, reject) { 
        sconnect().then(function (resS) { 
            getPreviousBooks(libid, resS).then(function (prevData) { 
                if (prevData.length != 0) {
                    var isbns = "";
                    for (let i in prevData) {
                        isbns += prevData[i]['isbn'] + " ";
                    }

                    getBookDetails(isbns.trim(), resS).then(function (bookData) {
                        var finalPrevData = {};
                        for (let i in bookData) {
                            finalPrevData[bookData[i]['isbn']] = bookData[i];
                        }
                        for (let i in prevData) {
                            finalPrevData[prevData[i]['isbn']]['fine'] = prevData[i]['fine'] == null ? 0 : prevData[i]['fine'];
                            finalPrevData[prevData[i]['isbn']]['dateBorrowed'] = (new Date(prevData[i]['dateBorrowed'])).toDateString();
                            finalPrevData[prevData[i]['isbn']]['dateReturned'] = (new Date(prevData[i]['dateReturned'])).toDateString();
                        }
                        resolve(finalPrevData);
                    }).catch(err => { return reject(err); });
                } else { 
                    resolve("NIL");
                }
            }).catch(err1 => { return reject(err1); });
        }).catch(err => { return reject(err); });
    });
}

//Function to get the currently borrowed books of the user
function getCurrentBooksData(libid) {
    return new Promise(function (resolve, reject) {
        sconnect().then(function (resS) {
            getCurrBooksData(libid, resS).then(function (currData) {
                if (currData.length != 0) {
                    var isbns = "";
                    for (let i in currData) {
                        isbns += currData[i]['isbn'] + " ";
                    }
                    getBookDetails(isbns.trim(), resS).then(function (bookData) {
                        var finalCurrentBooksData = {};
                        for (let i in bookData) {
                            finalCurrentBooksData[bookData[i]['isbn']] = bookData[i];
                        }
                        for (let i in currData) {
                            finalCurrentBooksData[currData[i]['isbn']]['dateBorrowed'] = (new Date(currData[i]['dateBorrowed'])).toDateString();
                        }
                        console.log(finalCurrentBooksData);
                        resolve(finalCurrentBooksData);
                    }).catch(err => { return reject(err); });
                } else { 
                    resolve("NIL");
                }

            }).catch(err1 => { return reject(err1); });
        }).catch(err => { return reject(err); });
    });
}


// Sending the loginpage on get request  
app.get("/login", function (req, res) { 
    if (req.cookies['Library User Data']) {
        getPrevBooksData(req.cookies['Library User Data']).then(function (prevBookData) { 
            defPrevBooksData = prevBookData;
            getCurrentBooksData(req.cookies['Library User Data']).then(function (currBookData) { 
                defCurrBorrowedBooks = currBookData;
                res.redirect('dashboard');
            }).catch(err2 => console.log(err2));
            
        }).catch(err => console.log(err));
    } else {
        res.render('login', { lUserErr: '', lPassErr: '' });
    }
});

// Sending the signup page on get request  
app.get("/signUp", function (req, res) {
    if (req.cookies['Library User Data']) {
        getPrevBooksData(req.cookies['Library User Data']).then(function (prevBookData) {
            defPrevBooksData = prevBookData;
            getCurrentBooksData(req.cookies['Library User Data']).then(function (currBookData) {
                defCurrBorrowedBooks = currBookData;
                res.redirect('dashboard');
            }).catch(err2 => console.log(err2));

        }).catch(err => console.log(err));
    } else {
        res.render('signUp', { fname: '', lname: '', email: '', pass: '', roll: '', uniqueNum: '' });
    }
    
});

//Sending the dashboard page on get requset
app.get("/dashboard", function (req, res) {
    
    if (req.cookies['Library User Data']) {
        getPrevBooksData(req.cookies['Library User Data']).then(function (prevBookData) {
            defPrevBooksData = (prevBookData != "NIL") ? prevBookData : {};
            getCurrentBooksData(req.cookies['Library User Data']).then(function (currBookData) {
                defCurrBorrowedBooks = (currBookData != "NIL") ? currBookData : {};
                console.log(defCurrBorrowedBooks);
                res.render('dashboard', { searchData: defSearch, searchConfig: defSearchConfig, prevBooksData: defPrevBooksData, currBooksData: defCurrBorrowedBooks });
            }).catch(err2 => console.log(err2));
        }).catch(err => console.log(err));
    } else {
        res.redirect('login');
    }
    
});

// Validating and processing the login form
app.post("/login", validateLoginConfig, function(req, res){
    var bpErr = {'libErr': '', 'passErr': ''};
    if(Object.keys(validationResult(req)['errors']).length != 0){
        bpErr['libErr'] = validationResult(req)['errors'][0]['msg'];
        res.render('login', {lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr']});
    }
    else{
        sconnect().then(function(resc){
            exeLogin(req.body.libid, resc).then(function(rows){
                if(rows.length == 0){
                    bpErr['passErr'] = "Lib-Id or Password mismatch";
                    res.render('login', {lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr']});
                }else{
                    const temp = bcrypt.compareSync(req.body.lpass, rows[0]['pass']);
                    if (!temp) {
                        bpErr['passErr'] = "Lib-Id or Password mismatch";
                        res.render('login', { lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr'] });
                    } else {
                        res.cookie('Library User Data', rows[0]['libid'].toString());
                        if (rows[0]['userType'] == 'Student') {
                            getPrevBooksData(rows[0]['libid']).then(function (prevBookData) {
                            
                                getCurrentBooksData(rows[0]['libid']).then(function (currBookData) {
                                    defPrevBooksData = prevBookData;
                                    defCurrBorrowedBooks = currBookData;
                                    res.redirect('/dashboard');
                                }).catch(err => console.log(err));

                            }).catch(err1 => console.log(err1));
                        } else if (rows[0]['userType'] == 'Staff') {
                            res.redirect('/staff');
                        } else {
                            res.redirect('/admin');
                        }
                    }
                }
             }).catch(err3 => console.log(err3));
        }).catch(_errc1 => console.log("Could not establish a connection"));
    }
});

// Validating and processing the signup form 
app.post( "/signUp", validateSignUpConfig, function(req, res){
    var sErr = { 'fname': '', 'lname': '', 'email': '', 'pass': '', 'roll': '', 'uniqueNum': '' };
    if (Object.keys(validationResult(req)['errors']).length <= 1) {
        var userData = Object.values(req.body);
        const date = new Date();
        const dobTemp = new Date(userData[userData.length - 2]);
        const salt = bcrypt.genSaltSync(10);
        const hpass = bcrypt.hashSync(userData[4], salt);
        userData[4] = hpass;
        userData[userData.length - 1] = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        userData[userData.length - 2] = dobTemp.getFullYear() + "-" + (dobTemp.getMonth() + 1) + "-" + dobTemp.getDate();

        sconnect().then(function (resS) {
            newLibId(resS).then(function (nLibId) {
                userData.push(nLibId[0]['newlibid']);
                signupInsert(userData, resS).then(function (_statusI) {
                    if (validationResult(req)['errors'][0]['param'] == 'roll' && req.body.userType != 'Student') {
                        console.log(typeof (req.body.userType));
                        if (req.body.userType == 'Staff') {
                            res.redirect('staff');
                        } else {
                            res.redirect('admin');
                        }
                    } else {
                        res.redirect('/dashboard');
                    }

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
        res.render('signUp', {fname: sErr['fname'], lname: sErr['lname'], email: sErr['email'], pass: sErr['pass'], roll: sErr['roll'], uniqueNum: sErr['uniqueNum']});
    }
});

// Processing the search from dashboard page to server and back
app.post("/dashboard", validateSearchConfig, function (req, res){
    sconnect().then(function (resQ) {
        searchDB(req.body.searchBar, req.body.searchFactor, resQ).then(function (searchResults) {
            const searchConfig = [{ 'searchTag': req.body.searchFactor, 'searchBarText': req.body.searchBar, 'noOfSearchResults': Object.keys(searchResults).length}];
            res.render('dashboard', { searchData: searchResults, searchConfig: searchConfig, prevBooksData: defPrevBooksData, currBooksData: defCurrBorrowedBooks });
        }).catch(errDB => console.log(errDB));
    }).catch(errCBD => console.log(errCBD));
});

//Selecting and update the no of copies
app.post("/confirmBooks", function (req, res) {
    const booksArray = req.body['booksSelected'].split(" ");
    sconnect().then(function (resS) {
        updateCopies(booksArray, resS).then(function (stat) {
            getBookDetails(req.body['booksSelected'], resS).then(function (bookData) {
                res.render('confirmBooks', { borrowedBookData: bookData });
            }).catch(errT => console.log(errT));
        }).catch(err => console.log(err));
}).catch(errC => console.log(errC));
    
});

//Sending the staff homepage on get request
app.get("/staff", function (req, res) { 
    if (req.cookies['Library User Data']) {
        sconnect().then(function (resS) {
            getPendingBooks(resS).then(function (pendingBooksData) {
                defPendingBooks = pendingBooksData;
                res.render('staff', { pendingBooks: defPendingBooks });
            }).catch(err1 => console.log(err1));
        }).catch(err => console.log(err));
    } else { 
        res.redirect('login');
    }
    
});

//DEMO
app.get("/admin", function (req, res) { 
    res.render('admin');
});

//Logging out the user
app.get("/logout", function (req, res) {
    res.clearCookie('Library User Data');
    res.redirect('login');
});

// Listening to port 3000
app.listen(3000, function(){
    console.log("Server is up and running in port 3000!");
});