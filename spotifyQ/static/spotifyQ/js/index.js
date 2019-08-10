const pin = document.getElementById("pin-box");


function shakePINBox() {
    pin.style.borderColor = 'red';

    document.querySelector(".anim").className = "anim";
    window.requestAnimationFrame(function (time) {
        window.requestAnimationFrame(function (time) {
            document.querySelector(".anim").className = "anim changing";
        });
    });
}

function wrongPIN() {
    if (document.getElementById('invalid') == null) {
        let divElement = document.createElement('div');
        let spanElement = document.createElement('span');
        divElement.appendChild(spanElement);
        divElement.id = "invalid";
        spanElement.style.fontSize = '12px';
        spanElement.style.color = 'red';
        spanElement.innerText = 'Please provide a valid PIN.';
        pin.insertAdjacentElement('afterend', divElement);
    }
    shakePINBox();
}

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

let csrftoken = getCookie('csrftoken');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});

$("#pin-form").submit(function (event) {
    event.preventDefault();
    if (pin.value !== "") {
        const url = 'http://127.0.0.1:8000/verify/';
        var data = `pin=${pin.value.toUpperCase()}`;

        $.ajax({
            type: "POST",
            url: url,
            data: data,
            success: success,
            error: wrongPIN,
            dataType: 'json'
        })

    } else {
        wrongPIN();
    }
});

function success(d) {
    document.getElementById("pin-form").submit();
}