// Importing all required node modules
require('dotenv').config({
    path: __dirname + "./.env"
});
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const cookieParser = require("cookie-parser");
const db_config = {
    host: process.env.db_host,
    user: process.env.db_user,
    password: process.env.db_pass,
    database: process.env.db,
    port: process.env.db_port
};
const db_config_remote = {
    host: process.env.db_host,
    user: process.env.db_user,
    password: process.env.db_pass,
    database: process.env.db,
    port: process.env.db_port
};
console.log(db_config_remote);
const validateLoginConfig = [ body('libid').trim().isLength({min: 4}).withMessage("Enter a valid Lib-Id").isNumeric().withMessage("Enter a valid Lib-Id") ];
const validateSignUpConfig = [  body('fname').trim().escape().isLength({min:3}).withMessage('Enter a valid first name').isAlpha().withMessage('Enter a valid first name'),
                                body('lname').trim().escape().isLength({min:0}).withMessage('Enter a valid last name').isAlpha().withMessage('Enter a valid last name'),
                                body('email').trim().escape().toLowerCase().isEmail().withMessage('Enter a valid email').normalizeEmail({gmail_remove_dots: false}),
                                body('pass').trim().escape().isLength({min:5}).withMessage("Password must be atleast 6 characters").matches('[0-9]').withMessage("Password must contain a number").matches('[A-Z]').withMessage("Password must contain atleast a uppercase letter").matches('[a-z]').withMessage("Password must contain atleast a lowercase letter"),
                                body('roll').trim().escape().isLength({min:10, max:10}).withMessage("Enter a valid roll no."),
                                body('uniqueNum').trim().escape().isNumeric().withMessage('Enter a valid unique number').isLength({min: 14, max: 14}).withMessage('Enter a valid unique number') 
                            ];
const validateAddNewBookConfig = [  body('bname').trim().escape().isLength({ min: 3 }).withMessage('Enter a valid book name').isAlpha().withMessage('Enter a valid book name'),
                                    body('author').trim().escape().isLength({ min: 3 }).withMessage('Enter a valid author name').isAlpha().withMessage('Enter a valid author name'),
                                    body('genre').trim().escape().isLength({ min: 3 }).withMessage('Enter a valid genre').isAlpha().withMessage('Enter a valid genre'),
                                    body('isbn').trim().escape().isLength({ min: 9, max: 9 }).withMessage("Enter a valid ISBN"),
                                    body('year').trim().escape().isLength({ min: 10, max: 10 }).withMessage("Enter a valid year"),
                                    body('price').trim().escape().isNumeric().withMessage("Enter a valid price"),
                                    body('noOfCopies').trim().escape().isNumeric().withMessage("Enter a valid number"),
                                ];
const validateSearchConfig = [body('searchBar').trim().escape().toLowerCase()];

//Default values for all configuration
const pageOffset = 10;

const defAddBookErrors = [{ "bname": "", "author": "", "year": "", "genre": "", "price": "", "isbn": "", "noOfCopies": ""}];                 
var def_conn_err = [{ "err": "" }];

var defPrevBooksData = {};
var defCurrBorrowedBooks = {};  
var defPendingBooks = {};   
var defYetBorrowedBooks = {};
var defSearchConfig = [{ 'searchTag': 'Search By:', 'noOfSearchResults': 1, 'searchBarText': '' }];


// Setting the express environment
const app = express();
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

//Middleware for no caching
function nocache(req, res, next) { 
    res.header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '-1');
    next();
}


// Function to create a temporary connection to MySql DB 
function sconnect(){
    return new Promise(function(resolve, reject){
        const connection = mysql.createConnection(db_config_remote);
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
        const lQuery = "SELECT libid, pass, userType FROM sql6513149.libusers WHERE libid = ?";
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
        const libIdQuery = "SELECT newlibid FROM sql6513149.libcalc WHERE id = 1";
        const upLibId = "UPDATE sql6513149.libcalc SET newlibid = newlibid + 1 WHERE id = 1";

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
        const insertQuery = "INSERT INTO sql6513149.libusers (userType, firstName, lastName, email, pass, roll, dept, uniqueNum, dob, created, libid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        connection.query(insertQuery, dataArr, function(errMy){
            if(errMy){
                return reject(errMy);
            }
            resolve("Success");
        });
    });
}

// Function to get the search results from DB
function searchDB(searchValue, searchFactor, page) {
    return new Promise(function (resolve, reject) {
        var query = "SELECT search.row_count, name, author, publication_date, genre, price, noOfCopies, isbn FROM sql6513149.books, (SELECT COUNT(*) as row_count FROM sql6513149.books WHERE _searchFactor LIKE '_searchValue%') as search HAVING _searchFactor LIKE '_searchValue%' ORDER BY id LIMIT " + ((page - 1) * pageOffset) + ", " + pageOffset;
        
        if (searchFactor == "Book Name" || searchFactor == "Search By:") {
            query = query.replace(/_searchFactor/g, "name");
        }
        else if (searchFactor == "Author Name") {
            query = query.replace(/_searchFactor/g, "author");
        } else if (searchFactor == "ISBN") { 
            query = query.replace(/_searchFactor/g, "isbn");
        } else {
            query = query.replace(/_searchFactor/g, "genre");
        }
        if (searchValue == '*') { 
            query = query.replace(/_searchFactor/g, "name");
            searchValue = "";
        }

        query = query.replace(/_searchValue/g, searchValue);

        sconnect().then(function (connection) { 
            connection.query(query, [searchValue+"%"], function (errSQ, rows) { 
                if (errSQ) { 
                    return reject(errSQ);
                }
                resolve(rows);
            });
        }).catch(err => console.log(err));
     });
 }

//Function to update the no of copies of borrowed books
function updateCopies(isbnArr, inc) {
    return new Promise(function (resolve, reject) {
        sconnect().then(function (connection) { 
            var updateQuery = "";
            if (inc == 1) {
                updateQuery = "UPDATE sql6513149.books SET noOfCopies = noOfCopies + 1 WHERE (";
            } else {
                updateQuery = "UPDATE sql6513149.books SET noOfCopies = noOfCopies - 1 WHERE noOfCopies > 0 AND ( ";
            }
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
        }).catch(err2 => console.log(err2));
        
    });
}

//Function to get previously borrowed books of the logged in user
function getPreviousBooks(id, connection, page){ 
    return new Promise(function (resolve, reject) { 
        const prevBooksQuery = "SELECT search.row_count, libid, isbn, status, staffName, dateBorrowed, dateReturned, fine FROM sql6513149.booktransaction, (SELECT COUNT(*) as row_count FROM sql6513149.booktransaction WHERE libid = ? AND dateReturned IS NOT NULL) as search HAVING libid = ? AND dateReturned IS NOT NULL ORDER BY id LIMIT " + ((page - 1) * pageOffset) + ", " + pageOffset;
        connection.query(prevBooksQuery,[ Number(id), Number(id) ], function (errP, prevBooks) { 
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
        var bookDataQuery = "SELECT isbn, name, author, publication_date, genre, price, isbn FROM sql6513149.books WHERE ";
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
function getPendingBooks(status, connection, page) {
    return new Promise(function (resolve, reject) { 
        let pendingBooksQuery = "SELECT search.row_count, id, libid, isbn, status, staffName, dateBorrowed, dateReturned, fine FROM sql6513149.booktransaction, (SELECT COUNT(*) as row_count FROM sql6513149.booktransaction WHERE status = ? AND dateReturned IS NULL) as search HAVING status = ? AND dateReturned IS NULL ORDER BY id LIMIT " + ((page - 1) * pageOffset) + ", " + pageOffset; 
        connection.query(pendingBooksQuery, [Number(status), Number(status)], function (err1, pendingBooks) {
            if (err1) {
                return reject(err1);
            }
            if (pendingBooks.length != 0) {
                var isbnArr = [];
                var libidArr = [];
                var finalPendingBooksData = {};
                for (let i in pendingBooks) {
                    pendingBooks[i]['dateBorrowed'] = new Date(pendingBooks[i]['dateBorrowed']).toDateString();
                    isbnArr.push(pendingBooks[i]['isbn']);
                    libidArr.push(pendingBooks[i]['libid']);
                    finalPendingBooksData[i] = pendingBooks[i];
                }

                getBookDetails(isbnArr.join(" "), connection).then(function (bookData) {
                    var newBookData = {};
                    for (let i in bookData) {
                        newBookData[bookData[i]['isbn']] = bookData[i];
                    }

                    getUserDetails(libidArr.join(" "), connection).then(function (userData) {
                        var finalUserData = {};
                        for (let i in userData) {
                            finalUserData[userData[i]['libid']] = userData[i];
                        }
                        for (let i in finalPendingBooksData) {
                            
                            finalPendingBooksData[i]['name'] = newBookData[finalPendingBooksData[i]['isbn']]['name'];
                            finalPendingBooksData[i]['author'] = newBookData[finalPendingBooksData[i]['isbn']]['author'];
                            finalPendingBooksData[i]['publication_date'] = newBookData[finalPendingBooksData[i]['isbn']]['publication_date'];
                            finalPendingBooksData[i]['genre'] = newBookData[finalPendingBooksData[i]['isbn']]['genre'];
                            finalPendingBooksData[i]['price'] = newBookData[finalPendingBooksData[i]['isbn']]['price'];
                        
                            finalPendingBooksData[i]['stuName'] = finalUserData[finalPendingBooksData[i]['libid']]['firstName'];
                            finalPendingBooksData[i]['uniqueNum'] = finalUserData[finalPendingBooksData[i]['libid']]['uniqueNum'];
                        }
                        resolve([finalPendingBooksData, pendingBooks[0]['row_count']]);
                    }).catch(errU => console.log(errU));
                }).catch(errB => console.log(errB));
            } else { 
                resolve("NIL");
            }
        });
    });
}

//Function to get details about student users
function getUserDetails(libids, connection) { 
    return new Promise(function (resolve, reject) {
        if (libids.length == 0) {
            resolve("NIL");
        }
        var userDataQuery = "SELECT libid, firstName, uniqueNum FROM sql6513149.libusers WHERE ";
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
function getCurrBooksData(libid, connection, page) { 
    return new Promise(function (resolve, reject) { 
        const currBookDataQuery = "SELECT search.row_count, libid, isbn, status, staffName, dateBorrowed, dateReturned, fine FROM sql6513149.booktransaction, (SELECT COUNT(*) as row_count FROM sql6513149.booktransaction WHERE libid = ? AND dateReturned IS NULL) as search HAVING libid = ? AND dateReturned IS NULL ORDER BY id LIMIT " + ((Number(page) - 1) * pageOffset) + ", " + pageOffset;
        connection.query(currBookDataQuery, [Number(libid), Number(libid)], function (err, bookData) { 
            if (err) { 
                return reject(err);
            }
            resolve(bookData);
        });
    });
}

//Function to get the previously borrowed books of the user
function getPrevBooksData(libid, page) { 
    return new Promise(function (resolve, reject) { 
        sconnect().then(function (resS) { 
            getPreviousBooks(libid, resS, page).then(function (prevData) { 
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

                        resolve([finalPrevData, prevData[0]['row_count']]);
                    }).catch(err => { return reject(err); });
                } else { 
                    resolve(["NIL", 0]);
                }
            }).catch(err1 => { return reject(err1); });
        }).catch(err => { return reject(err); });
    });
}

//Function to get the currently borrowed books of the user
function getCurrentBooksData(libid, page) {
    return new Promise(function (resolve, reject) {
        sconnect().then(function (resS) {
            getCurrBooksData(libid, resS, page).then(function (currData) {
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
                        resolve([finalCurrentBooksData, currData[0]['row_count']]);
                    }).catch(err => { return reject(err); });
                } else { 
                    resolve(["NIL", 0]);
                }

            }).catch(err1 => { return reject(err1); });
        }).catch(err => { return reject(err); });
    });
}

//Function to add book transaction
function updateTransaction(libid, isbn, connection) {
    return new Promise(function (resolve, reject) { 
        const isbns = isbn.split(" ");
        const date = new Date();
        const dateFormatted = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
        var updateTransactionQuery = "INSERT INTO sql6513149.booktransaction (libid, isbn, dateBorrowed) VALUES ";
        for (let i in isbns) { 
            updateTransactionQuery += "( " + libid + ", " + isbns[i] + ", '" + dateFormatted + "' )," ;
        }
        updateTransactionQuery = updateTransactionQuery.substring(0, updateTransactionQuery.length - 1);
        connection.query(updateTransactionQuery, function (err) { 
            if (err) { 
                return reject(err);
            }
            resolve("Success");
        });
    });  
}

//Function to process pending books
function processPendingBooks(idAndisbn) { 
    return new Promise(function (resolve, reject) { 
        sconnect().then(function (connection) {
            var date = new Date();
            const dat = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
            var transacQuery = "UPDATE sql6513149.booktransaction SET dateReturned = '" + dat + "', status = 0 WHERE ";
            for (let i in idAndisbn) {
                let temp = idAndisbn[i].split(" ");
                transacQuery += "libid = " + temp[0] + " AND isbn = " + temp[1] + " OR ";
            }
            transacQuery = transacQuery.substring(0, transacQuery.length - 4);
            connection.query(transacQuery, function (err1) { 
                if (err1) { 
                    return reject(err1);
                }
                resolve("Success");
            });
        }).catch(err => console.log(err));
    });
    
}

//Changing the status in transaction table after student borrowed
function changeStatus(idAndisbn, staffName) { 
    return new Promise(function (resolve, reject) { 
        sconnect().then(function (connection) { 
            var statusQuery = "UPDATE sql6513149.booktransaction SET status = 1, staffName = '" + staffName + "' WHERE status = 0 AND ( ";
            for (let i in idAndisbn) {
                let temp = idAndisbn[i].split(" ");
                statusQuery += "( libid = " + temp[0] + " AND isbn = " + temp[1] + " ) OR ";
            }
            statusQuery = statusQuery.substring(0, statusQuery.length - 4) + " )";
            
            connection.query(statusQuery, function (err) { 
                if (err) { 
                    return reject(err);
                }
                resolve("Success");
            });
        }).catch(err => console.log(err));
    });
}

//Get staff name
function getStaffName(libid) { 
    return new Promise(function (resolve, reject) { 
        sconnect().then(function (connection) { 
            const getStaffNameQuery = "SELECT firstName FROM sql6513149.libusers WHERE libid = " + libid;
            connection.query(getStaffNameQuery, function (err, row) { 
                if (err) { 
                    return reject(err);
                }
                resolve(row[0]['firstName']);
            });
        }).catch(err => console.log(err));
    });
}

//Function to add new book
function addNewBook(bookData) { 
    return new Promise(function (resolve, reject) {
        sconnect().then(function (connection) {
            const addBookQuery = "INSERT INTO sql6513149.books (name, author, publication_date, genre, price, noOfCopies, isbn) VALUES (?, ?, ?, ?, ?, ?, ?)";
            connection.query(addBookQuery, bookData, function (err, stat) { 
                if (err) { 
                    return reject(err);
                }
                resolve("Success");
            });
        });
    });
}

//Function to get user details
function getUserDetails(type, page) {
    return new Promise((resolve, reject) => {
        sconnect().then(function (connection) { 
            var staffDetailsQuery = "SELECT search.row_count, id, userType, firstName, lastName, email, dob, roll, dept, uniqueNum, created, libid FROM sql6513149.libusers, (SELECT COUNT(*) as row_count FROM sql6513149.libusers WHERE userType = ?) as search HAVING userType = ? ORDER BY id LIMIT " + ((page - 1) * pageOffset) + ", " + pageOffset;
            connection.query(staffDetailsQuery, [type, type], function (err, rows) {
                if (err) {
                    return reject(err);
                }
                resolve([rows, rows[0]['row_count']]);
            });
        }).catch(err => { return reject(err); });
    });
}

//Function to get all transaction details
function getAllTransactions(page) { 
    return new Promise(function (resolve, reject) { 
        sconnect().then(function (connection) { 
            const transactionQuery = "SELECT search.row_count, id, isbn, libid, status, staffName, dateBorrowed, dateReturned, fine FROM sql6513149.booktransaction, (SELECT COUNT(*) as row_count FROM sql6513149.booktransaction) as search ORDER BY id LIMIT " + ((page - 1) * pageOffset) + ", " + pageOffset;
            
            connection.query(transactionQuery, function (err, rows) {
                if (err) {
                    return reject(err);
                }
                resolve([rows, rows[0]['row_count']]);
            });
        }).catch(err => console.log(err));
    });
}

//Function to remove book and user data
function removeData(id, type) {
    return new Promise(function (resolve, reject) { 
        sconnect().then(function (connection) {
            let removeQuery = "";
            if (type == "user") {
                removeQuery = "DELETE FROM sql6513149.libusers WHERE libid = '" + id + "'";
            } else { 
                removeQuery = "DELETE FROM sql6513149.books WHERE isbn = '" + id + "'";
            }
            connection.query(removeQuery, function (err, result) { 
                if (err) {
                    return reject(err);
                }
                resolve("Success");
            });
        }).catch(err => reject(err));
    });
}

//Function to get all book data
function getAllBookDetails(page) {
    return new Promise(function (resolve, reject) {
        sconnect().then(function (connection) {
            var getUserDetailsQuery = "SELECT search.row_count, name, author, publication_date, genre, price, noOfCopies, isbn FROM sql6513149.books, (SELECT COUNT(*) as row_count FROM sql6513149.books) as search ORDER BY id LIMIT " + ((page - 1) * pageOffset) + ", " + pageOffset;

            connection.query(getUserDetailsQuery, function (err, results) {
                if (err) {
                    return reject("NIL");
                }
                if (Object.keys(results).length > 0) {
                    resolve([results, results[0]['row_count']]);
                } else { 
                    resolve(["NIL", 0]);
                }
            });
        }).catch(err => reject(err));
        
    });
}



// Sending the loginpage on get request  
app.get("/login", nocache, function (req, res) { 
    if (req.cookies['Student'] != undefined) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);

        getPrevBooksData(req.cookies['Student'], page).then(function (prevBookData) { 
            defPrevBooksData = prevBookData;
            getCurrentBooksData(req.cookies['Student'], page).then(function (currBookData) { 
                defCurrBorrowedBooks = currBookData;
                res.redirect('dashboard');
            }).catch(err2 => console.log(err2));
            
        }).catch(err => console.log(err));
    } else if (req.cookies['Staff'] != undefined) {
        res.redirect('staff');
    }else if (req.cookies['Admin'] != undefined) {
        res.redirect('admin');
    }
    else {
        res.render('login', { lUserErr: '', lPassErr: '' });
    }
});

// Sending the signup page on get request  
app.get("/signUp", nocache, function (req, res) {
    if (req.cookies['Student']) {
        getPrevBooksData(req.cookies['Student']).then(function (prevBookData) {
            defPrevBooksData = prevBookData;
            getCurrentBooksData(req.cookies['Student']).then(function (currBookData) {
                defCurrBorrowedBooks = currBookData;
                res.redirect('dashboard');
            }).catch(err2 => console.log(err2));

        }).catch(err => console.log(err));
    } else if (req.cookies['Staff']) { 
        res.redirect('staff');
    }else {
        res.render('signUp', { fname: '', lname: '', email: '', pass: '', roll: '', uniqueNum: '' });
    }
    
});

// Validating and processing the login form
app.post("/login", validateLoginConfig, function (req, res) {
    var bpErr = { 'libErr': '', 'passErr': '' };
    if (Object.keys(validationResult(req)['errors']).length != 0) {
        bpErr['libErr'] = validationResult(req)['errors'][0]['msg'];
        res.render('login', { lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr'] });
    }
    else {
        sconnect().then(function (resc) {
            exeLogin(req.body.libid, resc).then(function (rows) {
                if (rows.length == 0) {
                    bpErr['passErr'] = "Lib-Id or Password mismatch";
                    res.render('login', { lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr'] });
                } else {
                    const temp = bcrypt.compareSync(req.body.lpass, rows[0]['pass']);
                    if (!temp) {
                        bpErr['passErr'] = "Lib-Id or Password mismatch";
                        res.render('login', { lUserErr: bpErr['libErr'], lPassErr: bpErr['passErr'] });
                    } else {
                        res.cookie(rows[0]['userType'], rows[0]['libid'].toString());
                        if (rows[0]['userType'] == 'Student') {
                            res.redirect('/dashboard/borrowBooks');
                        } else if (rows[0]['userType'] == 'Staff') {
                            res.redirect('/staff/pendingBooks');
                        } else {
                            res.redirect('/admin/bookData');
                        }
                    }
                }
            }).catch(err3 => console.log(err3));
        }).catch(_errc1 => console.log("Could not establish a connection"));
    }
});

// Validating and processing the signup form 
app.post("/signUp", validateSignUpConfig, function (req, res) {
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

                    res.cookie(req.body.userType, nLibId[0]['newlibid']);

                    if (Object.keys(validationResult(req)['errors']).length != 0 && validationResult(req)['errors'][0]['param'] == 'roll' && req.body.userType != 'Student') {
                        if (req.body.userType == 'Staff') {
                            res.redirect('staff');
                        } else {
                            res.redirect('admin');
                        }
                    } else {
                        res.redirect('/dashboard?dashboardTab=borrowBooks');
                    }

                }).catch(errI => console.log(errI));
            }).catch(errL => console.log(errL));
        }).catch(errS => console.log(errS));
    } else {
        const valErr = validationResult(req)['errors'];
        for (let errIter in valErr) {
            switch (valErr[errIter]['param']) {
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
        res.render('signUp', { fname: sErr['fname'], lname: sErr['lname'], email: sErr['email'], pass: sErr['pass'], roll: sErr['roll'], uniqueNum: sErr['uniqueNum'] });
    }
});

//Sending the dashboard page on get requset
app.get("/dashboard", nocache, function (req, res) {
    if (req.cookies['Student']) {
        console.log(req.query);

        if (req.query.dashboardTab == "borrowBooks") {
            res.redirect('/dashboard/borrowBooks');
        }
        else if (req.query.dashboardTab == "pendingBooks") {
            res.redirect('/dashboard/pendingBooks');
        } else { 
            res.redirect('/dashboard/borrowedBooks');
        }  
    } else {
        res.redirect('login');
    } 
});


app.get("/dashboard/borrowBooks", nocache, function (req, res) { 
    if (req.cookies['Student']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);
        searchDB(defSearchConfig[0]['searchBarText'], defSearchConfig[0]['searchTag'], page).then(function (bookData) {
            let tot_count = bookData.length == 0 ? [1, page] : [Math.ceil(bookData[0]['row_count'] / pageOffset), page];
            if (page > tot_count[0]  && tot_count[0] > 0) {
                res.redirect('/dashboard/borrowBooks?page=' + tot_count[0]);
            } else {
                res.render('dashboard-borrow', { searchData: bookData, searchConfig: defSearchConfig, tot_count: tot_count });
            }
        }).catch(err => console.log(err));
    } else { 
        res.redirect('/login');
    }
});


app.get("/dashboard/pendingBooks", nocache, function (req, res) { 
    if (req.cookies['Student']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);
        getCurrentBooksData(req.cookies['Student'], page).then(function (currBookData) {
            defCurrBorrowedBooks = (currBookData[0] != "NIL") ? currBookData[0] : {};
            let tot_count = defCurrBorrowedBooks.length == 0 ? [1, page] : [Math.ceil(currBookData[1] / pageOffset), page];
            if (page > tot_count[0] && tot_count[0] > 0) {
                res.redirect('/dashboard/pendingBooks?page=1');
            } else {
                res.render('dashboard-pending', { currBooksData: defCurrBorrowedBooks, tot_count: tot_count });
            }
        }).catch(err2 => console.log(err2));

    } else { 
        res.redirect('/login');
    }
});


app.get("/dashboard/borrowedBooks", nocache, function (req, res) { 
    if (req.cookies['Student']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);
        getPrevBooksData(req.cookies['Student'], page).then(function (prevBookData) {
            defPrevBooksData = (prevBookData[0] != "NIL") ? prevBookData[0] : {};
            let tot_count = prevBookData.length == 0 ? [1, page] : [Math.ceil(prevBookData[1] / pageOffset), page];
            if (page > tot_count[0] && tot_count[0] > 0) {
                res.redirect('/dashboard/borrowedBooks?page=1');
            } else { 
                res.render('dashboard-borrowed', { prevBooksData: defPrevBooksData, tot_count: tot_count });
            }     
        }).catch(err => console.log(err));

    } else { 
        res.redirect('/login');
    }
});


// Processing the search from dashboard page to server and back
app.post("/dashboard/borrowBooks", validateSearchConfig, function (req, res) {
    let page = 1;

    searchDB(req.body.searchBar, req.body.searchFactor, page).then(function (searchResults) {
        let tot_count = searchResults.length == 0 ? [1, page] : [Math.ceil(searchResults[0]['row_count'] / pageOffset), page];
        defSearchConfig[0]['searchTag'] = req.body.searchFactor;
        defSearchConfig[0]['searchBarText'] = req.body.searchBar;
        defSearchConfig[0]['noOfSearchResults'] = Object.keys(searchResults).length;

        res.render('dashboard-borrow', { searchData: searchResults, searchConfig: defSearchConfig, prevBooksData: defPrevBooksData, currBooksData: defCurrBorrowedBooks, tot_count: tot_count });
    }).catch(errDB => console.log(errDB));
            
});

//Selecting and update the no of copies
app.get("/confirmBooks", nocache, function (req, res) {
    const booksArray = req.body['booksSelected'].split(" ");
    sconnect().then(function (resS) {
        updateCopies(booksArray, 0).then(function (stat) {
            getBookDetails(req.body['booksSelected'], resS).then(function (bookData) {
                updateTransaction(req.cookies['Student'], req.body['booksSelected'], resS).then(function (ans) { 
                    res.render('confirmBooks', { borrowedBookData: bookData });
                }).catch(err4 => console.log(err4));
            }).catch(errT => console.log(errT));
        }).catch(err => console.log(err));
    }).catch(errC => console.log(errC));  
});

app.get("/staff/pendingBooks", nocache, function (req, res) { 
    if (req.cookies['Staff']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);
        sconnect().then(function (resS) {
            getPendingBooks(1, resS, page).then(function (pendingBooksData) {
                defPendingBooks = pendingBooksData[0] == "NIL" ? {} : pendingBooksData[0];

                let tot_count = defPendingBooks.length == 0 ? [1, page] : [Math.ceil(pendingBooksData[1] / pageOffset), page];
                if (page > tot_count[0] && tot_count[0] > 0) {
                    res.redirect('/staff/pendingBooks?page=1');
                } else {
                    res.render('staff-pending', { pendingBooks: defPendingBooks, tot_count: tot_count });
                }
                
            }).catch(err1 => console.log(err1));
        }).catch(err => console.log(err));
    }
    else { 
        res.redirect('/login');
    }
});

app.get("/staff/yetToBeBorrowedBooks", nocache, function (req, res) { 
    if (req.cookies['Staff']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);
        sconnect().then(function (resS) {
            getPendingBooks(0, resS, page).then(function (yBooksData) {
                defYetBorrowedBooks = yBooksData[0] == "NIL" ? {} : yBooksData[0];
                let tot_count = defYetBorrowedBooks.length == 0 ? [1, page] : [Math.ceil(yBooksData[1] / pageOffset), page];

                if (page > tot_count[0] && tot_count[0] > 0) {
                    res.redirect('/staff/yetToBeBorrowedBooks?page=1');
                } else {
                    res.render('staff-borrow', { yetBorrowedBooks: defYetBorrowedBooks, tot_count: tot_count });
                }
                
            }).catch(err1 => console.log(err1));
        }).catch(err => console.log(err));
    }
    else { 
        res.redirect('/login');
    }
});

app.get("/staff/addBook", nocache, function (req, res) { 
    if (req.cookies['Staff']) {
        res.render('staff-addBook', {conn_err: def_conn_err, addBookErrors: defAddBookErrors});
    } else { 
        res.redirect('login');
    }
});

app.get("/admin/bookData", nocache, function (req, res) { 
    if (req.cookies['Admin']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);

        getAllBookDetails(page).then(function (bookDetails) { 
            let defbookDetails = bookDetails[0] == "NIL" ? {} : bookDetails[0];
            let tot_count = Object.keys(defbookDetails).length == 0 ? [1, page] : [Math.ceil(bookDetails[1] / pageOffset), page];
            if (page > tot_count[0] && tot_count[0] > 0){
                res.redirect('/admin/bookData?page=1');
            } else {
                res.render('admin-bookData', { bookDetails: defbookDetails, tot_count: tot_count, page: [page]});
            }

        }).catch(err => console.log(err));
    } else { 
        res.redirect('/login');
    }
});

app.get("/admin/studentData", nocache, function (req, res) { 
    if (req.cookies['Admin']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);

        getUserDetails("Student",  page).then(function (userDetails) {
            let defUserDetails = userDetails[0] == "NIL" ? {} : userDetails[0];
            let tot_count = defUserDetails.length == 0 ? [1, page] : [Math.ceil(userDetails[1] / pageOffset), page];

            if (page > tot_count[0]  && tot_count[0] > 0) {
                res.redirect('/admin/studentData?page=' + tot_count[0]);
            } else {
                res.render('admin-userData', { userData: defUserDetails, tot_count: tot_count});
            }

         }).catch(err => console.log(err));
    } else { 
        res.redirect('/login');
    }
});

app.get("/admin/staffData", nocache, function (req, res) { 
    if (req.cookies['Admin']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);

        getUserDetails("Staff",  page).then(function (userDetails) {
            let defUserDetails = userDetails[0] == "NIL" ? {} : userDetails[0];
            let tot_count = defUserDetails.length == 0 ? [1, page] : [Math.ceil(userDetails[1] / pageOffset), page];

            res.render('admin-userData', { userData: defUserDetails, tot_count: tot_count});
         }).catch(err => console.log(err));
    } else { 
        res.redirect('/login');
    }
});

app.get("/admin/transactionData", nocache, function (req, res) { 
    if (req.cookies['Admin']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);

        getAllTransactions(page).then(function (transactions) {
            let deftransactionsDetails = transactions[0] == "NIL" ? {} : transactions[0];
            let tot_count = deftransactionsDetails.length == 0 ? [1, page] : [Math.ceil(transactions[1] / pageOffset), page];

            for (let i in deftransactionsDetails) {
                deftransactionsDetails[i]["dateBorrowed"] = new Date(deftransactionsDetails[i]["dateBorrowed"]).toDateString();
                deftransactionsDetails[i]["dateReturned"] = deftransactionsDetails[i]["dateReturned"] != null ? new Date(deftransactionsDetails[i]["dateReturned"]).toDateString() : "-";
                deftransactionsDetails[i]["status"] = deftransactionsDetails[i]["status"] == 0 ? "In Library" : "With Student";
                deftransactionsDetails[i]["fine"] = deftransactionsDetails[i]["fine"] == null ? "-" : deftransactionsDetails[i]["fine"];
                deftransactionsDetails[i]["staffName"] = deftransactionsDetails[i]["staffName"] == null ? "-" : deftransactionsDetails[i]["staffName"];  
            }

            res.render('admin-transaction', { deftransactionsDetails: deftransactionsDetails, tot_count: tot_count});
            
        }).catch(err => console.log(err));
    } else { 
        res.redirect('/login');
    }
});

//Processing pending books in staff
app.post("/processPendingBooks", function (req, res) { 
    var idAndisbn = req.body.pendingBooksData.split(",");
    var isbnArr = [];
    for (let i in idAndisbn) {
        let temp = idAndisbn[i].split(" ");
        isbnArr.push(temp[1]);
    }
    processPendingBooks(idAndisbn).then(function (stat) { 
        updateCopies(isbnArr, 1).then(function (stat2) { 
            res.redirect('staff');
        }).catch(err3 => console.log(err3));
    }).catch(err => console.log(err));
});

//Processing yet to be borrowed books in staff
app.post("/processYetBorrowedBooks", function (req, res) {
    var idAndisbn = req.body.yetBorrowedBooksData.split(",");
    getStaffName(req.cookies['Staff']).then(function (staffName) { 
        changeStatus(idAndisbn, staffName).then(function (stat) {
            res.redirect('staff');
        }).catch(err2 => console.log(err2));
    }).catch(err => console.log(err));
});

//Logging out the user
app.get("/logout", function (req, res) {
    if (req.cookies['Student']) {
        res.clearCookie('Student');
    } else if (req.cookies['Staff']) {
        res.clearCookie('Staff');
    } else {
        res.clearCookie('Admin');
    }
    res.redirect('login');
});

//Adding new book in staff
app.post("/staff/addBook", validateAddNewBookConfig, function (req, res) { 
    var errors = validationResult(req);
    
    var addBookErrors = [];
    if (Object.keys(errors['errors']).length > 0) {
        for (let i in errors['errors']) {
            addBookErrors[errors['errors'][i]['param']] = errors['errors'][i]['msg'];
        }
        if (req.body.year.charAt(5) != "-" || req.body.year.charAt(8)) {
            addBookErrors.push({ 'year': "Enter a valid year" });
        }
        if (Object.keys(addBookErrors).length == 1 && addBookErrors['isbn'] != undefined) {
            if (req.body.isbn.slice(-1) == "X") {
                addNewBook([req.body.bname, req.body.author, req.body.year, req.body.genre, req.body.price, req.body.noOfCopies, req.body.isbn]).then(function (status) {
                    if (status == "Success") {
                        def_conn_err["err"] = "*book added successfully";
                        res.redirect('/staff/addBook');
                    } else {
                        let conn_err = [{ "err": "Database problem, Please try again after some time." }];
                        res.render('staff', { addBookErrors: defAddBookErrors, conn_err: conn_err });
                    }
                });
            } else {
                res.render('staff-addBook', { addBookErrors: addBookErrors, conn_err: def_conn_err });
            }
        } else { 
            res.render('staff-addBook', { addBookErrors: addBookErrors, conn_err: def_conn_err });
        }
    } else { 
        addNewBook([ req.body.bname, req.body.author, req.body.year, req.body.genre, req.body.price, req.body.noOfCopies, req.body.isbn ]).then(function (status) { 
            if (status == "Success") {
                def_conn_err["err"] = "*book added successfully";
                res.redirect('/staff/addBook');
            } else { 
                let conn_err = [{ "err": "Database problem, Please try again after some time." }];
                res.render('staff', { addBookErrors: defAddBookErrors, conn_err: conn_err });
            }
        });  
    }
});

//Removing user in admin dashboard
app.post('/removeData', function (req, res) {
    let type = "";
    let id = "";
    if (req.body.libid) {
        type = "user";
        id = req.body.libid;
    } else { 
        type = "book";
        id = req.body.isbn;
    }
    removeData(id, type).then(function (result) { 
        res.redirect('/admin/bookData?page='+req.query.page);
    }).catch(err => console.log(err));
});

let port = process.env.PORT;
if (port == undefined || port == "") {
    port = 3000;
}

app.get('/', nocache, function (req, res) { 
    res.redirect('/login')
});
// Listening to port 3000
app.listen(port, function(){
    console.log("Server is up and running!");
});























