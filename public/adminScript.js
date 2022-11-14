let noOfBooksToRemove = 0;
let bookISBNValArray = [];

function addBooksToRemove(btn) {

    //toggling active class and counting no of selected books
    if (btn.classList.contains("active")) {
        btn.classList.remove("active");
        noOfBooksToRemove -= 1;
        for (let i = 0; i < bookISBNValArray.length; i++) {
            if (bookISBNValArray[i] == btn.parentElement.parentElement.id) {
                bookISBNValArray.splice(i, 1);
            }
        }
    } else {
        btn.classList.add("active");
        noOfBooksToRemove += 1;
        bookISBNValArray.push(btn.parentElement.parentElement.id);
    }

    //setting the value of selected books to form input
    document.getElementById("bookRemoveINP").value = bookISBNValArray.join(" ");

    //Toggling the disablity of submit btn
    if (noOfBooksToRemove >= 1) {
        document.getElementById("bookRemoveFormBTN").classList.add("enable");
    } else {
        document.getElementById("bookRemoveFormBTN").classList.remove("enable");
    }

}