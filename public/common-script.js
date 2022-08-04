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
    document.getElementById("main-nav-link").textContent = "LOG IN";
    document.getElementById("main-nav-link").href = "/login";
    document.getElementById("custom-style-sheet").setAttribute("href", "css/signup-styles.css");

} else if (window.location.href.endsWith("login")) {
    document.getElementById("main-nav-link").textContent = "SIGN UP";
    document.getElementById("main-nav-link").href = "/signUp";
    document.getElementById("custom-style-sheet").setAttribute("href", "css/login-styles.css");
} else { 
    document.getElementById("main-nav-link").textContent = "LOG OUT";
    document.getElementById("main-nav-link").href = "/logout";
}