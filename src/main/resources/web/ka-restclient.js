//
var restc = (function($) {
    console.log("REST Client Module (jQuery based) Loaded")
    
    function value_sort_asc(a, b) {
        var nameA = a.value
        var nameB = b.value
        //
        if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string descending
          return 1
        if (nameA.toLowerCase() < nameB.toLowerCase())
          return -1
        return 0 //default return value (no sorting)
    }

    var restc = {}
    
    restc.do_geocode = function(streetValue, callback) {
        $.ajax({
            type: "GET", url: "/website/geocode?query=" + streetValue,
            success: function(obj) {
                callback(obj)
            },
            error: function(x, s, e) {
                callback(e)
            }
        })
    }

    restc.load_current_angebotsinfos = function(callback) {
        $.getJSON('/angebote/locations', function(results) {
                callback(results)
            }
        )
    }

    restc.load_district_topics = function(callback) {
        $.getJSON('/website/bezirk', function(results) {
                results.sort(value_sort_asc)
                callback(results)
            }
        )
    }
    
    restc.load_geo_object_detail = function(geo_object_id, callback) {
        $.getJSON('/website/topic/' + geo_object_id, function (geo_object) {
                if (geo_object) {
                    callback(geo_object)
                } else {
                    console.warn("Error while loading details for geo object", result_list[i])
                }
            }
        )
    }

    // --- Methods for Authentication

    restc.logout = function() {
        $.post('/accesscontrol/logout', function(username) {
            if (!username) kiezatlas.render_user_menu(false)
        })
    }

    restc.is_logged_in = function(callback) {
        $.get('/accesscontrol/user', function(username) {
            if (username) {
                if (username.length > 0) {
                    callback(true)
                    return
                }
            }
            callback(false)
        })
    }

    /* Cookie Methods copied from quirksmode.org (http://www.quirksmode.org/js/cookies.html) */
    restc.create_cookie = function(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
    }

    restc.read_cookie = function(name) {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for(var i=0;i < ca.length;i++) {
                    var c = ca[i];
                    while (c.charAt(0)==' ') c = c.substring(1,c.length);
                    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
            }
            return null;
    }

    restc.erase_cookie = function(name) {
            restc.create_cookie(name,"",-1);
    }

    return restc

}($))
