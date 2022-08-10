
var noOfBooksSelected = 0;
var booksSelected = [];

function dropDownTextToggle(txt) { 
    document.getElementById("dropdownText").textContent = txt;
    document.getElementById("disabledSearchFactor").value = txt;
}

function addBook(id) { 
    if (document.getElementById(id).classList.contains("active")) {
        document.getElementById(id).classList.remove("active");
        noOfBooksSelected -= 1;
        for (let i = 0; i < booksSelected.length; i++) { 
            if (booksSelected[i] == id) { 
                booksSelected.splice(i, 1);
                let tableRef = document.getElementById("selectedTable");
                tableRef.deleteRow(i+1);
                i--;
            }
        }    
    } else { 
        document.getElementById(id).classList.add("active");
        noOfBooksSelected += 1;
        booksSelected.push(id);
        let tableRef = document.getElementById("selectedTableBody");
        let newRow = tableRef.insertRow();
        let newName = newRow.insertCell(0);
        let newAuth = newRow.insertCell(1);
        let newYear = newRow.insertCell(2);
        let newGenre = newRow.insertCell(3);
        let newNPrice = newRow.insertCell(4);
        let newewIsbn = newRow.insertCell(5);
        let row = document.getElementById(id + "A");
        let name = document.createTextNode(row.getElementsByTagName("td")[1].innerText);
        let auth = document.createTextNode(row.getElementsByTagName("td")[2].innerText);
        let year = document.createTextNode(row.getElementsByTagName("td")[3].innerText);
        let genre = document.createTextNode(row.getElementsByTagName("td")[4].innerText);
        let price = document.createTextNode(row.getElementsByTagName("td")[5].innerText);
        let isbn = document.createTextNode(row.getElementsByTagName("td")[6].innerText);
        newName.appendChild(name);
        newAuth.appendChild(auth);
        newYear.appendChild(year);
        newGenre.appendChild(genre);
        newNPrice.appendChild(price);
        newewIsbn.appendChild(isbn);
    }
    if (noOfBooksSelected >= 1) {
        document.getElementById("lend_btn").style.display = "block";
        document.getElementById("selectedBooksHeading").style.display = "block";
        document.getElementById("selectedTable").style.display = "table";

    } else { 
        document.getElementById("lend_btn").style.display = "none";
        document.getElementById("selectedBooksHeading").style.display = "none";
        document.getElementById("selectedTable").style.display = "none";

    }
    document.getElementById("booksSelectedInp").value = booksSelected.join(" ");
}


document.getElementById("bookLend").onsubmit = function (form) { 
    form.preventDefault();
    if (confirm("Are you sure to lend the selected books?")) { 
        this.submit();
    }
}







