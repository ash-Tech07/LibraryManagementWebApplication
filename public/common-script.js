window.onload = function () {
    if (screen.width <= 350) {
        document.getElementById("nav_brand").classList.remove("ms-3");
    }

    const toastLiveExample = document.getElementById('liveToast');
    if (toastLiveExample && window.location.href.endsWith("success") || window.location.href.endsWith("failed")) {
        const toast = new bootstrap.Toast(toastLiveExample);
        toast.show();
    }
}

window.onresize = function () {
    if (screen.width <= 350) {
        document.getElementById("nav_brand").classList.remove("ms-3");
    } else { 
        document.getElementById("nav_brand").classList.add("ms-3");
    }
}

if (window.location.href.endsWith("signUp")) {
    document.getElementById("main-nav-link1").textContent = "LOG IN";
    document.getElementById("main-nav-link1").href = "/login";
    document.getElementById("main-nav-link2").textContent = "ABOUT";
    document.getElementById("main-nav-link2").href = "/about";

}
else if (window.location.href.endsWith("login")) {
    document.getElementById("main-nav-link1").textContent = "SIGN UP";
    document.getElementById("main-nav-link1").href = "/signUp";
    document.getElementById("main-nav-link2").textContent = "ABOUT";
    document.getElementById("main-nav-link2").href = "/about";
}
else if (window.location.href.includes("borrowBooks") && window.location.href.includes("dashboard")) {
    document.getElementById("main-nav-link1").textContent = "PENDING BOOKS";
    document.getElementById("main-nav-link1").href = "/dashboard/pendingBooks";
    document.getElementById("main-nav-link2").textContent = "PREVIOUSLY BORROWED BOOKS";
    document.getElementById("main-nav-link2").href = "/dashboard/borrowedBooks";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}
else if (window.location.href.includes("pendingBooks") && window.location.href.includes("dashboard")) {
    document.getElementById("main-nav-link1").textContent = "BORROW BOOKS";
    document.getElementById("main-nav-link1").href = "/dashboard/borrowBooks";
    document.getElementById("main-nav-link2").textContent = "PREVIOUSLY BORROWED BOOKS";
    document.getElementById("main-nav-link2").href = "/dashboard/borrowedBooks";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}
else if (window.location.href.includes("borrowedBooks") && window.location.href.includes("dashboard")) {
    document.getElementById("main-nav-link1").textContent = "BORROW BOOKS";
    document.getElementById("main-nav-link1").href = "/dashboard/borrowBooks";
    document.getElementById("main-nav-link2").textContent = "PENDING BOOKS";
    document.getElementById("main-nav-link2").href = "/dashboard/pendingBooks";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}

else if (window.location.href.includes("yetToBeBorrowedBooks") && window.location.href.includes("staff")) {
    document.getElementById("main-nav-link1").textContent = "PENDING BOOKS";
    document.getElementById("main-nav-link1").href = "/staff/pendingBooks";
    document.getElementById("main-nav-link2").textContent = "ADD BOOK";
    document.getElementById("main-nav-link2").href = "/staff/addBook";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}
else if (window.location.href.includes("pendingBooks") && window.location.href.includes("staff")) {
    document.getElementById("main-nav-link1").textContent = "YetToBeBorrowed BOOKS";
    document.getElementById("main-nav-link1").href = "/staff/yetToBeBorrowedBooks";
    document.getElementById("main-nav-link2").textContent = "ADD BOOK";
    document.getElementById("main-nav-link2").href = "/staff/addBook";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}
else if (window.location.href.includes("addBook") && window.location.href.includes("staff")) {
    document.getElementById("main-nav-link1").textContent = "PENDING BOOKS";
    document.getElementById("main-nav-link1").href = "/staff/pendingBooks";
    document.getElementById("main-nav-link2").textContent = "YetToBeBorrowed BOOKS";
    document.getElementById("main-nav-link2").href = "/staff/yetToBeBorrowedBooks";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}
else if (window.location.href.includes("confirmBooks")) {
    document.getElementById("main-nav-link1").textContent = "DASHBOARD";
    document.getElementById("main-nav-link1").href = "/dashboard/borrowBooks";
    document.getElementById("main-nav-link2").textContent = "LOG OUT";
    document.getElementById("main-nav-link2").href = "/logout";
}
else if (window.location.href.includes("bookData") && window.location.href.includes("admin")) {
    document.getElementById("main-nav-link1").textContent = "USER DATA";
    document.getElementById("main-nav-link1").href = "/admin/userData";
    document.getElementById("main-nav-link2").textContent = "TRANSACTION DATA";
    document.getElementById("main-nav-link2").href = "/admin/transactionData";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}
else if (window.location.href.includes("userData") && window.location.href.includes("admin")) {
    document.getElementById("main-nav-link1").textContent = "BOOKS DATA";
    document.getElementById("main-nav-link1").href = "/admin/bookData";
    document.getElementById("main-nav-link2").textContent = "TRANSACTION DATA";
    document.getElementById("main-nav-link2").href = "/admin/transactionData";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";

}
else if (window.location.href.includes("transactionData") && window.location.href.includes("admin")){
    document.getElementById("main-nav-link1").textContent = "BOOKS DATA";
    document.getElementById("main-nav-link1").href = "/admin/bookData";
    document.getElementById("main-nav-link2").textContent = "USER DATA";
    document.getElementById("main-nav-link2").href = "/admin/userData";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}