var pendValArr = [];
var noOfPendBtnSelected = 0;

var yetBorrowValArr = [];
var noOfYetBorrowBtnSelected = 0;


//Pending Books processing
function processPendingBooks(btn, inpId) { 

    //toggling active class and counting no of selected books
    if (btn.classList.contains("active")) {
        btn.classList.remove("active");
        noOfPendBtnSelected -= 1;
        for (let i = 0; i < pendValArr.length; i++) {
            if (pendValArr[i] == btn.parentElement.parentElement.id) {
                pendValArr.splice(i, 1);
            }
        }
    } else { 
        btn.classList.add("active");
        noOfPendBtnSelected += 1;
        pendValArr.push(btn.parentElement.parentElement.id);
    }

    //setting the value of selected books to form input
    document.getElementById(inpId).value = pendValArr.join(" ");

    //Toggling the disablity of submit btn
    if (noOfPendBtnSelected >= 1) {
        document.getElementById("pendSubBtn").classList.add("enable");
    } else {
        document.getElementById("pendSubBtn").classList.remove("enable");
    }
    
}


//Yet to be Borrowed Books Processing
function processYetBorrowedBooks(btn, inpId) {

    //toggling active class and counting no of selected books
    if (btn.classList.contains("active")) {
        btn.classList.remove("active");
        noOfYetBorrowBtnSelected -= 1;
        for (let i = 0; i < yetBorrowValArr.length; i++) {
            if (yetBorrowValArr[i] == btn.parentElement.parentElement.id) {
                yetBorrowValArr.splice(i, 1);
            }
        }
    } else {
        btn.classList.add("active");
        noOfYetBorrowBtnSelected += 1;
        yetBorrowValArr.push(btn.parentElement.parentElement.id);
    }

    //setting the value of selected books to form input
    document.getElementById(inpId).value = yetBorrowValArr.join(" ");

    //Toggling the disablity of submit btn
    if (noOfYetBorrowBtnSelected >= 1) {
        document.getElementById("yetBorrowSubBtn").classList.add("enable");
    } else {
        document.getElementById("yetBorrowSubBtn").classList.remove("enable");
    }

}

