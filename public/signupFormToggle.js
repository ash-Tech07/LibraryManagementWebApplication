// student-admin-faculty functionality
document.getElementById("user").addEventListener("change", function(){
    let userType = document.getElementById("user").value;
    if (userType == "Staff"){
        document.getElementById("rollStudent").style.display = "none";
        document.getElementById("dobAlign").classList.remove('col-md-6');
        document.getElementById("dobAlign").classList.add('col-md-12');
        document.getElementById("roll").name = "roll_no";
        document.getElementById("roll").type = "text";
        document.getElementById("roll_label").value = "Roll No.";
    } else if (userType == "Admin") { 
        document.getElementById("rollStudent").style.display = "block";
        document.getElementById("roll").name = "admin_password";
        document.getElementById("roll").type = "password";
        document.getElementById("roll_label").textContent = "Admin Password";
        document.getElementById("dobAlign").classList.remove('col-md-12');
        document.getElementById("dobAlign").classList.add('col-md-6');
    } else {
        document.getElementById("roll").name = "roll_no";
        document.getElementById("roll_label").textContent = "Roll No.";
        document.getElementById("rollStudent").style.display = "block";
        document.getElementById("roll").type = "text";
        document.getElementById("dobAlign").classList.remove('col-md-12');
        document.getElementById("dobAlign").classList.add('col-md-6');
    }
});

if (window.location.href.endsWith('newUserSignUp')){
    document.getElementById('signup').scrollIntoView();
}

