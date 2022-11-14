// Importing all required node modules
require('dotenv').config({
    path: __dirname + "/.env"
});

//Required constants
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
var schema = mongoose.Schema;
const uri = "mongodb://localhost:27017/libraryData";
const pageOffset = 10;


//Required schemas
const bookSchema = new schema(
    {
        id: Number,
        name: String,
        author: String,
        average_rating: Number,
        isbn: String, 
        isbn13: String,
        language_code: String,
        tot_pages: Number,
        ratings_count: Number,
        text_reviews_count: Number,
        publication_date: Date,
        publisher: String, 
        genre: String, 
        noOfCopies: Number,
        price: Number
    }
);
const transactionSchema = new schema({
    library_id: Number,
    isbn: String,
    book_status: Number,
    staff_id: Number,
    date_borrowed: Date,
    date_returned: Date,
    fine: Number
});

const userSchema = new schema({
    library_id: Number,
    user_type: String,
    first_name: String,
    last_name: String,
    email: String,
    date_of_birth: Date,
    roll_no: Number,
    department: String,
    password: String,
    unique_number: String,
    created: Date
});

//Model definitions
const User = mongoose.model('User', userSchema);
const Book = mongoose.model('Book', bookSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);


//Validator configuration
const validateLoginConfig = [ body('library_id').trim().isLength({min: 4, max:5}).withMessage("Enter a valid Lib-Id").isNumeric().withMessage("Enter a valid Lib-Id") ];
const validateSignUpConfig = [  body('first_name').trim().escape().isLength({min:3}).withMessage('Enter a valid first name').isAlpha().withMessage('Enter a valid first name'),
                                body('last_name').trim().escape().isLength({min:0}).withMessage('Enter a valid last name').isAlpha().withMessage('Enter a valid last name'),
                                body('email').trim().escape().toLowerCase().isEmail().withMessage('Enter a valid email').normalizeEmail({gmail_remove_dots: false}),
                                body('password').trim().escape().isLength({min:5}).withMessage("Password must be atleast 6 characters").matches('[0-9]').withMessage("Password must contain a number").matches('[A-Z]').withMessage("Password must contain atleast a uppercase letter").matches('[a-z]').withMessage("Password must contain atleast a lowercase letter"),
                                body('roll_no').trim().escape().isLength({ min: 10, max: 10 }).withMessage("Enter a valid roll no."),
                                body('admin_password').trim().escape(),
                                body('unique_number').trim().escape().isNumeric().withMessage('Enter a valid unique number').isLength({min: 14, max: 14}).withMessage('Enter a valid unique number') 
                            ];
const validateAddNewBookConfig = [  body('bname').trim().escape().isLength({ min: 3 }).withMessage('Enter a valid book name'),
                                    body('author').trim().escape().isLength({ min: 3 }).withMessage('Enter a valid author name').isAlpha().withMessage('Enter a valid author name'),
                                    body('genre').trim().escape().isLength({ min: 3 }).withMessage('Enter a valid genre').isAlpha().withMessage('Enter a valid genre'),
                                    body('isbn').trim().escape().isLength({ min: 9, max: 10 }).withMessage("Enter a valid ISBN"),
                                    body('price').trim().escape().isNumeric().withMessage("Enter a valid price"),
                                    body('noOfCopies').trim().escape().isNumeric().withMessage("Enter a valid number"),
                                ];
const validateSearchConfig = [body('searchBar').trim().escape().toLowerCase()];


//Default values for all configuration
var defAddBookErrors = [{ "bname": "", "author": "", "year": "", "genre": "", "price": "", "isbn": "", "noOfCopies": ""}];                 
var defCurrBorrowedBooks = {};  
var defPendingBooks = {};   
var defYetBorrowedBooks = {};
var defSearchConfig = [{ 'searchTag': 'Search By:', 'searchBarText': '*' }];

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

//Function to get the year from datetime
function getYearFromDateTime(data) { 
    for (let i in data) { 
        data[i]['year'] = new Date(data[i]['publication_date']).toISOString().split("T")[0].substring(0, 4);
    }
    return data;
}

//Function to get the date from datetime
function getDateFromDateTime(data) { 
    let res = [];
    for (let i in data) { 
        let temp = {};
        temp["library_id"] = data[i]["library_id"];
        temp["isbn"] = data[i]["isbn"];
        temp["book_status"] = data[i]["book_status"];
        temp["date_borrowed"] = new Date(data[i]['date_borrowed']).toISOString().split("T")[0];
        temp["fine"] = data[i]["fine"];
        temp["date_returned"] = data[i]['date_returned'] != null ? new Date(data[i]['date_returned']).toISOString().split("T")[0] : "-";
        temp['staff_id'] = data[i]["staff_id"] == null ? "-" : data[i]["staff_id"];          
        temp["book_status"] = data[i]["book_status"] == 1 ? "Yet to borrow" : data[i]["book_status"] == 2 ? "With Student" : "In Library";
        res.push(temp);
    }
    return res;
}

// Function to get pass from DB
function checkUserExisits(id, pass){
    return new Promise(function (resolve, reject){
        mongoose.connect(uri).then(
            () => { 
                User.find({ library_id: id }, function (err, userData) { 
                    let temp = false, type = 'none';
                    if (err) {
                        return reject(false);
                    } else { 
                        if (userData.length != 0) {
                            temp = bcrypt.compareSync(pass, userData[0]['password']);
                            type = userData[0]['user_type'];
                        }
                        resolve([temp, type]);
                    }
                });
            },
            err => {
                console.log(err);
                return reject(false);
            }
        );
    });
} 

// Function to insert all data into DB after sigup
function createNewUser(newUserData) {
    return new Promise(function (resolve, reject) {
        mongoose.connect(uri).then(
            () => {
                User.estimatedDocumentCount(function (err, count) {
                    if (err) {
                        return reject(false);
                    } else {
                        newUserData['library_id'] = Number(count + 2000);
                        const newUser = new User(newUserData);
                        newUser.save(function (err, _doc) {
                            if (err) {
                                return reject(false);
                            } else {
                                resolve(newUserData);
                            }
                        });
                    }
                });
            },
            _err => {
                console.log("Database connection Error! Try again");
                return reject(false);
            }
        );
    });
}

//Function to get the transaction data using library_id
function getTransactionsData(id, status, page) { 
    return new Promise(function (resolve, reject) {
        let filter;
        if (status == 0 && id == 0) {
            filter = {};
        } else if (status == 0 && id != 0) {
            filter = { library_id: id };
        } else if (status != 0 && id == 0) {
            filter = { book_status: status };
        } else { 
            filter = { library_id: id, book_status: status };
        }
        mongoose.connect(uri).then(
            () => {
                Transaction.find(filter, function (err1, data) { 
                    if (err1) {
                        return reject(false);
                    } else { 
                        Transaction.find(filter, {}, { skip: (page - 1) * pageOffset, limit: pageOffset }, function (err, transacData) { 
                            if (err) {
                                return reject(false);
                            } else {
                                transacData = getDateFromDateTime(transacData);
                                resolve([data.length, transacData]);
                            }
                        });
                    }
                });      
            },
            _err => {
                console.log("Database connection Error! Try again");
                return reject(false);
            }
        );
    });
}

//Function to get user details
function getUserDetails(libidArray) {
    return new Promise((resolve, reject) => {
        mongoose.connect(uri).then(
            () => { 
                User.find({ library_id: { $in: libidArray } }, {}, function (err, userData) { 
                    if (err) {
                        return reject(false);
                    } else { 
                        resolve(userData);
                    }
                });
            },
            _err => { 
                console.log("Database connection error Try again!");
                return reject(false);
            }
        );
    });
}

//Function to get the book data using isbn
function getBookData(isbnArray) { 
    return new Promise(function (resolve, reject) { 
        mongoose.connect(uri).then(
            () => {
                Book.find({ isbn: { $in: isbnArray } }, {}, function (err, booksData) {
                    if (err) {
                        return reject(false);
                    } else {
                        resolve(getYearFromDateTime(booksData));
                    }
                });
            },
            _err => { 
                console.log("Database connection Error! Try again");
                return reject(false);
            }
        );
    });
}

// Function to get the search results from DB
function searchDB(searchValue, searchFactor, page) {
    return new Promise(function (resolve, reject) {
        let filteredSearchFactor = "name";

        switch (searchFactor) { 
            case 'Author Name':
                filteredSearchFactor = "author";
                break;
            case 'ISBN':
                filteredSearchFactor = "isbn";
                break;
            case 'Genre':
                filteredSearchFactor = "genre";
                break;
        }

        mongoose.connect(uri).then(
            () => { 
                if (searchValue == "*") {
                    Book.find({}, {}, { skip: (page - 1) * pageOffset, limit: pageOffset }, function (err, data) {
                        if (err) {
                            return reject(false);
                        } else {
                            Book.find().count(function (err1, cnt) {
                                if (err1) {
                                    return reject(false);
                                } else {
                                    data = getYearFromDateTime(data);
                                    resolve([cnt, data]);
                                }
                            });
                        }
                    });
                } else {
                    Book.find({ [filteredSearchFactor]: { $regex: ".*" + searchValue + ".*", $options: "i" } }, {}, { skip: (page - 1) * pageOffset, limit: pageOffset }, function (err, data) {
                        if (err) {
                            return reject(false);
                        } else {
                            Book.find({ [filteredSearchFactor]: { $regex: ".*" + searchValue + ".*", $options: "i" } }).count(function (err1, cnt) { 
                                if (err1) {
                                    return reject(false);
                                } else {
                                    resolve([cnt, getYearFromDateTime(data)]);
                                }
                            });
                        }
                    });
                }
            },
            _err => { 
                console.log("Database connection Error! Try again");
                return reject("false3")
            }
        );
     });
}

//Function to update the no of copies of borrowed books
function updateCopies(isbnArr, inc) {
    return new Promise(function (resolve, reject) {
        let val = inc == 0 ? -1 : 1;
        mongoose.connect(uri).then(
            () => { 
                Book.updateMany({ isbn: { $in: isbnArr } }, { $inc: { 'noOfCopies': val } }, function (err, modifiedData) { 
                    if (err) {
                        return reject(false);
                    } else { 
                        if (modifiedData['modifiedCount'] == isbnArr.length) {
                            resolve(true);
                        } else { 
                            return reject(false);
                        }
                    } 
                })
            },
            _err => { 
                console.log("Database connection Error! Try again");
                return reject(false);
            }
        );  
    });
}

//Function to add new book
function addNewBook(bookData) { 
    return new Promise(function (resolve, reject) {
        mongoose.connect(uri).then(
            () => { 
                Book.create(bookData, function (err, _ack) {
                    if (err) {
                        return reject(false);
                    } else { 
                        resolve(true);
                    }
                 });
            },
            _err => {
                console.log("DB connection error! Try again");
                return reject(false);
            }
        );
    });
}

//Function to get the book data of the user
function getUserBookData(id, status, page) { 
    return new Promise(function (resolve, reject) {
        let finData = [];
        getTransactionsData(id, status, page).then(function (data) {
            let isbnObj = {}, libidObj = {};
            let transData = data[1];
            for (let i in data[1]) { 
                isbnObj[data[1][i]['isbn']] = 1;
                libidObj[data[1][i]['library_id']] = 1;
            }
            getBookData(Object.keys(isbnObj)).then(function (bookData) {
                bookData = getYearFromDateTime(bookData);
                let finBookData = {};
                for (let i in bookData) { 
                    finBookData[bookData[i]['isbn']] = bookData[i];
                }
                getUserDetails(Object.keys(libidObj)).then(function (userData) {
                    let finUserData = {};
                    for (let i in userData) {
                        finUserData[userData[i]['library_id']] = userData[i];
                    }
                    for (let i in transData) {
                        let temp = {};
                        temp['name'] = finBookData[transData[i]['isbn']]['name'];
                        temp['author'] = finBookData[transData[i]['isbn']]['author'];
                        temp['year'] = finBookData[transData[i]['isbn']]['year'];
                        temp['price'] = finBookData[transData[i]['isbn']]['price'];
                        temp['genre'] = finBookData[transData[i]['isbn']]['genre'];
                        temp['isbn'] = finBookData[transData[i]['isbn']]['isbn'];
                        temp['library_id'] = transData[i]['library_id'];
                        temp['first_name'] = finUserData[transData[i]['library_id']]['first_name'];
                        temp['unique_number'] = finUserData[transData[i]['library_id']]['unique_number'];
                        temp['date_borrowed'] = transData[i]['date_borrowed'];
                        temp['date_returned'] = transData[i]['date_returned'];
                        temp['fine'] = transData[i]['fine'];
                        finData.push(temp);
                    }
                    resolve([data[0], finData]);
                }).catch(function (err2) {
                    console.log(err2);
                    return reject(false);
                });
            }).catch(function (err) {
                console.log(err);
                return reject(false);
            });
        }).catch(function (err1) {
            console.log(err1);
            return reject(false);
        });
    });
}

//Function to add book transaction
function updateTransaction(id, stat, isbnArray, keyValue, staff) {
    return new Promise(function (resolve, reject) { 
        if (stat == 0) {
            let newTransaction = [];
    
            for (let eachIsbn in isbnArray) {
                newTransaction.push({
                    library_id: id,
                    isbn: isbnArray[eachIsbn],
                    book_status: 1,
                    staff_id: null,
                    date_borrowed: new Date(),
                    date_returned: null,
                    fine: 0
                });
            }
            mongoose.connect(uri).then(
                () => {
                    Transaction.insertMany(newTransaction, {}, function (err, ack) {
                        if (err) {
                            return reject(false);
                        } else {
                            if (ack.length != isbnArray.length) {
                                return reject(false);
                            } else {
                                resolve(true);
                            }
                        }
                    });
                },
                err => {
                    console.log("DB connection error! Try again");
                    return reject(false);
                }
            );
        } else { 
            
            let updateDate = stat == 1 ? { book_status: Number(stat) + 1, staff_id: staff } : { book_status: Number(stat) + 1, date_returned: new Date()} ;
            let idObj = {};
            let tempIsbnArray = [];
            let cnt = 0;
            let globalID;
            for (let i in keyValue) { 
                idObj[keyValue[i][0]] = 1;
            }


            const dbUpdate = new Promise((resolve2, reject2) => { 
                mongoose.connect(uri).then(
                    () => { 
                        Transaction.updateMany({ library_id: globalID, book_status: stat, isbn: { $in: tempIsbnArray } }, { $set: updateDate }, function (err, ack) {
                            if (err) {
                                resolve2(0);
                            } else {
                                if (ack['modifiedCount'] == tempIsbnArray.length) {
                                    resolve2(1);
                                }
                            }
                        }); 
                    },
                    err => { 
                        console.log(err);
                    }
                );
                        
            });



            const pre1 = new Promise((resolve1, reject1) => { 
                for (let i in idObj) {
                    globalID = i;
                    tempIsbnArray = [];
                    for (let j in keyValue) {
                        if (keyValue[j][0] == i) {
                            tempIsbnArray.push(keyValue[j][1]);
                        }
                    }
                            

                    dbUpdate.then((count) => {
                        cnt += count;
                        resolve1(cnt);
                    });
                }
                        
            });


            pre1.then((finalCount) => { 
                if (finalCount == Object.keys(idObj).length) {
                    resolve(true);
                } else { 
                    return reject(false);
                }
            });

                   
        }
        
    });  
}





//Function to remove book and user data
function removeData(type, dataArray) {
    return new Promise(function (resolve, reject) { 
        const model = { "book": Book, "user": User, "transaction": Transaction };

        mongoose.connect(uri).then(
            () => { 
                model[type].deleteMany({ isbn: { $in: dataArray } }, function (err, ack) { 
                    if (err) {
                        resolve(false);
                    } else { 
                        if (ack['deletedCount'] == dataArray.length) {
                            resolve(true);
                        } else { 
                            resolve(false);
                        }
                    }
                });
            },
            err => { 
                console.log("DB connection error!");
                resolve(false)
            }
        );
    });
}

//Function to get all book data
function getAllDetails(type, page) {
    return new Promise(function (resolve, reject) {
        const model = { "book": Book, "user": User, "transaction": Transaction };
        mongoose.connect(uri).then(
            () => { 
                model[type].estimatedDocumentCount(function (err, count) { 
                    if (err) {
                        return reject(false);
                    } else { 
                        model[type].find({}, {}, { skip: (page - 1) * pageOffset, limit: pageOffset }, function (err1, data) { 
                            if (err1) {
                                return reject(false);
                            } else {
                                if (type == "book") {
                                    data = getYearFromDateTime(data);
                                }
                                resolve([count, data]);

                            }
                        });
                    }
                });
            },
            err => { 
                console.log("DB connection error!");
                return reject(false);
            }
        );
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
                res.redirect('/dashboard');
            }).catch(err2 => console.log(err2));
            
        }).catch(err => console.log(err));
    } else if (req.cookies['Staff'] != undefined) {
        res.redirect('/staff');
    }else if (req.cookies['Admin'] != undefined) {
        res.redirect('/admin');
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
                res.redirect('/dashboard');
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
    var bpErr = { 'libErr': '', 'passignUpErrors': '' };
    if (Object.keys(validationResult(req)['errors']).length != 0) {
        bpErr['libErr'] = validationResult(req)['errors'][0]['msg'];
        res.render('login', { lUserErr: bpErr['libErr'], lPassErr: bpErr['passignUpErrors'] });
    }
    else {
        checkUserExisits(req.body.library_id, req.body.password).then(function (status) {
            if (status[0]) {
                res.cookie(status[1], req.body.library_id.toString());
                if (status[1] == 'Student') {
                    res.redirect('/dashboard/borrowBooks');
                } else if (status[1] == 'Staff') {
                    res.redirect('/staff/pendingBooks');
                } else {
                    res.redirect('/admin/bookData');
                }
            } else { 
                bpErr['passignUpErrors'] = "Library-Id or Password mismatch";
                res.render('login', { lUserErr: bpErr['libErr'], lPassErr: bpErr['passignUpErrors'] });
            }
        }).catch(err3 => console.log(err3));
    }
});

// Validating and processing the signup form 
app.post("/signUp", validateSignUpConfig, function (req, res) {
    const filteredSignUpData = validationResult(req)['errors'];
    var signUpErrors = { 'fname': '', 'lname': '', 'email': '', 'pass': '', 'roll': '', 'uniqueNum': ''};
    let admin_chk = true;
    if ((Object.keys(filteredSignUpData).length == 1 && filteredSignUpData[0]['param'] == 'roll_no') || Object.keys(filteredSignUpData).length == 0) {
        var userData = req.body;
        const date = new Date();
        const dobTemp = new Date(userData['date_of_birth']);
        const salt = bcrypt.genSaltSync(10);
        const hpass = bcrypt.hashSync(userData['password'], salt);
        userData['password'] = hpass;
        userData['created'] = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        userData['date_of_birth'] = dobTemp.getFullYear() + "-" + (dobTemp.getMonth() + 1) + "-" + dobTemp.getDate();
        delete userData['reg_btn'];

        if (userData['user_type'] == "Admin") { 
            console.log(userData['admin_password']);
            admin_chk = bcrypt.compareSync(userData['admin_password'], process.env.admin);
        }

        if (admin_chk) {
            createNewUser(userData).then(function (status) {
                if (status) {
                    res.cookie(req.body.user_type, status['library_id']);
                    if (req.body.user_type == 'Student') {
                        res.redirect('/dashboard/borrowBooks');
                    } else if (req.body.user_type == 'Staff') {
                        res.redirect('/staff/pendingBooks');
                    } else {
                        res.redirect('/admin/bookData');
                    }
                } else {
                    res.redirect('/signup');
                }
            }).catch(err => console.log(err));
        } else { 
            signUpErrors['roll'] = "Enter a valid admin password";
            res.render('signUp', { fname: signUpErrors['fname'], lname: signUpErrors['lname'], email: signUpErrors['email'], pass: signUpErrors['pass'], roll: signUpErrors['roll'], uniqueNum: signUpErrors['uniqueNum'] });
        }
        
      
    } else {
        for (let err in filteredSignUpData) {

            switch (filteredSignUpData[err]['param']) {
                case 'first_name':
                    signUpErrors['fname'] = filteredSignUpData[err]['msg'];
                    break;
                case 'last_name':
                    signUpErrors['lname'] = filteredSignUpData[err]['msg'];
                    break;
                case 'email':
                    signUpErrors['email'] = filteredSignUpData[err]['msg'];
                    break;
                case 'roll_no':
                    signUpErrors['roll'] = filteredSignUpData[err]['msg'];
                    break;
                case 'password':
                    signUpErrors['pass'] = filteredSignUpData[err]['msg'];
                    break;
                case 'unique_number':
                    signUpErrors['uniqueNum'] = filteredSignUpData[err]['msg'];
                    break;
            }
        }
        res.render('signUp', { fname: signUpErrors['fname'], lname: signUpErrors['lname'], email: signUpErrors['email'], pass: signUpErrors['pass'], roll: signUpErrors['roll'], uniqueNum: signUpErrors['uniqueNum'] });
    }
});


app.get("/dashboard/borrowBooks", nocache, function (req, res) { 
    if (req.cookies['Student']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);
        searchDB(defSearchConfig[0]['searchBarText'], defSearchConfig[0]['searchTag'], page).then(function (bookData) {
            let tot_count = bookData[1].length == 0 ? [1, page] : [Math.ceil(bookData[0] / pageOffset), page];
            if (page > tot_count[0]  && tot_count[0] > 0) {
                res.redirect('/dashboard/borrowBooks?page=' + tot_count[0]);
            } else {
                res.render('dashboard-borrow', { searchData: bookData[1], searchConfig: defSearchConfig, tot_count: tot_count, noOfSearchResults: bookData[0] });
            }
        }).catch(err => console.log(err));
    } else { 
        res.redirect('/login');
    }
});

// Processing the search from dashboard page to server and back
app.post("/dashboard/borrowBooks", validateSearchConfig, function (req, res) {
    let page = req.query.page == undefined ? 1 : Number(req.query.page);
    searchDB(req.body.searchBar, req.body.searchFactor, page).then(function (searchResults) {
        let tot_count = searchResults[1].length == 0 ? [1, page] : [Math.ceil(searchResults[0] / pageOffset), page];
        defSearchConfig[0]['searchTag'] = req.body.searchFactor;
        defSearchConfig[0]['searchBarText'] = req.body.searchBar;
        if (page > tot_count[0]  && tot_count[0] > 0) {
            res.redirect('/dashboard/borrowBooks?page=' + tot_count[0]);
        } else {
            res.render('dashboard-borrow', { searchData: searchResults[1], searchConfig: defSearchConfig, tot_count: tot_count, noOfSearchResults: searchResults[0] });
        }
    }).catch(errDB => console.log(errDB));       
});


app.get("/dashboard/pendingBooks", nocache, function (req, res) { 
    if (req.cookies['Student']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);
        getUserBookData(req.cookies['Student'], 2, page).then(function (currBookData) {
            defCurrBorrowedBooks = currBookData[0]  !=  0 ? currBookData[1] : {};
            let tot_count = defCurrBorrowedBooks.length == 0 ? [1, page] : [Math.ceil(currBookData[0] / pageOffset), page];
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
        getUserBookData(req.cookies['Student'], 3, page).then(function (prevBookData) {
            let tot_count = prevBookData[0] == 0 ? [1, page] : [Math.ceil(prevBookData[0] / pageOffset), page];
            if (page > tot_count[0] && tot_count[0] > 0) {
                res.redirect('/dashboard/borrowedBooks?page=1');
            } else { 
                res.render('dashboard-borrowed', { prevBooksData: prevBookData[1], tot_count: tot_count });
            }     
        }).catch(err => console.log(err));
    } else { 
        res.redirect('/login');
    }
});


//Selecting and update the no of copies
app.post("/dashboard/confirmBooks", nocache, function (req, res) {
    if (req.body['booksSelected']) {
        updateCopies(req.body['booksSelected'].split(" "), 0).then(function (status) {
            if (status) {
                getBookData(req.body['booksSelected'].split(" ")).then(function (bookData) {
                    if (bookData) {
                        updateTransaction(req.cookies['Student'], 0, req.body['booksSelected'].split(" "), [], 0).then(function (stat) {
                            if (stat) {
                                res.render('confirmBooks', { borrowedBookData: bookData });
                            } else { 
                                res.redirect('/dashboard/borowBooks');
                            }
                        }).catch(err4 => console.log("err4"));
                    }
                }).catch(errT => console.log("errT"));
            } else { 
                res.redirect('/dashboard/borowBooks');
            }
        }).catch(errSQ => console.log("err2"));
    } else { 
        res.redirect('/dashboard')
    }
});










app.get("/staff/pendingBooks", nocache, function (req, res) { 
    if (req.cookies['Staff']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);
        getUserBookData(0, 2, page).then(function (pendingBooksData) {

            defPendingBooks = pendingBooksData[0] == 0 ? {} : pendingBooksData[1];
            let tot_count = defPendingBooks.length == 0 ? [1, page] : [Math.ceil(pendingBooksData[0] / pageOffset), page];
            let toggle = req.query == {} ? "none" : req.query['update'];

            if (page > tot_count[0] && tot_count[0] > 0) {
                res.redirect('/staff/pendingBooks?page=1');
            } else {
                res.render('staff-pending', { pendingBooks: defPendingBooks, tot_count: tot_count, toggleID: toggle });
            }
        }).catch(err1 => console.log(err1));
    }else { 
        res.redirect('/login');
    }
});

app.get("/staff/yetToBeBorrowedBooks", nocache, function (req, res) { 
    if (req.cookies['Staff']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);
        getUserBookData(0, 1, page).then(function (yBooksData) {
            defYetBorrowedBooks = yBooksData[0] == 0 ? {} : yBooksData[1];
            let tot_count = defYetBorrowedBooks.length == 0 ? [1, page] : [Math.ceil(yBooksData[0] / pageOffset), page];

            let toggle = req.query == {} ? "none" : req.query['update'];

            if (page > tot_count[0] && tot_count[0] > 0) {
                res.redirect('/staff/yetToBeBorrowedBooks?page=1');
            } else {
                res.render('staff-borrow', { yetBorrowedBooks: defYetBorrowedBooks, tot_count: tot_count, toggleID: toggle });
            }
        }).catch(err1 => console.log(err1));
    }else { 
        res.redirect('/login');
    }
});


//Processing yet to be borrowed books in staff
app.post("/processTransactions", function (req, res) {
    let tempData = req.body.transactionData.split(" ");
    let filteredTransactionData = [];
    let redirect = "/staff/yetToBeBorrowedBooks?update=";
    if (req.query.status == 2) { 
        redirect = "/staff/pendingBooks?update=";
    }
    for (let i in tempData) {
        filteredTransactionData.push(tempData[i].split(","));
    }
    updateTransaction(-1, req.query.status, [], filteredTransactionData, req.cookies['Staff']).then(function (stat) {
        if (stat) {
            res.redirect(redirect+"success");
        } else { 
            res.redirect(redirect+"failed");
        }
    }).catch(err => console.log(err));
});



app.get("/staff/addBook", nocache, function (req, res) { 
    if (req.cookies['Staff']) {
        res.render('staff-addBook', {conn_err: "", addBookErrors: defAddBookErrors});
    } else { 
        res.redirect('login');
    }
});



//Adding new book in staff
app.post("/staff/addBook", validateAddNewBookConfig, function (req, res) { 
    var errors = validationResult(req);
    var addBookErrors = [];
    if (Object.keys(errors['errors']).length > 0) {
        for (let i in errors['errors']) {
            addBookErrors[errors['errors'][i]['param']] = errors['errors'][i]['msg'];
        }
        res.render('staff-addBook', { addBookErrors: addBookErrors, conn_err: "" });
    } else { 
        addNewBook({ "name": req.body.bname, "author": req.body.author, "publication_date": req.body.year, "genre": req.body.genre, "price": req.body.price, "noOfCopies": req.body.noOfCopies, "isbn": req.body.isbn } ).then(function (status) { 
            if (status) {
                res.render('staff-addBook', { conn_err: "*book added successfully", addBookErrors: {} });
            } else { 
                res.render('staff-addBook', { conn_err: "Database problem, Please try again after some time.", addBookErrors: {} });
            }
        });  
    }
});










app.get("/admin/bookData", nocache, function (req, res) { 
    if (req.cookies['Admin']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);

        getAllDetails("book", page).then(function (bookDetails) { 
            let defbookDetails = bookDetails[0] == 0 ? {} : bookDetails[1];
            let tot_count = Object.keys(defbookDetails).length == 0 ? [1, page] : [Math.ceil(bookDetails[0] / pageOffset), page];
            if (page > tot_count[0] && tot_count[0] > 0){
                res.redirect('/admin/bookData?page=1');
            } else {
                res.render('admin-bookData', { bookDetails: defbookDetails, tot_count: tot_count });
            }

        }).catch(err => console.log(err));
    } else { 
        res.redirect('/login');
    }
});

app.get("/admin/userData", nocache, function (req, res) { 
    if (req.cookies['Admin']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);

        getAllDetails("user", page).then(function (userDetails) {
            let defUserDetails = userDetails[0] == "NIL" ? {} : userDetails[1];
            let tot_count = defUserDetails.length == 0 ? [1, page] : [Math.ceil(userDetails[0] / pageOffset), page];

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



app.get("/admin/transactionData", nocache, function (req, res) { 
    if (req.cookies['Admin']) {
        let page = req.query.page == undefined ? 1 : Number(req.query.page);

        getAllDetails("transaction", page).then(function (transactions) {
            let deftransactionsDetails = transactions[0] == 0 ? {} : getDateFromDateTime(transactions[1]);
            let tot_count = deftransactionsDetails.length == 0 ? [1, page] : [Math.ceil(transactions[0] / pageOffset), page];

            res.render('admin-transaction', { deftransactionsDetails: deftransactionsDetails, tot_count: tot_count});
            
        }).catch(err => console.log(err));
    } else { 
        res.redirect('/login');
    }
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



//Removing user in admin dashboard
app.post('/removeData', function (req, res) {
    if (req.query.book) {
        removeData("book", req.body['isbn'].split(" ")).then(function (ack) {
            if (ack) {
                res.redirect('/admin/bookData?page=' + req.query.page + '&update=success');
            } else {
                res.redirect('/admin/bookData?page=' + req.query.page + '&update=falied');
            }
        });
    } else if (req.query.user) {
        removeData("user", req.body['libid'].split(" ")).then(function (ack) {
            if (ack) {
                res.redirect('/admin/userData?page=' + req.query.page + '&update=success');
            } else {
                res.redirect('/admin/userData?page=' + req.query.page + '&update=falied');
            }
        });
    } else { 
        // removeData("transaction", req.body['isbn'].split(" ")).then(function (ack) {
        //     if (ack) {
        //         res.redirect('/admin/bookData?page=' + req.query.page + '&update=success');
        //     } else {
        //         res.redirect('/admin/bookData?page=' + req.query.page + '&update=falied');
        //     }
        // });
    }
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























