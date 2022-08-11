window.onload = function () {
    if (screen.width <= 350) {
        document.getElementById("nav_brand").classList.remove("ms-3");
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
    document.getElementById("main-nav-link").textContent = "SIGN UP";
    document.getElementById("main-nav-link").href = "/signUp";
    document.getElementById("main-nav-link2").textContent = "ABOUT";
    document.getElementById("main-nav-link2").href = "/about";
}
else if (window.location.href.includes("borrowBooks")) {
    document.getElementById("main-nav-link1").textContent = "PENDING BOOKS";
    document.getElementById("main-nav-link1").href = "/dashboard/pendingBooks";
    document.getElementById("main-nav-link2").textContent = "PREVIOUSLY BORROWED BOOKS";
    document.getElementById("main-nav-link2").href = "/dashboard/borrowedBooks";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}
else if (window.location.href.includes("pendingBooks")) {
    document.getElementById("main-nav-link1").textContent = "BORROW BOOKS";
    document.getElementById("main-nav-link1").href = "/dashboard/borrowBooks";
    document.getElementById("main-nav-link2").textContent = "PREVIOUSLY BORROWED BOOKS";
    document.getElementById("main-nav-link2").href = "/dashboard/borrowedBooks";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";
}
else if (window.location.href.includes("borrowedBooks")) {
    document.getElementById("main-nav-link1").textContent = "BORROW BOOKS";
    document.getElementById("main-nav-link1").href = "/dashboard/borrowBooks";
    document.getElementById("main-nav-link2").textContent = "PENDING BOOKS";
    document.getElementById("main-nav-link2").href = "/dashboard/pendingBooks";
    document.getElementById("main-nav-link3").textContent = "LOG OUT";
    document.getElementById("main-nav-link3").href = "/logout";

}