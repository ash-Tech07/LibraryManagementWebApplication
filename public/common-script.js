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