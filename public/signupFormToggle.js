// student-admin-faculty functionality
document.getElementById("user").addEventListener("change", function(){
    let userType = document.getElementById("user").value;
    if (userType == "Staff" || userType == "Admin"){
        document.getElementById("rollStudent").style.display = "none";
        document.getElementById("dobAlign").classList.remove('col-md-6');
        document.getElementById("dobAlign").classList.add('col-md-12');
    }else{
        document.getElementById("rollStudent").style.display = "block";
        document.getElementById("dobAlign").classList.remove('col-md-12');
        document.getElementById("dobAlign").classList.add('col-md-6');
    }
});

if (window.location.href.endsWith('newUserSignUp')){
    document.getElementById('signup').scrollIntoView();
}

