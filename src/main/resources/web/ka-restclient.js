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
        })
    }

    restc.load_districts = function(callback) {
        $.getJSON('/website/bezirk', function(results) {
            results.sort(value_sort_asc)
            callback(results)
        })
    }

    restc.load_district_topics = function(id, callback) {
        $.getJSON('/website/bezirk/' + id, function(results) {
            callback(results)
        })
    }

    restc.load_website_geoobjects = function(siteId, callback) {
        $.getJSON('/website/' + siteId + '/geo', function(results) {
            callback(results)
        })
    }

    restc.load_website_info = function(pageAlias, callback) {
        $.getJSON('/website/info/' + pageAlias, function(results) {
            callback(results)
        })
    }

    restc.load_topics_by_type = function(typeUri, callback) {
        $.getJSON('/core/topic/by_type/' + typeUri, function(results) {
            callback(results)
        })
    }

    restc.load_website_facets = function(siteId, callback) {
        $.getJSON('/site/' + siteId + '/facets/typedefs', function(results) {
            callback(results)
        })
    }

    restc.load_websites = function(callback) {
        $.getJSON('/website/sites/json', function(results) {
            callback(results)
        })
    }

    restc.remove_website_assignment = function(geoId, siteId, callback) {
        $.ajax({
            type: "DELETE", url: "/site/" + geoId + "/" + siteId,
            success: function() {
                console.log("Successfully deleted geo-website assignment")
                callback({ state : "ok" })
            },
            error: function(x, s, e) {
                callback({ state : "error", detail: e })
                console.log("Deleting geo-website assignment failed", x,s,e)
            }
        })
    }

    restc.create_website_assignment = function(geoId, siteId, callback) {
        $.ajax({
            type: "POST", url: "/site/" + geoId + "/" + siteId,
            success: function() {
                console.log("Successfully created a geo-website assignment")
                callback({ state : "ok" })
            },
            error: function(x, s, e) {
                callback({ state : "error", detail: e })
                console.log("Deleting geo-website assignment failed", x,s,e)
            }
        })
    }

    restc.update_facets = function(geoId, siteId, tm, callback) {
        $.ajax({
            type: "PUT", url: "/website/edit/" + siteId + "/facets/" + geoId,
            data: JSON.stringify(tm),
            contentType : 'application/json',
            success: function() {
                console.log("Successfully updated geo-objects site facets")
                callback({ state : "ok" })
            },
            error: function(x, s, e) {
                callback({ state : "error", detail: e })
                console.log("Updating geo-website site facets failed", x,s,e)
            }
        })
    }

    restc.load_news_items = function(id, callback) {
        $.getJSON('/website/newsfeed/' + id, function(results) {
            callback(results)
        })
    }

    restc.load_facetted_geo_object = function(topic_id, site_id, callback) {
        $.getJSON('/website/geo/' + topic_id + '/facetted/' + site_id, function (geo_object) {
            if (geo_object) {
                callback(geo_object)
            } else {
                console.warn("Error while loading details for core topic ", geo_object)
            }
        })
    }

    restc.load_geo_object_detail = function(geo_object_id, callback) {
        $.getJSON('/website/geo/' + geo_object_id, function (geo_object) {
            if (geo_object) {
                callback(geo_object)
            } else {
                console.warn("Error while loading details for geo object", geo_object)
            }
        })
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
