
/** --- ka-restclient.js --- **/

var karestc = (function($) {

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

    restc.create_location_string = function(location) {
        return location.lng.toFixed(4) + ', '+location.lat.toFixed(4)
    }

    restc.get_places_nearby = function(location, radius, callback) {
        var locationString = restc.create_location_string(location)
        var radius_value = radius
        if (!radius) radius_value = 750 // meter
        $.getJSON('/website/search/'+encodeURIComponent(locationString)+'/' + (radius_value / 1000), callback)
    }

    restc.do_reverse_geocode = function(leafletMap, _self, callback) {
        $.getJSON('/website/reverse-geocode/' + leafletMap.get_current_location_lat()
                + ',' + leafletMap.get_current_location_lng(), function (geo_names) {
            if (_self) _self.hide_spinning_wheel(true)
            if (geo_names.results.length > 0) {
                var first_result = geo_names.results[0]
                var components = first_result.address_components
                var object = { coordinates : "" + leafletMap.get_current_location_lat() + "," + leafletMap.get_current_location_lng() }
                for (var i in components) {
                    var el = components[i]
                    if (el.types[0] === "route") {
                        if (typeof el.long_name !== "undefined") object.street = el.long_name
                    } else if (el.types[0] === "sublocality_level_1") {
                        if (typeof el.long_name !== "undefined" && el.long_name) object.district = el.long_name.replace("Bezirk ", "")
                    } else if (el.types[0] === "street_number" ) {
                        if (typeof el.long_name !== "undefined" && el.long_name) object.street_nr = el.long_name
                    } else if (el.types[0] === "locality") {
                        if (typeof el.long_name !== "undefined" && el.long_name) object.city = el.long_name
                    } else if (el.types[0] === "postal_code") {
                        if (typeof el.long_name !== "undefined" && el.long_name) object.postal_code= el.long_name
                    }
                }
                // console.log("Reverse Geo Code, Street: " + o.street + " Hausnr: " + o.street_nr + " City: " + o.city + " PLZ: " + o.postal_code)
                var location_name  = object.street + " "
                // Append street nr to street name
                if (object.street_nr) location_name += object.street_nr + ", "
                // Append name of District OR (if unknown) City
                if (object.district) {
                    location_name += " " + object.district
                } else if (object.city) {
                    location_name += " " + object.city
                }
                leafletMap.set_current_location_name(location_name)
                if (_self) _self.render_current_location_label()
                if (callback) callback(object)
            }
        })
    }

    restc.load_current_angebotsinfos = function(callback) {
        $.getJSON('/angebote/locations', function(results) {
            callback(results)
        })
    }

    restc.load_related_angebotsinfos = function(geoObjectId, callback) {
        $.getJSON('/angebote/list/assignments/geo/' + geoObjectId, function(results) {
            callback(results)
        })
    }

    restc.load_view_permissions = function(callback) {
        $.getJSON('/website/menu', function(results) {
            callback(results)
        })
    }

    restc.load_angebotsinfo = function(id, callback) {
        $.getJSON('/angebote/' + id + "/json", function(result) {
            callback(result)
        })
    }

    restc.load_districts = function(callback) {
        $.getJSON('/website/bezirk', function(results) {
            results.sort(value_sort_asc)
            callback(results)
        })
    }

    restc.load_search_keywords = function(query, callback) {
        var resource = '/website/search-keywords'
        if (query) {
            resource += '?query=' + query
        }
        $.getJSON(resource, function(results) {
            // results.sort(value_sort_asc)
            callback(results)
        })
    }

    restc.load_district_topics = function(id, callback) {
        if (id && !isNaN(id)) {
            $.getJSON('/website/bezirk/' + id, function(results) {
                callback(results)
            })
        } else {
            callback("No district ID given, skipping request id=", id)
        }
    }

    restc.load_district_regions = function(id, callback) {
        if (id && !isNaN(id)) {
            $.getJSON('/website/bezirk/' + id + '/bezirksregionen', function(results) {
                callback(results)
            })
        } else {
            callback("No district ID given, skipping request id=", id)
        }
    }

    restc.load_website_geoobjects = function(siteId, callback) {
        $.getJSON('/website/' + siteId + '/geo', function(results) {
            callback(results)
        })
    }

    restc.load_geo_objects_by_category = function(citymapId, catId, callback) {
        $.getJSON('/website/' + citymapId + '/geo/' + catId, function(results) {
            if (callback) callback(results)
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
                // console.log("Successfully deleted geo-website assignment")
                callback({ state : "ok" })
            },
            error: function(x, s, e) {
                callback({ state : "error", detail: e })
                console.warn("Deleting geo-website assignment failed", x,s,e)
            }
        })
    }

    restc.create_website_assignment = function(geoId, siteId, callback) {
        $.ajax({
            type: "POST", url: "/site/" + geoId + "/" + siteId,
            success: function() {
                // console.log("Successfully created a geo-website assignment")
                callback({ state : "ok" })
            },
            error: function(x, s, e) {
                callback({ state : "error", detail: e })
                console.warn("Deleting geo-website assignment failed", x,s,e)
            }
        })
    }

    restc.create_user_assignment = function(topicId, userId, callback) {
        $.ajax({
            type: "POST", url: "/website/assign/" + topicId + "/" + userId,
            success: function() {
                console.log("Successfully created a kiezatlas topic-user assignment")
                callback({ state : "ok" })
            },
            error: function(x, s, e) {
                callback({ state : "error", detail: e })
                console.log("Creating a kiezatlas topic-user assignment failed", x,s,e)
            }
        })
    }

    restc.delete_user_assignment = function(topicId, userId, callback) {
        $.ajax({
            type: "DELETE", url: "/website/assign/" + topicId + "/" + userId,
            success: function() {
                console.log("Successfully deleted kiezatlas topic-user assignment")
                callback({ state : "ok" })
            },
            error: function(x, s, e) {
                callback({ state : "error", detail: e })
                console.log("Deleting kiezatlas topic-user assignment failed", x,s,e)
            }
        })
    }

    restc.create_comment = function(topicId, topicUri, message, contact, callback) {
        // 1.) ### Authorize UI,
        // 2.) Then post comment
        $.ajax({
            type: "POST", url: "/website/comment/" + topicId + '/' + topicUri + '/' + message + '/' + contact ,
            success: function() {
                console.log("Successfully created a kiezatlas topic-user assignment")
                callback({ state : "ok" })
            },
            error: function(x, s, e) {
                callback({ state : "error", detail: e })
                console.log("Creating a kiezatlas topic-user assignment failed", x,s,e)
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
