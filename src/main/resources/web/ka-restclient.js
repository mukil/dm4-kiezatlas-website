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
    
    restc.load_district_topics = function(callback) {
        $.getJSON('/kiezatlas/bezirk', function(results) {
                results.sort(value_sort_asc)
                callback(results)
            }
        )
    }
    
    restc.load_geo_object_detail = function(geo_object_id, callback) {
        $.getJSON('/kiezatlas/topic/' + geo_object_id, function (geo_object) {
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

    return restc

}($))
