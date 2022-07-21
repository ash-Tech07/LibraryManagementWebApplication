var valArr = [];
var noOfBtnSelected = 0;

function processPendingBooks(btn, inpId) { 

    //toggling active class and counting no of selected books
    if (btn.classList.contains("active")) {
        btn.classList.remove("active");
        noOfBtnSelected -= 1;
        for (let i = 0; i < valArr.length; i++) {
            if (valArr[i] == btn.parentElement.parentElement.id) {
                valArr.splice(i, 1);
            }
        }
    } else { 
        btn.classList.add("active");
        noOfBtnSelected += 1;
        valArr.push(btn.parentElement.parentElement.id);
    }

    //setting the value of selected books to form input
    document.getElementById(inpId).value = valArr.join(",");

    //Toggling the disablity of submit btn
    if (noOfBtnSelected >= 1) {
        document.getElementById("pendSubBtn").classList.remove("disabled");
    } else {
        document.getElementById("pendSubBtn").classList.add("disabled");
    }
    
}