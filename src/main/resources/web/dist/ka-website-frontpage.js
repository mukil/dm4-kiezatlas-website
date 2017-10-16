
/** --- ka-restclient.js --- **/

var restc = (function($) {

    jQuery.ajaxSetup({
        'cache': false
    })

    // console.log("REST Client Module (jQuery based) Loaded")
    
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


/** --- ka-map.js --- **/

var mapping = {
    "zoom_detail": 15,
    "zoom_street": 14,
    "zoom_kiez": 13,
    "zoom_district" : 12,
    "zoom_city": 11,
    "marker_radius_fixed": false,
    "marker_radius": 10,
    "marker_radius_selected": 15, // max
    "circle_search_radius": 750,
    "circle_search_control": undefined,
    "circle_query": true,
    "circle_locked": true,
    "current_location": { name: "Tucholskystraße, 10117 Berlin", coordinate: new L.latLng(52.524256, 13.392192) },
    "max_bounds": L.latLngBounds(L.latLng(52.234807, 12.976094), L.latLng(52.843370, 13.958482)),
    "marker_group": undefined,
    "control_group": L.featureGroup(),
    "do_cluster_marker" : false,
    "fit_bounds_padding": 30,
    "angebote_mode": false
}

var leafletMap = (function($, L) {

    var map = {}
    var items = []

    map.setup = function(elementId, mouseWheelZoom) {
        map.elementId = elementId
        // console.log("Set up Leaflet Map #"+ elementId + ", mouseWheelZoom", mouseWheelZoom)
        map.map = new L.Map(elementId, {
            dragging: true, touchZoom: true, scrollWheelZoom: false, doubleClickZoom: true,
            zoomControl: false, minZoom: 9, max_bounds: mapping.max_bounds
        })
        map.zoom = L.control.zoom({ position: "topright" })
        map.zoom.addTo(map.map)
        L.control.scale( { imperial: false, updateWhenIdle: true } ).addTo(map.map)
        L.tileLayer('https://api.tiles.mapbox.com/v4/kiezatlas.pd8lkp64/{z}/{x}/{y}.png?' // old style id="kiezatlas.map-feifsq6f"
            + 'access_token=pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6ImNpa3BndjU2ODAwYm53MGxzM3JtOXFmb2IifQ._PcBhOcfLYDD8RP3BS0U_g', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors,'
            + '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &#169; <a href="http://mapbox.com">Mapbox</a>',
            id: 'kiezatlas.m7222ia5'}).addTo(map.map)
        map.map.on('locationfound', map.on_browser_location_found)
        map.map.on('locationerror', map.on_browser_location_error) // ### just if user answers "never"
        map.map.on('dragend', map.on_map_drag_end)
        map.map.on('drag', map.on_map_drag)
        //
        mapping.control_group.addTo(map.map)
        map.map.setView(map.get_current_location_coords(), mapping.zoom_kiez)
        //
        map.map.on('zoomend', function(e) {
            if (mapping.marker_radius_fixed) return;
            if (map.map.getZoom() <= 12) {
                mapping.marker_radius = 7
                mapping.marker_radius_selected = 11
            } else if (map.map.getZoom() === 13) {
                mapping.marker_radius = 9
                mapping.marker_radius_selected = 13
            } else if (map.map.getZoom() === 14) {
                mapping.marker_radius = 11
                mapping.marker_radius_selected = 15
            } else if (map.map.getZoom() === 15) {
                mapping.marker_radius = 12
                mapping.marker_radius_selected = 17
            } else if (map.map.getZoom() >= 16) {
                mapping.marker_radius = 14
                mapping.marker_radius_selected = 19
            }
            map.update_geo_object_marker_radius()
            map.fire_zoom_end(e)
        })
    }

    map.fit_to_height = function(minus) {
        var value = window.innerHeight
        if (minus) value -= minus
        $('#' + map.elementId).height(value)
        map.map.invalidateSize()
    }

    map.set_zoom = function(obj) {
        map.map.setZoom(obj)
    }

    map.clear_marker = function() {
        // TODO revise this (returns straight for e.g. init via districts page)
        if (!mapping.marker_group) return;
        // clear complete marker group, e.g. for fulltext_search
        mapping.marker_group.eachLayer(function (marker){
            map.map.removeLayer(marker)
        })
        map.map.removeLayer(mapping.marker_group)
        mapping.marker_group = undefined
    }

    map.render_circle_search_control = function(fitBounds) {
        if (mapping.circle_search_control) {
            mapping.control_group.removeLayer(mapping.circle_search_control)
        }
        if (map.is_circle_query_active()) {
            mapping.circle_search_control = new L.CircleEditor(
                map.get_current_location_coords(), mapping.circle_search_radius, {
                color: colors.ka_gold, weight: 3, opacity: .4, extendedIconClass: "extend-icon-medium",
                className: "leaflet-search-control", clickable: false, zIndexOffset: 101, fillColor: colors.ka_gold
            })
            mapping.control_group.addLayer(mapping.circle_search_control)
            mapping.circle_search_control.on('edit', function(event) {
                var new_radius = event.target._mRadius
                map.set_current_location_coords(event.target._latlng)
                map.fire_circle_edit(new_radius)
            })
            if (fitBounds) {
                map.map.fitBounds(mapping.control_group.getBounds(), { padding: [30, 30] })
            }
            if (map.is_circle_control_fixed()) $('.leaflet-editing-icon').hide()
        }
    }

    map.remove_circle_search_control = function() {
        if (mapping.circle_search_control) {
            mapping.control_group.removeLayer(mapping.circle_search_control)
        }
    }
    
    map.render_geo_objects = function(set_view_to_bounds) {
        // Note: Here we decide to not render any duplicates
        var list_of_markers = []
        var identifierProp = "id"
        if (map.is_angebote_mode()) identifierProp = "location_id"
        // pre-process results
        var elements = map.get_items()
        for (var el in elements) {
            var geo_object = elements[el]
            if (geo_object === "null" || !geo_object) {
                console.warn("Skipping Geo Object View Model [" + el+ "]", geo_object)
            } else {
                // preventing circle marker duplicates (in result set, e.g. Angebotsinfos)
                if (!map.exist_marker_in_listing(geo_object, list_of_markers, identifierProp)) {
                    var geo_marker = map.create_geo_object_marker(geo_object)
                    if (geo_marker) {
                        list_of_markers.push(geo_marker)
                    }
                }
            }
        }
        // merge: maintain also all previously added markers
        if (mapping.marker_group) {
            mapping.marker_group.eachLayer(function (marker) {
                // preventing circle marker duplicates (during merge of result sets)
                if (!map.exist_marker_in_listing(marker.options, list_of_markers, identifierProp)) {
                    list_of_markers.push(marker)
                }
            })
        }
        // ### clear all pre-existing marker from map
        map.clear_marker()
        // build up: create new marker_group
        if (mapping.do_cluster_marker) {
            mapping.marker_group = L.markerClusterGroup({
                spiderfyOnMaxZoom: true, spiderfyDistanceMultiplier: 2, showCoverageOnHover: false, maxClusterRadius: 60
            })
            mapping.marker_group.addLayers(list_of_markers)
            mapping.marker_group.on('clusterclick', function(e) {
                console.log("Clusterclick", e)
                // map.select_geo_object_marker(e.target)
            })
        } else {
            mapping.marker_group = L.featureGroup(list_of_markers)
        }
        //
        for (var el in list_of_markers) {
            var geoMarker = list_of_markers[el]
             mapping.marker_group.addLayer(geoMarker)
        }
        map.map.addLayer(mapping.marker_group)
        if (set_view_to_bounds && list_of_markers.length > 0) {
            map.map.fitBounds(mapping.marker_group.getBounds(), { padding: [30, 30] } )
        }
    }

    /** Sets up an interactive leaflet circle marker for a "ka2.geo_object" */
    map.create_geo_object_marker = function(geo_object) {
        if (geo_object.hasOwnProperty("latitude")
            && geo_object.hasOwnProperty("longitude")) {
            console.log('creating geo object marker')
            // 0) pre-process: geo object has geo coordinate
            var result = geo_object
            // 1) pre-processing: do worldwide coordinate check & log
            if (geo_object.latitude > 90 || geo_object.longitude > 180 ||
                geo_object.latitude < -90 || geo_object.longitude < -180 ) {
                console.warn("Invalid WGS 84 coordinates spotted at", geo_object)
                return undefined
            }
            // 2) pre-processing: do berlin coordinate check & log
            if (geo_object.longitude < 10 || geo_object.latitude < 45 ||
                geo_object.longitude > 15 || geo_object.latitude > 55) {
                console.warn("WGS 84 coordinates do look strange in case of Berlin", geo_object)
                return undefined
            }
            // 3) pre-precossing: if topic is neither in a bezirks-citymap nor in a bezirksregion citymap
            if (geo_object["bezirksregion_uri"] === "" && geo_object["bezirk_uri"] === "") {
                console.warn("Invalid Geo Object - Missing Bezirksregion & Bezirk URI", geo_object["name"])
                return undefined
            }
            // 4) Create a circle marker
            var coordinate = L.latLng(result["latitude"], result["longitude"])
            var circle = L.circleMarker(coordinate, map.calculate_default_circle_options(result))
            circle.setRadius(mapping.marker_radius)
            circle.on('click', function(e) {
                map.select_geo_object_marker(e.target)
            })
            circle.on('mouseover', function(e) {
                circle.setRadius(mapping.marker_radius + 5)
                circle.setStyle(map.calculate_hover_circle_options())
                map.fire_marker_mouseover(e)
            })
            circle.on('mouseout', function(e) {
                if (e.target.options.className !== 'selected') {
                    circle.setRadius(mapping.marker_radius)
                    circle.setStyle(map.calculate_default_circle_options(result))
                }
                map.fire_marker_mouseout(e)
            })
            return circle
        } else {
            console.warn("Could not geo object marker caused by missing geo coordinates")
            return undefined
        }
    }

    map.update_geo_object_marker_radius = function() {
        if (mapping.marker_group) {
            mapping.marker_group.eachLayer(function (el) {
                var marker_id = el.options["id"]
                if (marker_id) {
                    el.setRadius(mapping.marker_radius)
                }
            })
        }
    }

    map.highlight_geo_object_marker_by_id = function(topicId, focusOnMap) {
        mapping.marker_group.eachLayer(function (el) {
            var marker_id = el.options["id"]
            if (marker_id == topicId) {
                if (!mapping.do_cluster_marker) {
                    el.setStyle(map.calculate_selected_circle_options())
                    el.bringToFront()
                    el.setRadius(mapping.marker_radius_selected)
                }
                if (focusOnMap) map.map.setView(el.getLatLng(), mapping.zoom_street)
            } else {
                var geo_object_view_model = {
                    "name": el.options.name, "bezirksregion_uri": el.options.bezirksregion_uri, "uri": el.options.uri,
                    "angebote_count": el.options.angebote_count, "angebots_id": el.options.angebots_id,
                    "id": marker_id, "address_id": el.options.address_id, location_id: el.options.location_id,
                    "address": el.options.address
                }
                el.setStyle(map.calculate_default_circle_options(geo_object_view_model))
                el.setRadius(mapping.marker_radius)
            }
        })
    }

    map.select_geo_object_marker = function(marker) {
        // apply default styles to all the rest
        mapping.marker_group.eachLayer(function (el) {
            var marker_id = el.options["id"]
            if (marker_id) {
                var geo_object_view_model = {
                    "name": el.options.name, "bezirksregion_uri": el.options.bezirksregion_uri, "uri": el.options.uri,
                    "angebote_count": el.options.angebote_count, "angebots_id": el.options.angebots_id,
                    "id": marker_id, "address_id": el.options.address_id, location_id: el.options.location_id,
                    "address": el.options.address
                }
                el.setStyle(map.calculate_default_circle_options(geo_object_view_model))
                el.setRadius(mapping.marker_radius)
            }
            dummyObject = el.options
        })
        // highlight selected marker
        marker.setStyle(map.calculate_selected_circle_options())
        marker.bringToFront()
        marker.setRadius(mapping.marker_radius_selected)
        if (marker.options.angebots_id) {
            map.fire_angebot_marker_select(marker)
        } else {
            // gather all items under selection
            var selected_geo_objects = map.find_all_geo_objects(marker.options['address_id'])
            // fire marker selection event
            map.fire_geo_marker_select(selected_geo_objects)
        }
    }

    /** TODO: Visually differentiate between geo object and angebot markers */
    map.calculate_default_circle_options = function(marker_topic) {
        // console.log("creating marker for ", marker_topic["name"], "with location_id", marker_topic["location_id"])
        var hasAngebote = (marker_topic["angebote_count"] > 0) ? true : false
        var angeboteDashArray = map.calculate_geo_object_dash_array(marker_topic)
        var angeboteId = (marker_topic.hasOwnProperty("angebots_id")) ? marker_topic["angebots_id"] : undefined
        return { // ### improve new colors for angebote rendering
            weight: (hasAngebote) ? 3 : 2, opacity: (hasAngebote) ? 1 : 0.6, fillColor: (hasAngebote) ? colors.ka_red : colors.bright_grey,
            fillOpacity: (hasAngebote) ? 0.6 : 0.2, lineCap: 'square', dashArray: angeboteDashArray,
            color : (hasAngebote) ? colors.ka_gold : colors.ka_red, title: marker_topic["name"],
            alt: "Markierung von " + marker_topic["name"], bezirk_uri: marker_topic["bezirk_uri"],
            uri: marker_topic["uri"], name: marker_topic["name"],// riseOnHover: true,
            bezirksregion_uri: marker_topic["bezirksregion_uri"], z_indexOffset: 1001, uri: marker_topic["uri"],
            angebote_count: marker_topic["angebote_count"], angebots_id: angeboteId, address: marker_topic["address"],
            id: marker_topic["id"], address_id: marker_topic["address_id"], location_id: marker_topic["location_id"]
        }
    }

    map.calculate_selected_circle_options = function() {
        return {
            color: colors.ka_gold, weight: 3, opacity: 1,
            fillColor: colors.ka_red, fillOpacity: 1, className: "selected"
        }
    }

    map.calculate_hover_circle_options = function() {
        return {
            color: colors.ka_gold, weight: 3, opacity: 1,
            fillColor: colors.ka_red, fillOpacity: 1, className: "hover"
        }
    }

    map.calculate_geo_object_dash_array = function(item) {
        var value = item["angebote_count"]
        if (value === 0) return [100]
        if (value === 1) return [2,75]
        if (value === 2) return [2,5, 2,70]
        if (value === 3) return [2,5, 2,5, 2,65]
        if (value === 4) return [2,5, 2,5, 2,5, 2,60]
        if (value === 5) return [2,5, 2,5, 2,5, 2,5, 2,55]
        if (value === 6) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,50]
        if (value === 7) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,45]
        if (value === 8) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,40]
        if (value === 9) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,40]
        if (value > 9) return [2,5]
    }

    map.is_initialized = function() {
        return (map.map) ? true : false
    }

    map.deactivate_circle_control = function() {
        mapping.circle_query = false
    }

    map.activate_circle_control = function() {
        mapping.circle_query = true
    }

    map.set_circle_control_fixed = function(val) {
        return mapping.circle_locked = val
    }

    map.is_circle_control_fixed = function() {
        return mapping.circle_locked
    }

    map.is_circle_query_active = function() {
        return mapping.circle_query
    }

    map.set_angebote_mode = function(val) {
        mapping.angebote_mode = val
    }

    map.is_angebote_mode = function() {
        return mapping.angebote_mode
    }

    map.scroll_into_view = function(custom_anchor) {
        if (custom_anchor) { // but maybe alter anchor name
            document.getElementById(custom_anchor).scrollIntoView()
        } else {
            document.getElementById(map.elementId).scrollIntoView()
        }
    }

    // --- Mapping Model Operations

    map.set_items = function(itemList) {
        items = itemList
    }

    map.get_items = function() {
        return items
    }

    map.get_circle_control_radius = function() {
        if (mapping.circle_search_control) {
            return mapping.circle_search_control.getRadius()
        }
        return mapping.circle_search_radius
    }

    map.set_circle_control_radius = function(meterVal) {
        if (mapping.circle_search_radius) {
            mapping.circle_search_radius = meterVal
        } else {
            console.warn("Circle Search Control is curerntly INACTIVE")
        }
    }

    map.get_circle_control_bounds = function() {
        return mapping.circle_search_control.getBounds()
    }

    map.set_map_center = function(coordinate) {
        return map.map.setView(coordinate)
    }

    map.pan_to = function(coordinate) {
        return map.map.panTo(coordinate)
    }

    map.get_map_center = function() {
        return map.map.getCenter()
    }

    map.get_map_viewport = function() {
        if (!map.map) return undefined
        return {
            bounds: map.map.getBounds(),
            zoom: map.map.getZoom(),
            center: map.map.getCenter()
        }
    }

    map.set_map_fit_bounds = function(boundingBox) {
        return map.map.fitBounds(boundingBox)
    }

    map.get_current_location = function() {
        return mapping.current_location
    }

    map.get_current_location_name = function() {
        return mapping.current_location.name
    }

    map.get_current_location_coords = function() {
        return mapping.current_location.coordinate
    }

    map.get_current_location_lat = function() {
        return mapping.current_location.coordinate.lat
    }

    map.get_current_location_lng = function() {
        return mapping.current_location.coordinate.lng
    }

    map.set_current_location = function(obj) {
        mapping.current_location = obj
    }

    map.set_marker_radius = function(val) {
        mapping.marker_radius = val
    }

    map.set_marker_fixed_radius = function(val) {
        mapping.marker_radius_fixed = val
    }

    map.set_marker_selected_radius = function(val) {
        mapping.marker_radius_selected = val
    }

    map.set_current_location_name = function(name) {
        mapping.current_location.name = name
    }

    map.set_current_location_coords = function(coordinate) {
        mapping.current_location.coordinate = coordinate
    }

    map.get_item_by_id = function(id) {
        var elements = map.get_items()
        for (var el in elements) {
            var object = elements[el]
            if (object) {
                if (object.id === id) return object
            } else {
                console.warn("Geo Object View Model NOT in Map Items", object)
            }
        }
        return undefined
    }

    map.find_all_geo_objects = function(address_id) {
        var results = []
        if (address_id) {
            mapping.marker_group.eachLayer(function (el) {
                if (el.options.address_id === address_id) results.push(el)
            })
        }
        return results
    }

    map.exist_marker_in_listing = function(marker, listing, identifier) {
        if (listing) {
            for (var i in listing) {
                if (!marker[identifier]) {
                    console.error('marker has no', identifier, 'property', marker)
                    return false
                } else {
                    if (listing[i].options[identifier] === marker[identifier]) {
                        return true
                    }
                }
            }
        }
        return false
    }

    // --- Event Handling Methods

    map.listen_to = function(event_name, handler) {
        var domElement = document.getElementById(map.elementId)
        domElement.addEventListener(event_name, handler)
    }

    map.fire_drag_end = function(e) {
        var domElement = document.getElementById(map.elementId)
        // domElement.dispatchEvent(new CustomEvent('drag_end'))
        fire_custom_event(domElement, 'drag_end', e.distance)
    }

    map.fire_zoom_end = function(e) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'zoom_end', e)
    }

    map.fire_drag = function() {
        var domElement = document.getElementById(map.elementId)
        // domElement.dispatchEvent(new CustomEvent('drag'))
        fire_custom_event(domElement, 'drag')
    }

    map.fire_geo_marker_select = function(selection) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'marker_select', selection)
    }

    map.fire_angebot_marker_select = function(selection) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'angebot_marker_select', selection)
    }

    map.fire_marker_mouseover = function(element) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'marker_mouseover', element)
    }

    map.fire_marker_mouseout = function(element) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'marker_mouseout', element)
    }

    map.fire_circle_edit = function(new_radius) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'circle_control_edit', new_radius)
    }

    map.fire_location_found = function(valueObj) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'locating_success', valueObj)
    }

    map.fire_location_error = function(message) {
        var domElement = document.getElementById(map.elementId)
        fire_custom_event(domElement, 'locating_error', message)
    }

    map.on_map_drag = function(e) {
        map.fire_drag()
    }

    map.on_map_drag_end = function(e) {
        map.fire_drag_end(e)
    }

    map.on_browser_location_found = function(e) {
        map.scroll_into_view()
        if (!mapping.max_bounds.contains([e.latitude, e.longitude])) {
            handle_locating_error()
        } else {
            map.fire_location_found({"latitude":e.latitude, "longitude": e.longitude})
        }
    }

    map.on_browser_location_error = function(e) {
        map.scroll_into_view()
        handle_locating_error()
    }

    function handle_locating_error() {
        map.set_current_location_name('Ihr Standort liegt au&szlig;erhalb von Berlin, '
            + 'bitte nutzen sie die Umkreissuche oder '
            + '<a href="javascript:kiezatlas.focus_location_input_field()" '+ '>die Texteingabe</a>.')
        map.map.setView(map.get_current_location_coords())
        map.map.setZoom(mapping.zoom_kiez)
        map.fire_location_error('Ihr Standort ist a&uszlig;erhalb von Berlin.')
    }

    function fire_custom_event(element, eventName, details) {
        if (is_msie) {
            var customEvent = document.createEvent('CustomEvent')
                customEvent.initCustomEvent(eventName, true, false, details)
            element.dispatchEvent(customEvent)
        } else {
            element.dispatchEvent(new CustomEvent(eventName, {"detail": details} ))
        }
    }

    // Current MSIE Check here for our PouchDB Favourite Feature courtesy of http://www.javascriptkit.co
    function is_msie() {
        var ie11andabove = navigator.userAgent.indexOf('Trident') != -1 && navigator.userAgent.indexOf('MSIE') == -1 // IE11 or above Boolean
        var ie10andbelow = navigator.userAgent.indexOf('MSIE') != -1 // IE10 or below Boolean
        return (ie11andabove || ie10andbelow)
    }

    return map

})($, L)


var favourites = (function($, PouchDB) {
    console.log("Favourites API Script loaded...")

    var api = {}

    var _db = undefined

    // --- Website Plaes Favourites API (PouchDB)

    api.is_available = function() {
        return (!is_msie() && typeof PouchDB !== "undefined") ? true : false
    }

    api.start_local_db = function() {
        // PouchDB.debug.enable('*') // PouchDB.debug.disable()
        if (api.is_available()) {
            _db = new PouchDB('kiezatlas_favourites')
        } else {
            console.log("Could not start PouchDB, possible we're on the MS IE")
        }
    }

    api.list_entries_in_local_db = function() {
        if (_db) {
            _db.allDocs({ include_docs: true, descending: true })
            .then(function (results) {
                if (results.total_rows > 0) {
                    $("#places .entries").empty()
                    for (var i in results.rows) {
                        var entry = results.rows[i]
                        if (typeof entry.doc.data !== "undefined") {
                            var $place_item = $('<li class="ui-menu-item submenu-item">'
                                    + '<a id="'+entry.doc._id+'" href="#">' + entry.doc.data.name + '</a></li>')
                                $place_item.click(function (e) {
                                    _db.get(e.target.id).then(function (doc) {
                                        kiezatlas.show_favourite_location(doc.data)
                                    }).catch(function (err) {
                                        console.warn(err)
                                    })
                                })
                            $("#places .entries").append($place_item)
                        } else {
                            console.warn("Uncorrect entry", entry)
                        }
                    }
                    $("#places").menu({icons: { "submenu" : "ui-icon-grip-dotted-horizontal" } })
                    $("#places").show()
                    $("button.star").removeClass('no-favs')
                }
            }).catch(function (err) {
                console.log(err)
            })
        }
    }

    function get_next_id(handler) {
        _db.allDocs({include_docs: true})
            .then(function (result) {
                var next_id = parseInt(result.total_rows)
                handler("place_" + next_id)
            }).catch(function (err) {
                console.warn(err)
            })
    }

    api.add_entry_to_local_db = function(location) {
        // TODO; Use POST not PUT to auto-generate IDs
        // ### perform some kind of existence check
        if (_db) {
            get_next_id(function (next_id) {
                var entry = { _id : next_id, data: location }
                _db.put(entry)
                api.list_entries_in_local_db()
            })
        }
    }

    // Current MSIE Check here for our PouchDB Favourite Feature courtesy of http://www.javascriptkit.co
    function is_msie() {
        var ie11andabove = navigator.userAgent.indexOf('Trident') != -1 && navigator.userAgent.indexOf('MSIE') == -1 // IE11 or above Boolean
        var ie10andbelow = navigator.userAgent.indexOf('MSIE') != -1 // IE10 or below Boolean
        return (ie11andabove || ie10andbelow)
    }

    return api
    
}($, PouchDB))


var angebote = (function($) {
    
    // console.log("Kiezatlas Website Angebote Util loaded")
    
    var api = {} 
    
    /** Model: */
    var angebote_items =  []

    /** Functions */
    api.load_geo_objects_angebote = function(geo_object_ids) {
        var params = ""
        var count = 1
        for (var idx in geo_object_ids) {
            params += geo_object_ids[idx]
            if (count < geo_object_ids.length) {
                params += ";"
            }
            count++
        }
        $.ajax('/angebote/list/many/' + params, {
            type: "GET",
            error: function(e) {
                console.warn("AJAX POST Error", e)
                if (e.status === 200) {
                    angebote_items = response
                }
            },
            success: function(response) {
                angebote_items = response
            }
        })
    }

    api.get_angebotsinfos_by_geo_object_id = function (geo_object_id) {
        var results = []
        for (var e in angebote_items) {
            var angebotsinfo = angebote_items[e]
            if (angebotsinfo.assoc.role_1.topic_id === geo_object_id ||
                angebotsinfo.assoc.role_2.topic_id === geo_object_id) {
                results.push(angebotsinfo)
            }
        }
        return results
    }

    // TODO: Move Rendering Angebotsinfos to Ka-Website Module
    api.show_angebotsinfos = function(id) {
        var infos = api.get_angebotsinfos_by_geo_object_id(id)
        var $listing = $('#details-' + id + ' .angebote-listing')
        if ($listing.children().length === 0) {
            $listing = $('<div class="angebote-listing">')
            $('.angebote-link').append($listing)
        }
        $listing.empty()
        for (var aidx in infos) {
            var angebotsinfo = infos[aidx]
            // $listing.append('<span>' + angebotsinfo.value + "</span><br/>")
            console.log("- NYE - Render Angebotsinfo", angebotsinfo)
        }
    }
    
    return api

}($))


/** --- ka-website.js --- **/

/**
 * - Different Color Palette for Angebote Marker
 * - Permalinks for Selected Marker
 * - Include Category Names in Fulltext Search
 * + Show Place Labels on mouseover
 * + Encode Map Viewport into the URL
 * + Enable deep links into fulltext searches on map
 */

var settings = {
    "webapp_title" : "Kiezatlas 2 Website",
    "history_api_supported" : window.history.pushState
}
var updateURL = true            // If false, updating the url using replaceState is defunct (see text search requests)
var query = undefined           // Search User Input
var parameter = {               // View/Page Parameter
    page: undefined, viewport: undefined
}
var selected_marker = undefined // geoobject or marker id

// Map Input Search
function search_fulltext_geo_objects() {
    query = kiezatlas.get_fulltext_search_input()
    if (query.length >= 1) {
        query = encodeURIComponent(query, "UTF-8")
        if (kiezatlas.is_angebote_mode()) {
            kiezatlas.do_text_search_angebotsinfos(query, true)
        } else {
            kiezatlas.do_text_search_geo_objects(query, undefined, true)
        }
    }
}

function handle_fulltext_search_input(event) {
    if (event.keyCode === 13) {
        do_fulltext_search()
    }
}

// Navigation Bar Search
function do_fulltext_search() {
    query = kiezatlas.get_top_search_input()
    if (query.length >= 1) {
        $('#fulltext-search').val(query)
        kiezatlas.hide_sidebar()
        kiezatlas.do_text_search_geo_objects(query, undefined, true)
    }
}

function cleanUpAddress(addressValue) {
    if (addressValue) {
        return addressValue.replace(' Deutschland', '')
    }
}

/** function show_search_options() {
    $('#options-menu').show()
    $('#options-spacer').show("slow")
}

function hide_search_options() {
    $('#options-menu').hide()
    $('#options-spacer').hide("slow")
} **/

// Register Near-By Text Search Handler
function search_location_by_text() {
    var streetFocus = $("#near-by").val() + ' Berlin, Deutschland'
        streetFocus = encodeURIComponent(streetFocus, "UTF-8")
    $('.location-search-info').hide()
    // if a district filter is set on the website, remove it
    if (kiezatlas.district) kiezatlas.clear_district_filter()
    // GUI
    kiezatlas.show_spinning_wheel(true)
    //
    restc.do_geocode(streetFocus, function(response) {
        // GUI
        kiezatlas.hide_spinning_wheel(true)
        // Handling Response
        if (response.hasOwnProperty('results')) {
            // OK
            kiezatlas.set_locationsearch_results(response.results)
            kiezatlas.set_autocomplete_item(0) // Select the first
            if (response.results.length === 1) { // Easy, Focus, Hide Alternatives
                kiezatlas.focus_locationsearch_result()
                $('#street-alternatives').hide()
            } else if (response.results.length > 1) { // Focus, Render Alternatives
                kiezatlas.focus_locationsearch_result()
                kiezatlas.show_locationsearch_alternatives()
            } else {
                $('.location-search-info').html('Keinen Ort f&uuml;r diese Anfrage gefunden')
                $('.location-search-info').show()
            }
        } else { // ERROR
            console.warn("ERROR", "x: " + x + " s: " + s + " e: " + e)
            $('.location-search-info').html('Es ist in Fehler bei der Suche aufgetreten bitte probieren'
                + ' sie es erneut. Sollte dieser Fehler wiederholt auftreten bitte informieren sie uns per'
                + ' Email unter <a href="mailto:support@kiezatlas.de">support@kiezatlas.de</a>.')
            $('.location-search-info').show()
        }
    })
}

var month_names_de = [ "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember" ];

// kiezatlas hex colors
var colors = {
    "ka_blue": "#002856",       // circle control
    "ka_red": "#8f1414",        // districs layer polygon outline
    "m_blue": "#5784b8",        // marker: medium blue outline and fill-in (selected)
    "ka_gold": "#EACA8F",       // marker: yellow fill-ine and outline (selected)
    "bright_grey": "#a9a9a9",   // circlemarker: fill-in
    "yellow": "#FFCC33",        // circle control
    "darkgrey": "#343434",      // unused
    "blue": "#1944fc",          // unused
    "b_blue": "#5a78f3",        // unused
    "ka_water": "#ccdddd",      // unused
    "grey": "#868686"           // unused
}

var kiezatlas = (function($, angebote, leafletMap, restc, favourites) {

    // Website Application Model
    var model = {
        "district": undefined,        // Selected Bezirk Topic: Applies a ID-Filter to all subsequent Requests
        "districts": [],              // Bezirks- & Bezirksregionen Child Topics
        "locationsearch_results": [], // near-by search street-alternatives
        "autocomplete_item": 0,
        "view_angebote" : false,
        // the new web application states
        "site_info" : undefined,
        "site_id" : undefined,
        "map_controls_results": false // false, means: map_controls_query
    }
    // District Page Specifics
    this.set_district = function(district) { model.district = district } // deprecated
    this.get_gistrict = function() { return model.district } // deprecated
    // Citymap Specific
    this.set_site_info = function(topic) { model.site_info = topic }
    this.set_site_id = function(topicId) { model.site_id = topicId }
    this.get_site_info = function() { return model.site_info }
    this.get_site_id = function() { return model.site_id }
    // Frontpage Specifics
    this.set_districts = function(districts) { model.districts = districts }
    this.get_districts = function() { return model.districts }
    this.set_frontpage_mode = function() {
        _self.set_site_info(undefined)
        _self.set_site_id(undefined)
    }
    // 
    this.set_angebotsfilter = function(value) { model.view_angebote = value }
    this.set_mapcontrol_mode_results = function() {
        model.map_controls_results = true
        leafletMap.deactivate_circle_control()
        leafletMap.remove_circle_search_control()
    }
    this.set_mapcontrol_mode_query = function(fitBounds) {
        model.map_controls_results = false
        if (!leafletMap.is_circle_query_active()) {
            leafletMap.activate_circle_control()
            leafletMap.render_circle_search_control(fitBounds)
            console.log("Activating circle query control...")
        } else {
            leafletMap.render_circle_search_control(fitBounds)
        }
    }
    // 
    this.is_kiezatlas_site = function() { return (model.siteId) }
    this.is_map_result_control = function() { return model.map_controls_results }
    this.is_map_query_control = function() { return !model.map_controls_results }
    this.is_angebote_mode = function() { return (model.view_angebote) }

    var _self = this

    this.do_logout = function() {
        restc.logout()
        window.document.location.reload()
    }

    this.init_page_navigation = function() {
        if (settings.history_api_supported) {
            window.onpopstate = function(e) {
                if (e.state) {
                    parameter = e.state
                    if (parameter.page === "#gesamt") {
                        parameter.viewport = e.state.viewport
                        // ### _self.render_gesamtstadtplan() ?
                    } else if (e.state.page === "#angebote") {
                        // ### render angebote page?
                    } else {
                        console.log("Pop Render Districts or Citymap Page", e.state)
                    }
                    // Currently we only pan the map if map is in "query" mode
                    if (parameter.viewport) {
                        var coords = L.latLng(parameter.viewport.center)
                        leafletMap.set_zoom(parameter.viewport.zoom)
                        leafletMap.pan_to(coords)
                        if (kiezatlas.is_map_query_control()) {
                            leafletMap.set_current_location_coords(coords)
                            leafletMap.activate_circle_control()
                            leafletMap.render_circle_search_control()
                            _self.do_circle_search()
                            _self.do_reverse_geocode()
                        }
                    } else {
                        console.log("No Viewport Parameter")
                    }
                }
            }
        }
    }

    this.get_search_keywords = function(query) {
        restc.load_search_keywords(query, function(els) {
            console.log("Loaded Search Keywords for ", query, "...", els)
        })
    }

    this.push_page_view = function(viewportState) {
        if (settings.history_api_supported) {
            if (viewportState && parameter) {
                var url = viewportState + parameter.page
                window.history.replaceState(parameter, settings.webapp_title, url)
            }
        } else {
            console.warn("window.history manipulation not supported", window.navigator)
        }
    }

    this.create_viewport_parameter = function () {
        var mapView = leafletMap.get_map_viewport()
        var viewportState = undefined
        if (mapView) {
            viewportState = "?koordinate=" + mapView.center.lat.toFixed(5) + "," + mapView.center.lng.toFixed(5) + "&zoomstufe=" + mapView.zoom
        }
        return viewportState
    }

    this.update_page_parameter = function () {
        if (_self.is_kiezatlas_site()) {
            console.log("Kiezatlas Citymap", _self.get_site_id(), _self.get_site_info())
        } else if (_self.get_site_id()) {
            console.log("Kiezatlas Website Mode", _self.get_site_id(), _self.get_site_info().value)
        } else if (_self.is_map_result_control() && query) {
            if (_self.is_angebote_mode()) {
                parameter.page = "#angebotssuche=" + query
            } else {
                parameter.page = "#ortssuche=" + query
            }
        } else if (_self.is_angebote_mode()) {
            parameter.page = "#angebote"
        } else {
            parameter.page = "#gesamt"
        }
        var viewportState = _self.create_viewport_parameter()
        _self.push_page_view(viewportState)
    }

    this.get_map_viewport_from_url = function() {
        var zoomStart = window.location.search.indexOf('&zoomstufe=')
        var zoomstufe = undefined
        if (zoomStart !== -1) {
            zoomstufe = window.location.search.slice(zoomStart + '&zoomstufe='.length)
        }
        var koordStart = window.location.search.indexOf('?koordinate=')
        var mapCenter = undefined
        if (koordStart !== -1) {
            var koordinate = window.location.search.slice(koordStart + '?koordinate='.length, zoomStart)
            mapCenter = L.latLng(koordinate.split(','))
        }
        if (!mapCenter && !zoomstufe) return undefined
        return { center: mapCenter, zoom: zoomstufe }
    }

    this.get_page_parameter_from_url = function() {
        var viewport = _self.get_map_viewport_from_url()
        var locationHash = window.location.hash
        var hashStart = 0, questStart = -1
        if (window.location.hash.indexOf("?") !== -1) { // Correcting Hash
            hashStart = window.location.hash.indexOf("#")
            questStart = window.location.hash.indexOf("?")
            locationHash = window.location.hash.slice(hashStart, questStart)
        }
        return {
            page: locationHash, viewport: viewport
        }
    }

    /** Renders either the
     *  - Standard Frontpage (Berlin wide) with Einrichtungen or Angeboten
     *  - District Frontpage (District Infos, District Fulltext search)
     *  - Kiezatlas Website
     **/
    this.render_page = function(name) {

        // 1) Render Bezirks-Gesamtstadtplan, Citymap (with specific Frontpage State)
        if (!name) { // get current page alias
            parameter = _self.get_page_parameter_from_url()
            var subdomain_mitte = (window.location.host.indexOf("mitte.") !== -1 || window.location.hostname.indexOf("mitte.") !== -1) ? true : false
            var bezirksTopic = undefined
            // RENDER SPECIFIC PAGE
            if (parameter.page) {
                if (parameter.page === "#gesamt") {
                    _self.render_gesamtstadtplan() // Renders GESAMTSTADTPLAN
                } else if (parameter.page === "#angebote") {
                    _self.show_angebote_page() // Renders ANGEBOTE_STADTPLAN
                } else if (parameter.page.indexOf("ssuche") !== -1) {
                    _self.render_search_page() // Renders SEARCH RESULTS STADTPLAN
                } else {
                    _self.load_district_topics(function() {
                        bezirksTopic = _self.get_bezirks_topic_by_hash(parameter.page)
                        if (bezirksTopic) { // Renders BEZIRKSPAGE
                            _self.render_bezirkspage(bezirksTopic)
                        } else {
                            _self.render_gesamtstadtplan() // Renders GESAMTSTADTPLAN
                            console.warn("Entschudligung, die Seite "+parameter.page+" konnte nicht geladen werden. ")
                        }
                     })
                }
            } else {
                 if (subdomain_mitte) {
                    _self.load_district_topics(function(e) {
                        bezirksTopic = _self.get_bezirks_topic_by_hash("#mitte")
                        _self.render_bezirkspage(bezirksTopic)  // Renders BEZIRKSPAGE
                    })
                 } else {
                    console.log("Fallback to render Gesamtstadtplan caused by Page Name",
                        name,"Anchor", parameter.page, "and unspecific Subdomain")
                    _self.render_gesamtstadtplan() // Renders GESAMTSTADTPLAN
                 }
            }

        // 2) Render Berlin-Gesamtstadtplan (with specific Frontpage State)
        } else {
            _self.render_gesamtstadtplan()
        }
    }

    this.render_gesamtstadtplan = function() {
        // render main kiezatlas page
        parameter.page = "#gesamt"
        if (parameter.viewport)  {
            leafletMap.set_current_location_coords(parameter.viewport.center)
            _self.render_map(true, { zoom: parameter.viewport.zoom, center: parameter.viewport.center }, false) // detectLocation=true
        } else {
            _self.render_map(true, undefined, false) // detectLocation=true
        }
        // ### re-use our set of client-side cacehd bezirks topics
        _self.load_district_topics(function(e) {
            _self.render_district_menu() // should do "Gesamtstadtplan"
        })
    }

    this.render_search_page = function() {
        var hashParam = window.location.hash
        _self.render_map(false, { zoom: parameter.viewport.zoom, center: parameter.viewport.center }, true) // detectLocation=true
        // ### re-use our set of client-side cacehd bezirks topics
        _self.load_district_topics(function(e) {
            _self.render_district_menu() // should do "Gesamtstadtplan"
        })
        if (parameter.page.indexOf("#angebotssuche") !== -1) { // RENDER ANGEBOTE SEARCH RESULT
            var searchParam = undefined
            if (hashParam.indexOf("?") !== -1) {
                searchParam = hashParam.slice("#angebotssuche=".length, hashParam.indexOf("?"))
            } else {
                searchParam = hashParam.slice("#angebotssuche=".length)
            }
            $('#fulltext-search').val(searchParam)
            _self.set_angebotsfilter(true)
        } else if (parameter.page.indexOf("#ortssuche") !== -1) { // RENDER PLACE SEARCH RESULT
            var searchParam = undefined
            if (hashParam.indexOf("?") !== -1) {
                searchParam = hashParam.slice("#ortssuche=".length, hashParam.indexOf("?"))
            } else {
                searchParam = hashParam.slice("#ortssuche=".length)
            }
            $('#fulltext-search').val(searchParam)
            _self.set_angebotsfilter(false)
        }
        _self.set_mapcontrol_mode_results()
        search_fulltext_geo_objects()
    }

    this.void = function() {
        //
    }

    this.render_bezirkspage = function(bezirksTopic) {
        if (bezirksTopic) {
            _self.set_site_info(bezirksTopic)
            _self.set_site_id(bezirksTopic.id)
            _self.load_marker_cluster_scripts()
            _self.render_map(false, parameter.viewport, false, true) // detectLocation=false
            // sets district filter
            _self.show_district_page(_self.get_site_info().id)
            _self.render_district_menu(bezirksTopic)
        } else {
            console.error("Critical - could not render bezirkspage due to missing bezirkstopic")
        }
    }

    this.render_kiezatlas_site = function(pageAlias) {
        citymap.render_kiezatlas_site(pageAlias)
    }

    this.load_marker_cluster_scripts = function() {
        var clusterStyle1 = document.createElement("link")
            clusterStyle1.setAttribute("href", "/de.kiezatlas.website/vendor/leaflet/markercluster/dist/MarkerCluster.css")
            clusterStyle1.setAttribute("rel", "stylesheet")
        var clusterStyle2 = document.createElement("link")
            clusterStyle2.setAttribute("href", "/de.kiezatlas.website/vendor/leaflet/markercluster/dist/MarkerCluster.Default.css")
            clusterStyle2.setAttribute("rel", "stylesheet")
        var clusterScript = document.createElement("script")
            clusterScript.setAttribute("src", "/de.kiezatlas.website/vendor/leaflet/markercluster/dist/leaflet.markercluster.js")
        document.head.appendChild(clusterStyle1)
        document.head.appendChild(clusterStyle2)
        document.head.appendChild(clusterScript)
        mapping.do_cluster_marker = true
    }

    this.render_map = function(ask_location, viewport, jump_to_map, mousewheelzoom, skipCircleSearch) {
        if (!leafletMap.is_initialized()) {
            _self.setup_map_area('map', mousewheelzoom, skipCircleSearch)
        }
        if (jump_to_map) {
            leafletMap.scroll_into_view()
        }
        if (ask_location) {
            _self.get_browser_location()
        }
        if (viewport) {
            if (viewport.zoom) {
                leafletMap.set_zoom(viewport.zoom)
            }
            if (viewport.center) {
                leafletMap.pan_to(viewport.center)
            }
        }
    }

    this.handle_bezirks_item_click = function(e) {
        var click_href = e.target.getAttribute("href")
        if (click_href.indexOf("/") === 0) {
            click_href = click_href.substr(1)
        }
        if (click_href === "#gesamt") {
            _self.clear_district_page()
            _self.render_page("gesamt")
        } else {
            var bezirksTopic = _self.get_bezirks_topic_by_hash(click_href)
            _self.render_bezirkspage(bezirksTopic)
        }
        _self.hide_sidebar()
    }

    this.hide_sidebar = function() {
        if ($sidebarUi) {
            $sidebarUi.sidebar('hide')
        }
    }

    this.render_district_menu = function(districtVal) {
        var bezirke = _self.get_districts()
        var $bezirk = $('#bezirksauswahl')
            $bezirk.empty()
        // Render inactive/active "Gesamtstadtplan" button
        var $gesamt = $('<a href="#gesamt" id="gesamt" class="item gesamt">Gesamtstadtplan</a>')
            $gesamt.click(_self.handle_bezirks_item_click)
        if (!districtVal) $gesamt.addClass("active")
        $bezirk.append($gesamt)
        // ... Bezirke
        for (var idx in bezirke) {
            var bezirk = bezirke[idx]
            var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
            var $menuitem = $('<a href="'+anchor_name+'" id="'+encodeURIComponent(bezirk.value.toLowerCase())+'" class="item '+anchor_name+'">'+ bezirk.value +'</a>')
            if (districtVal) if (bezirk.id === districtVal.id) $menuitem.addClass('active')
            if (anchor_name.indexOf("marzahn") !== -1 || anchor_name.indexOf("reinickendorf") !== -1 || anchor_name.indexOf("pankow") !== -1) {
                $menuitem.addClass("disabled")
            } else {
                $menuitem.click(_self.handle_bezirks_item_click)
            }
            $bezirk.append($menuitem)
        }
    }

    this.show_angebote_page = function() {
        if (_self.is_angebote_mode()) {
            query = undefined
            $('#fulltext-search').val()
        }
        _self.set_angebotsfilter(true)
        _self.render_map(false, undefined, false, true)
        leafletMap.set_angebote_mode(true)
        _self.update_page_parameter()
        _self.set_fulltext_search_placeholder("Volltextsuche in Angeboten")
        var $legende = $('div.legende')
        if ($legende.children('a.circle-control').length === 0) {
            $legende.append('<a class="circle-control" href="javascript:kiezatlas.clear_angebote_page()">'
                + 'Einrichtungssuche</a>')
        } else {
            $('a.circle-control').show()
        }
        $('a.lock-control').hide()
        $('a.district-control').hide()
        $('span.angebote-btn').addClass('bold')
        $('span.einrichtungen-btn').removeClass('bold')
        _self.set_mapcontrol_mode_results()
        //
        restc.load_current_angebotsinfos(function(offers) {
            leafletMap.set_angebote_mode(true)
            leafletMap.clear_marker()
            leafletMap.set_items(offers)
            leafletMap.render_geo_objects(true)
        })
        // ### re-use our set of client-side cacehd bezirks topics
        _self.load_district_topics(function(e) {
            _self.render_district_menu() // should do "Gesamtstadtplan"
        })
    }

    this.clear_angebote_page = function() {
        $('span.einrichtungen-btn').addClass('bold')
        $('span.angebote-btn').removeClass('bold')
        _self.set_fulltext_search_placeholder("Volltextsuche Berlinweit")
        $('a.circle-control').hide()
        $('a.district-control').hide()
        $('a.lock-control').show()
        _self.set_angebotsfilter(false)
        leafletMap.set_angebote_mode(false)
        leafletMap.set_current_location_coords(leafletMap.get_map_center())
        leafletMap.map.setView(leafletMap.get_current_location_coords(), mapping.zoom_street)
        leafletMap.activate_circle_control()
        leafletMap.render_circle_search_control()
        _self.do_circle_search(undefined, undefined)
        _self.do_reverse_geocode()
        _self.update_page_parameter()
    }

    /** ### Refactor method signature... */
    this.show_district_page = function(topic_id) {
        _self.set_site_info(_self.get_bezirks_topic_by_id(topic_id))
        var bezirk_html = _self.get_site_info().html
        var bezirk_name = _self.get_site_info().value
        var bezirk_feed_url = _self.get_site_info().newsfeed
        $('.location-label .text').html("Berlin " + bezirk_name) // duplicate, use render_current_location_label
        $('.top.menu a.star').hide()
        // TODO: rewrite filter button container
        if ($('div.legende').children('a.district-control').length === 0) {
            $('div.legende').append('<a class="district-control" href="javascript:kiezatlas.clear_district_page()">'
                + 'Bezirksfilter aufheben</a>')
        }
        _self.set_fulltext_search_placeholder("Volltextsuche für " + bezirk_name)
        $('a.lock-control').hide()
        $('a.circle-control').hide()
        $('#site-area').show("flex")
        $('#site-area .content-area').html(bezirk_html + '<br/>'
            + '<a href="'+_self.get_site_info().imprint+'">Impressum</a>')
        leafletMap.scroll_into_view()
        _self.set_mapcontrol_mode_results()
        _self.show_message("Die Volltextsuche liefert ab jetzt nur Ergebnisse aus dem Bezirk <em>"
            + bezirk_name + "</em>. W&auml;hlen sie <em>Bezirksfilter aufheben</em> um wieder Berlinweit"
            + " Einrichtungen zu finden.", 7000)
        _self.update_document_title(undefined, bezirk_name)
        _self.show_spinning_wheel()
        // Load Newsfeed in District
        _self.show_newsfeed_area(topic_id, bezirk_feed_url)
        // Load Geo Objects in District
        restc.load_district_topics(topic_id, function(response) {
            leafletMap.clear_marker()
            _self.hide_spinning_wheel()
            leafletMap.set_items(response)
            if (parameter.viewport) {
                leafletMap.render_geo_objects(false)
            } else {
                leafletMap.render_geo_objects(true)
            }
        })
    }

    this.show_newsfeed_area = function(topic_id, feedUrl) {
        restc.load_news_items(topic_id, function(results) {
            var html_item
            if (!results) {
                $('#site-area .news-area').hide()
            } else if (results.length > 0) {
                html_item = "<h2>Neuigkeiten</h2>"
                for (var r in results) {
                    html_item += '<div class="news-item">'
                        + '<span class="label date">' + _self.format_date(results[r].published) + '</span>'
                        + '<h3>' + results[r].title + '&nbsp;<a href="' + results[r].link+'" target="_blank">mehr Infos</a></h3>'
                    + '</div>'
                }
            } else {
                html_item = '<h2>Entschuldigen Sie bitte</h2>'
                html_item += '<div class="news-item">Der Newsfeed f&uuml;r diese Site (<a target="_blank" href="'
                        + feedUrl + '">Link</a>) konnte gerade nicht geladen werden.</div>'
            }
            $('#site-area .news-area').html(html_item)
        })
    }

    this.clear_district_page = function() {
        $('#site-area').hide()
        _self.clear_district_filter()
        mapping.do_cluster_marker = false
        leafletMap.set_current_location_coords(leafletMap.get_map_center())
        _self.set_mapcontrol_mode_query(true)
        leafletMap.set_zoom(mapping.zoom_kiez)
        _self.do_circle_search(undefined, undefined)
        _self.do_reverse_geocode()
    }

    this.clear_district_filter = function() {
        _self.set_frontpage_mode()
        _self.set_fulltext_search_placeholder("Volltextsuche Berlinweit")
        $('a.district-control').remove()
        $('a.lock-control').show()
        // leafletMap.map.doubleClickZoom.disable();
        leafletMap.scroll_into_view()
    }

    this.show_favourite_location = function(object) {
        if (!leafletMap.is_initialized()) {
            _self.setup_map_area('map')
        }
        leafletMap.set_current_location(object)
        leafletMap.map.setView(leafletMap.get_current_location_coords(), mapping.zoom_street)
        leafletMap.activate_circle_control()
        leafletMap.render_circle_search_control()
        _self.do_circle_search(undefined, undefined)
        _self.render_current_location_label()
    }

    this.setup_map_area = function(dom_el_id, mouseWheelZoom, skipCircleSearch) {
        var mapMovedSkipLocating = false // a local var to influence the outcome of the "browser locating" query
        var $map = $('#map')
            $map.empty()
            $map.show()
        var $star_button = $('.top.menu a.star')
            $star_button.show()
            // $star_button.button()
            /** $star_button.hover(function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star-white.png')
            }, function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star.png')
            }) **/
        $('.search-option.d').css('display', 'inline-block')
        $('#detail-area').show("inline")
        $('div.legende').show()
        //
        leafletMap.setup(dom_el_id, mouseWheelZoom)
        leafletMap.listen_to('drag', function(e) {
            if (leafletMap.is_circle_control_fixed() && _self.is_map_query_control()) {
                leafletMap.set_current_location_coords(leafletMap.get_map_center())
                leafletMap.set_circle_control_radius(leafletMap.get_circle_control_radius())
                leafletMap.activate_circle_control()
                leafletMap.render_circle_search_control(false)
            }
        })
        leafletMap.listen_to('zoom_end', function(e) {
            _self.update_page_parameter()
        })
        leafletMap.listen_to('drag_end', function(e) {
            if (e.detail >= 8) {
                if (leafletMap.is_circle_query_active() && leafletMap.is_circle_control_fixed()
                    && !_self.is_kiezatlas_site() && _self.is_map_query_control()) {
                    _self.do_circle_search(undefined, undefined)
                    _self.do_reverse_geocode()
                }
            }
            mapMovedSkipLocating = true
            _self.update_page_parameter()
        })
        leafletMap.listen_to('marker_select', function(e) {
            _self.clear_details_area()
            _self.show_selected_geo_details(e.detail)
            mapMovedSkipLocating = true
            selected_marker = e
        })
        leafletMap.listen_to('angebot_marker_select', function(e) {
            _self.clear_details_area()
            var geo_objects_under_marker = leafletMap.find_all_geo_objects(e.detail.options['address_id'])
            _self.show_selected_angebot_detail(e.detail, geo_objects_under_marker)
            mapMovedSkipLocating = true
            selected_marker = e
        })
        leafletMap.listen_to('marker_mouseover', function(e) {
            var geo_objects_under_marker = leafletMap.find_all_geo_objects(e.detail.target.options['address_id'])
            _self.show_marker_name_info(geo_objects_under_marker)
        })
        leafletMap.listen_to('marker_mouseout', function(e) {
            _self.hide_marker_name_info()
        })
        leafletMap.listen_to('circle_control_edit', function(e) {
            // ### on small screens (here, after dragging) our current center should be the mapcenter (fitBounds..)
            // ### TODO: dont query if given location and given radius "equals" our latest "query settings"
            leafletMap.set_circle_control_radius(e.detail)
            _self.do_circle_search(leafletMap.get_current_location_coords(), e.detail)
            _self.do_reverse_geocode()
            mapMovedSkipLocating = true
        })
        leafletMap.listen_to('locating_success', function(e) {
            console.info("location success by browser", window.navigator)
            if (!mapMovedSkipLocating) {
                leafletMap.set_current_location_coords(new L.latLng(e.detail.latitude, e.detail.longitude))
                leafletMap.activate_circle_control()
                leafletMap.render_circle_search_control()
                _self.do_circle_search(leafletMap.get_current_location_coords(), undefined)
                // leafletMap.map.fitBounds(leafletMap.get_circle_control_bounds())
                _self.do_reverse_geocode()
                _self.update_page_parameter()
            } else {
                console.log("Skip locatiing_error as user already interacted with the map", e)
            }
        })
        leafletMap.listen_to('locating_error', function(e) {
            if (!mapMovedSkipLocating) {
                console.warn("locating error detected by browser", window.navigator)
                leafletMap.render_circle_search_control()
                _self.render_current_location_label()
                _self.do_circle_search(undefined, undefined)
                _self.do_reverse_geocode()
            } else {
                console.log("Skip locatiing_error as user already interacted with the map", e)
            }
        })
        _self.render_browser_location_button()
        _self.render_current_location_label()
        if (!skipCircleSearch) leafletMap.render_circle_search_control()
    }

    this.focus_locationsearch_result = function() {
        var item = model.locationsearch_results[model.autocomplete_item]
        if (item) {
            if (!mapping.max_bounds.contains([item.geometry.location.lat, item.geometry.location.lng])) {
                // ### Message will not FIT if result is NOT in Bounds AND there is just ONE result!
                leafletMap.set_current_location_name('Der erste gefundene Standort liegt au&szlig;erhalb '
                    + 'von Berlin, bitte w&auml;hlen sie eine der Alternativen rechts:')
                _self.render_current_location_label(true)
                leafletMap.scroll_into_view()
                leafletMap.map.setView(leafletMap.get_current_location_coords(), mapping.zoom_street)
            } else {
                leafletMap.scroll_into_view()
                leafletMap.set_current_location_coords(new L.latLng(item.geometry.location.lat, item.geometry.location.lng))
                leafletMap.set_circle_control_radius(900) // adapt circle size for this search a bit ###
                leafletMap.set_current_location_name(item['formatted_address'])
                leafletMap.activate_circle_control()
                leafletMap.render_circle_search_control()
                leafletMap.map.panTo(leafletMap.get_current_location_coords())
                _self.render_current_location_label()
                _self.do_circle_search(undefined, undefined)
            }
            /*** $("#near-by").val(item['formatted_address'])
            // Display marker at found location
            if (_self.location_circle) leafletMap.map.removeLayer(_self.location_circle)
            _self.location_circle = new L.circle(item.geometry.location, 200, {"stroke": true,
                "clickable": false, "color": "#dae3f8", "fillOpacity": 0.6, "opacity": 0.8, "weight":10})
            leafletMapf.map.addLayer(_self.location_circle, {"clickable" : false}) **/
        } else {
            throw new Error("Autocomplete item is undefined", item, model.autocomplete_item)
        }
    }

    this.show_locationsearch_alternatives = function() {
        var prev_location = model.locationsearch_results[model.autocomplete_item - 1]
        var next_location = model.locationsearch_results[model.autocomplete_item + 1]
        var $prev = "", $next = ""
        if (prev_location) {
            $prev = $('<a class="prev-location" title="'+ prev_location['formatted_address'] +'"><</a>')
            $prev.click(function(e) {
                model.autocomplete_item = model.autocomplete_item - 1
                _self.focus_locationsearch_result()
                _self.show_locationsearch_alternatives()
            })
        } else { // empty "prev" button
            $prev = $('<a class="prev-location defused" title=""><</a>')
        }

        if (next_location) {
            $next = $('<a class="next-location" title="'+ next_location['formatted_address'] +'">></a>')
            $next.click(function(e) {
                model.autocomplete_item = model.autocomplete_item + 1
                _self.focus_locationsearch_result()
                _self.show_locationsearch_alternatives()
            })
        } else { // empty "next" button
            $next = $('<a class="next-location defused" title="">></a>')
        }
        $('#street-alternatives').html(model.locationsearch_results.length + ' Ergebnisse').append($prev).append($next)
        $('#street-alternatives').css("display", "inline-block")
        $('#street-alternatives').show()
    }

    this.render_current_location_label = function(hideFavBtn) {
        var location = leafletMap.get_current_location()
        if (!location.hasOwnProperty("name")) console.warn("Current location has no name")
        if (!location.coordinate.hasOwnProperty("lat")) console.warn("Current location has no lat")
        if (!location.coordinate.hasOwnProperty("lng")) console.warn("Current location has no lng")
        var latitude, longitude;
            latitude = leafletMap.get_current_location_lat().toFixed(3)
            longitude = leafletMap.get_current_location_lng().toFixed(3)
        $('.location-label .text').html(leafletMap.get_current_location_name()
            + ' <small>('+latitude+' N, '+longitude+' E)</small>')
        if (favourites.is_available()) {
            var $star_button = $('.top.menu a.star')
                $star_button.unbind('click')
                $star_button.click(function(e) {
                    favourites.add_entry_to_local_db(leafletMap.get_current_location())
                })
            if (hideFavBtn) {
                // $star_button.button("disable")
                $star_button.hide()
            } else {
                $star_button.show()
                // $star_button.button("enable")
            }
        }
        var newPageTitle = leafletMap.get_current_location_name()
        if (newPageTitle.indexOf("Ihr Standort liegt") === -1) {
            _self.update_document_title(leafletMap.get_current_location_name())
        }
    }

    this.show_selected_geo_details = function(result_list) {
        var list_of_marker_ids = []
        for (var i in result_list) {
            var marker_model = result_list[i].options
            var marker_id = marker_model['id']
            list_of_marker_ids.push(marker_id)
            restc.load_geo_object_detail(marker_id, function(result) {
                _self.render_selected_details_card(result)
            })
        }
        // ### TODO: angebote.load_geo_objects_angebote(list_of_marker_ids)
    }

    this.show_selected_angebot_detail = function(marker, geo_objects) {
        var model = marker.options
        var einrichtung = {id: model['location_id'], name: model['name'], address: model['address'] }
        restc.load_related_angebotsinfos(model['location_id'], function(results) {
            _self.render_selected_angebot_details_card(results, einrichtung)
        })
    }

    this.render_selected_angebot_details_card = function(results, location) {
        var angeboteHTML = ""
        for (var r in results) {
            var angebot = results[r]
            angeboteHTML += '<p><a class="ui button olive" href="/angebote/' + angebot.angebots_id + '" title="mehr Infos zum Angebot">'
                + angebot.angebots_name + ' ...</a></p>'
        }
        $('#detail-area').append('<div class="entry-card" id="details-'+location.id+'">'
            + '<h3>'+location.name+'</h3>'
            + '<div class="details angebote">'
            + '<p>' + cleanUpAddress(location.address) + '</p>'
            + '<p class="label">Aktuell ' + results.length + ' Angebot/e</p>' + angeboteHTML + '</div></div>')
    }

    this.render_selected_details_card = function(object) {
        var imprint_html = _self.get_imprint_html(object)
        var contact = object.kontakt
        var opening_hours = object.oeffnungszeiten
        var lor_link = _self.get_lor_link(object)
        var fahrinfoLink = '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z=' + object.address_name.toString()
                + '&REQ0JourneyStopsZA1=2&start=1&pk_campaign=kiezatlas.de">'
                + '<img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
        var angebote_link = ''
        if (object.angebote_count > 0) {
            angebote_link = '<div class="angebote-link">'
                + '<a class="button" href="/website/geo/' + object.id + '">Aktuelle Angebote anzeigen</a></div>'
        }
        if (_self.get_site_info() && !_self.get_site_info().fahrinfoLink) {
            fahrinfoLink = ''
            console.log("Fahrinfo Link Disabled")
        }
        var body_text = ""
        // if (description) body_text += '<p><b>Info</b> ' + description + '</p>'
        if (typeof contact !== "undefined" && contact.value.length > 0) {
            // var fax = undefined, email = undefined, telefon = undefined, person = undefined
            var contact_text = "<br/>"
            // skipping ansprechpartner and email
            if (contact.childs.hasOwnProperty('ka2.kontakt.telefon')
                && contact.childs['ka2.kontakt.telefon'].value.length > 0) {
                contact_text += 'Tel.: ' + contact.childs['ka2.kontakt.telefon'].value  + '<br/>'
            }
            if (contact.childs.hasOwnProperty('ka2.kontakt.fax')
                && contact.childs['ka2.kontakt.fax'].value.length > 0) {
                contact_text += 'Fax: ' + contact.childs['ka2.kontakt.fax'].value
            }
            body_text += '<p><b>Kontakt</b> ' + contact_text + '</p>'
        }
        if (typeof opening_hours !== "undefined"
            && opening_hours.length > 0) body_text += '<p><b>&Ouml;ffnungszeiten</b>' + opening_hours + '</p>'
        // _append_ to dom
        var unconfirmedClass = (object.unconfirmed) ? " unconfirmed" : ""
        $('#detail-area').append('<div class="entry-card' + unconfirmedClass + '" id="details-'+object.id+'">'
            + '<h3>'+object.name+'</h3>'
            + '<div class="details">'
            + '<p>'
                + object.address_name.toString() + '<br/>'
                + '' + body_text + ''
            + '</p>'
            + angebote_link
            + '<a href="/website/geo/' + object.id + '" title="Zeige Details" class="ui button olive">mehr Infos</a>'
            + fahrinfoLink
            + '</div>'
            + lor_link
            + imprint_html
        + '</div>')
    }

    // --- Kiezatlas API Service helper

    this.load_district_topics = function(callback) {
        restc.load_districts(function(results) {
            _self.set_districts(results.sort(restc.value_sort_asc))
            if (callback) callback()
        })
    }

    this.show_district_listing = function() {
        var bezirke = _self.get_districts()
        for (var i in bezirke) {
            var district = bezirke[i]
            var bezirke_html = '<li ' + 'class="bezirk ' + district.uri + '">'
                    bezirke_html += '<a class="district-button" id="' + district.id
                    + '" title="zur Bezirksseite '+ district.value
                    + '" href="javascript:kiezatlas.show_district_page('
                    + district.id + ')">' + district["value"] + '</a>'
                /** bezirke_html += '<ul class="bezirksregionen">'
                var subdistricts = district.childs.sort(_self.name_sort_asc)
                for (var k in subdistricts) {
                    var region = subdistricts[k]
                    // console.log("ka_subdistrict", region)
                    bezirke_html += '<li><a id="' + region["id"] + '">' + region["name"] + '</a></li>'
                }
                bezirke_html += '</ul>' **/
                bezirke_html += '</li>'
            var $bezirke = $(bezirke_html)
            $('ul.bezirke').append($bezirke)
        }
    }

    this.create_location_string = function(location) {
        var location_string = ''
        if (!location) {
            location_string = leafletMap.get_current_location_lng() + ', '+ leafletMap.get_current_location_lat()
        } else {
            location_string = location.lng.toFixed(4) + ', '+location.lat.toFixed(4)
        }
        return location_string
    }

    this.do_circle_search = function(location, radius) {
        _self.show_spinning_wheel()
        _self.set_mapcontrol_mode_query()
        var location_string = _self.create_location_string(location)
        var radius_value = radius
        if (!radius) radius_value = leafletMap.get_circle_control_radius()
        $.getJSON('/website/search/'+encodeURIComponent(location_string)+'/' + (radius_value / 1000),
            function (geo_objects) {
                if (geo_objects.length > 0) {
                    leafletMap.set_items(geo_objects) // ### let markers add up
                    leafletMap.clear_marker()
                    leafletMap.render_geo_objects(false)
                } else {
                    _self.show_message('Keine Treffer in diesem Umkreis', 2000)
                }
                _self.hide_spinning_wheel()
        })
    }

    this.do_text_search_geo_objects = function(text, callback, fitBounds) {
        _self.set_mapcontrol_mode_results()
        var queryUrl = '/website/search/?search='+text
        if (_self.get_site_id()) {
            queryUrl = '/website/search/' + _self.get_site_id() + '/?search=' + text
        }
        _self.show_searching_indicator()
        _self.show_spinning_wheel()
        $('span.einrichtungen-btn').addClass('bold')
        $('span.angebote-btn').removeClass('bold')
        $.getJSON(queryUrl, function (geo_objects) {
            // If search results are not zero
            if (geo_objects.length > 0) {
                // ### Todo: for resultsets bigger than 100 implement an incremental rendering method
                leafletMap.set_items(geo_objects)
                leafletMap.clear_marker()
                if (fitBounds) {
                    leafletMap.render_geo_objects(true) // fit bounds
                } else {
                    leafletMap.render_geo_objects(false)
                }
                _self.hide_spinning_wheel()
                _self.hide_searching_indicator()
            } else {
                _self.hide_spinning_wheel()
                _self.hide_searching_indicator()
                _self.show_message('Keine Treffer f&uuml;r diese Suche')
            }
            if (callback) callback(geo_objects)
        })
        if (updateURL) {
            _self.update_page_parameter()
        }
    }

    this.do_text_search_angebotsinfos = function(text, fitBounds) { // Remove Duplicate Lines
        var queryUrl = '/website/search/angebote?search=' + text
        // _self.clear_details_area()
        _self.set_mapcontrol_mode_results()
        _self.show_spinning_wheel()
        $.getJSON(queryUrl, function (geo_objects) {
            // TODO: If search results are zero
            if (geo_objects.length > 0) {
                // ### for resultsets bigger than 100 implement an incremental rendering method
                leafletMap.set_items(geo_objects)
                leafletMap.clear_marker()
                if (fitBounds) {
                    leafletMap.render_geo_objects(true) // fit bounds
                } else {
                    leafletMap.render_geo_objects(false)
                }
                _self.hide_spinning_wheel()
            } else {
                _self.hide_spinning_wheel()
                _self.show_message('Keine Treffer f&uuml;r diese Suche')
            }
        })
        if (updateURL) {
            _self.update_page_parameter()
        }
    }

    this.do_reverse_geocode = function(e) {
        restc.do_reverse_geocode(leafletMap, _self)
    }

    // --- Simple HTML click handler

    this.toggle_circle_search_lock_button = function(e) {
        // toggle state
        var state = (leafletMap.is_circle_control_fixed()) ? false : true
        leafletMap.set_circle_control_fixed(state)
        if (state) {
            if (_self.is_angebote_mode()) {
                _self.clear_angebote_page()
            }
            $('.lock-control').text('Umkreissuche')
            $('.leaflet-editing-icon').hide()
        } else {
            $('.leaflet-editing-icon').show()
            $('.lock-control').text('Kreis fixieren')
        }
    }

    this.toggle_location_menu = function(show) {
        if (show) {
            $('#nearby-area .options').show()
            return
        }
        $('#nearby-area .options').toggle()
    }

    this.add_page_input_handler = function() {
        $('.sidebar .bezirke .menu a').click(_self.handle_bezirks_item_click)
        // $('#text-search').on("keyup", handle_fulltext_search_input)
        var $option_a = $('.search-option.a')
            $option_a.on('touchend', handle_option_a)
            $option_a.on('click', handle_option_a)
        var $option_b = $('.search-option.b')
            $option_b.on('touchend', _self.focus_location_input_field)
            $option_b.on('click', _self.focus_location_input_field)
        var $option_c = $('.search-option.c')
            $option_c.on('touchend', _self.handle_option_c)
            $option_c.on('click', _self.handle_option_c)

        function handle_option_a (e) {
            // initialize map on browser location
            _self.render_map(true, undefined, true, true)
        }

    }

    this.handle_option_c = function(e) {
        // initiate map with edible circle control
        _self.render_map(false, { zoom: mapping.zoom_kiez }, true, true)
    }

    this.handle_option_b = function(e) {
        // initiate map with edible circle control but focus on street
        _self.render_map(false, { zoom: mapping.zoom_street }, true, true)
    }

    // --- GUI Manipulation Utility Methods
    
    this.set_fulltext_search_placeholder = function(hint) {
        // $('#text-search').attr("placeholder", hint)
        $('#fulltext-search').attr("placeholder", hint)
    }

    this.get_fulltext_search_input = function() {
        return $('#fulltext-search').val()
    }

    this.get_top_search_input = function() {
        return $('#text-search').val()
    }

    this.show_marker_name_info = function(objects) {
        var names_html = ""
        var max_count = 4
        for (var o in objects) {
            names_html += "<b>" + objects[o].options.name + "</b><br/>"
            if (o === max_count) {
                names_html += "..."
                break
            }
        }
        var $marker_name = $('#marker-name', "#map")
        if ($marker_name.children().length > 0) {
            $marker_name.html(names_html)
            $marker_name.show()
        } else {
            $marker_name = $('<div id="marker-name">')
            $marker_name.html(names_html)
            $('#map').append($marker_name)
            $marker_name.show()
        }
    }

    this.hide_marker_name_info = function() {
        $('#marker-name', '#map').hide()
    }

    this.focus_location_input_field = function() {
        _self.toggle_location_menu(true)
        $('#location-input #near-by').focus()
    }

    this.show_spinning_wheel = function(isLocating) {
        if (isLocating) {
            $('#location-input .spinning-wheel').show()
        } else {
            $('#spinning-wheel').show()
        }
    }

    this.hide_searching_indicator = function() {
        $('.ui.search button .icon').removeClass("loading").removeClass("circle").removeClass('notched')
        $('.ui.search button .icon').addClass("search")
    }

    this.show_searching_indicator = function() {
        $('.ui.search button .icon').addClass("loading").addClass("circle").addClass('notched')
        $('.ui.search button .icon').removeClass("search")
    }

    this.hide_spinning_wheel = function(isLocating) {
        if (isLocating) {
            $('#location-input .spinning-wheel').hide()
        } else {
            if ($('#spinning-wheel').css("display") !== "none")
                $('#spinning-wheel').hide()
        }
    }

    this.show_message = function(message, timeout) {
        $('#notification').show(200, "linear", function(e) {
            // set message (if any)
            if (message) {
                $('.message', this).html(message)
            }
            timer = (timeout) ? timeout : 4500
            // hide automatically
            setTimeout(function(e) {
                _self.hide_message_window(500)
            }, timer)
        })
    }

    this.close_message_window = function() {
        _self.hide_message_window(100)
    }

    this.hide_message_window = function(duration) {
        $('#notification').hide(duration, "linear")
    }

    this.render_browser_location_button = function() {
        var locateButton = '<a class="leaflet-control-zoom-loc" href="#" title="Your Location"></a>'
        $(locateButton).insertBefore(".leaflet-control-zoom-in")
        $(".leaflet-control-zoom-loc").click(_self.get_browser_location);
    }

    this.clear_details_area = function() {
        $('.search-option.d').remove()
        var $entryCards = $('.entry-card')
        $entryCards.hide(200, "linear", function () { $entryCards.remove() })
    }

    // Location based service helper

    this.get_browser_location = function(options) {
        //
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by your browser")
        } else {
            //
            if (typeof options === "undefined") { // ??? do this options work for us?
                options =  {
                    "setView": true, "maxZoom": mapping.zoom_detail, enableHighAccuracy: true
                }
            }
            leafletMap.map.locate(options)
        }
    }

    // --- Util

    this.get_imprint_html = function(entry) {
        var bezirk = _self.get_bezirks_topic(entry.bezirk_uri)
        var html = '<div class="imprint">'
        if (bezirk) {
            html += '<a href="' + bezirk.imprint + '" target="_blank" '
                + 'title="Impressum: Bezirksamt ' + bezirk.value + '">Impressum</a></div>'
        } else {
            console.warn("Could not fetch Bezirks Topic by URI", bezirk, entry)
            html += '</div>'
        }
        return html
    }

    this.get_lor_link = function(entry) {
        if (!entry.hasOwnProperty("lor_id")) return ""
        var html = '<div class="lor-link">'
            + '<a href="http://sozialraumdaten.kiezatlas.de/seiten/2017/06/?lor=' + entry.lor_id
            + '" title="zur Einwohnerstatistik des Raums (LOR Nr. ' + entry.lor_id +')">Sozialraumdaten</a></div>'
        return html
    }

    this.update_document_title = function(titlePrefix, titleAddon) {
        if (titlePrefix) window.document.title = titlePrefix + " - " + settings.webapp_title
        if (titleAddon) window.document.title = settings.webapp_title + " - " + titleAddon
    }

    this.name_sort_asc = function(a, b) {
        var nameA = a.name
        var nameB = b.name
        //
        if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string ascending
          return 1
        if (nameA.toLowerCase() < nameB.toLowerCase())
          return -1
        return 0 //default return value (no sorting)
    }

    // --- Website Model Operations

    this.get_current_location = function() {
        return leafletMap.get_current_location()
    }

    this.get_bezirks_topic = function(uri) {
        for (var i in _self.get_districts()) {
            var element = _self.get_districts()[i]
            if (element.uri === uri) return element
        }
        return undefined
    }

    this.get_bezirks_topic_by_id = function(id) {
        for (var i in _self.get_districts()) {
            if (_self.get_districts()[i].id === id) return _self.get_districts()[i]
        }
    }

    this.get_bezirks_topic_by_hash = function(hash) {
        for (var i in _self.get_districts()) {
            var bezirk = _self.get_districts()[i]
            var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
            if (anchor_name === hash) return bezirk
        }
    }

    this.set_autocomplete_item = function(index) {
        model.autocomplete_item = index
    }

    this.get_autocomplete_item = function() {
        return model.autocomplete_item
    }

    this.set_locationsearch_results = function(results) {
        model.locationsearch_results = results
    }

    this.get_locationsearch_results = function() {
        return model.locationsearch_results
    }

    this.format_date = function(timestamp) {
        try {
            var date = new Date(timestamp)
            var minutes = (date.getMinutes() < 10) ? "0" + date.getMinutes() : date.getMinutes()
            var hours = (date.getHours() < 10) ? "0" + date.getHours() : date.getHours()
            var date_string = '' + date.getDate() + '.' + month_names_de[date.getMonth()] + ' '
                        + date.getFullYear() + ', ' + date.getHours() + ':' + minutes + ' Uhr'
            return date_string
        } catch (e) {
            throw Error(e)
        }
    }

    return this

})($, angebote, leafletMap, restc, favourites)


/** --- ka-citymap.js --- **/

var DATA_TOPIC_ID = "data-topic-id"

function create_list_item(obj) {
    return $('<li class="item" data-topic-id="'+obj.id+'"><h3>' + obj.name
        + ', <span class="anschrift">'+obj.anschrift.replace(" Deutschland", "") +'</span>, '
        + '<a href="javascript:citymap.show_selected_detail('+obj.id+', true);">mehr Infos</a></h3></li>')
}

function hide_loading_indicator() {
    $('.citymap .ui.search button .icon').removeClass("loading").removeClass("circle").removeClass('notched')
    $('.citymap .ui.search button .icon').addClass("search")
}

function show_loading_indicator() {
    $('.citymap .ui.search button .icon').addClass("loading").addClass("circle").addClass('notched')
    $('.citymap .ui.search button .icon').removeClass("search")
}

var display_map = false

var facetTypeDefs = undefined

var citymap = {

    init: function(siteAlias, no_map) {
        display_map = (!no_map) ? true : false
        // clear topicmaps cookie as it may effect our client loading facets
        js.remove_cookie("dm4_topicmap_id")
        // creates leaflet map
        citymap.setup_map_area("map", true)
        // show loading indicator
        kiezatlas.show_spinning_wheel()
        // Adapt our default leaflet map handling options
        leafletMap.zoom.setPosition("topleft")
        leafletMap.deactivate_circle_control()
        leafletMap.remove_circle_search_control()
        // Init our map container
        // ### introduce new site configuration options (marker radius/size) with migration
        if (siteAlias.indexOf("stadtteil") !== -1) {
            leafletMap.set_marker_radius(10)
            leafletMap.set_marker_selected_radius(15)
            leafletMap.set_marker_fixed_radius(true)
        }
        // Load Site Info
        restc.load_website_info(siteAlias, function(siteTopic) {
            // console.log("Load Kiezatlas Website ", siteAlias, siteTopic)
            kiezatlas.set_site_id(siteTopic.id)
            kiezatlas.set_site_info(siteTopic)
            kiezatlas.update_document_title(siteTopic.value)
            citymap.render_criteria_menu(siteTopic.criterias)
            // check on markercluster
            if (siteTopic.markercluster) {
                console.log("Do Use Markercluster")
                kiezatlas.load_marker_cluster_scripts()
            }
            if (siteTopic.locationPrompt) {
                console.log("Do Location Prompt")
            }
            if (siteTopic.locationSearch) {
                console.log("Enable Location Search")
            }
            if (siteTopic.fahrinfoLink) {
                console.log("Render Fahrinfo Link")
            }
            // Display Citymap Details
            citymap.render_info_area(siteTopic)
            kiezatlas.show_newsfeed_area(siteTopic.id, siteTopic.newsfeed)
            // Load Geo Objects in Website
            restc.load_website_geoobjects(siteTopic.id, function(results) {
                // leafletMap.clear_marker()
                kiezatlas.hide_spinning_wheel()
                leafletMap.set_items(results)
                leafletMap.render_geo_objects(true)
            })
            //
            restc.load_website_facets(siteTopic.id, function(facetTypes) {
                // console.log("Loaded Websites Facet Type Definitions", facetTypes)
                facetTypeDefs = facetTypes
            })
        })
    },

    setup_map_area: function(domId, mouseWheelZoom) {
        var $map = $('#map')
            $map.empty()
            $map.show()
        var $star_button = $('.top.menu a.star')
            $star_button.show()
            // $star_button.button()
            /** $star_button.hover(function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star-white.png')
            }, function (e) {
                $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star.png')
            }) **/
        $('.search-option.d').css('display', 'inline-block')
        $('#detail-area').show("inline")
        $('div.legende').show()
        //
        leafletMap.setup(domId, mouseWheelZoom)
        // 
        leafletMap.listen_to('drag', function(e) {
            if (leafletMap.is_circle_control_fixed() && kiezatlas.is_map_query_control()) {
                leafletMap.set_current_location_coords(leafletMap.get_map_center())
                leafletMap.set_circle_control_radius(leafletMap.get_circle_control_radius())
                leafletMap.render_circle_search_control(false)
            }
        })
        leafletMap.listen_to('drag_end', function(e) {
            if (e.detail >= 8) {
                if (leafletMap.is_circle_query_active() && leafletMap.is_circle_control_fixed() && kiezatlas.is_map_query_control()) {
                    kiezatlas.do_circle_search(undefined, undefined)
                    kiezatlas.do_reverse_geocode()
                }
            }
        })
        leafletMap.listen_to('marker_select', function(e) {
            // Note: ka-citymap.js only exists because it (here) introduces specifics to load _facetted_ geo object details 
            citymap.clear_details_area()
            citymap.show_selected_details(e.detail)
        })
        leafletMap.listen_to('marker_mouseover', function(e) {
            var geo_objects_under_marker = leafletMap.find_all_geo_objects(e.detail.target.options['location_id'])
            kiezatlas.show_marker_name_info(geo_objects_under_marker)
        })
        leafletMap.listen_to('marker_mouseout', function(e) {
            kiezatlas.hide_marker_name_info()
        })
        leafletMap.listen_to('circle_control_edit', function(e) {
            // ### on small screens (here, after dragging) our current center should be the mapcenter (fitBounds..)
            // ### TODO: dont query if given location and given radius "equals" our latest "query settings"
            kiezatlas.do_circle_search(leafletMap.get_current_location_coords(), e.detail)
            kiezatlas.do_reverse_geocode()
        })
        leafletMap.listen_to('locating_success', function(e) {
            leafletMap.set_current_location_coords(new L.latLng(e.detail.latitude, e.detail.longitude))
            leafletMap.activate_circle_control()
            leafletMap.render_circle_search_control()
            kiezatlas.do_circle_search(leafletMap.get_current_location_coords(), undefined)
            leafletMap.set_map_fit_bounds(leafletMap.get_circle_control_bounds())
            kiezatlas.do_reverse_geocode()
        })
        leafletMap.listen_to('locating_error', function(e) {
            leafletMap.render_circle_search_control()
            kiezatlas.render_current_location_label()
            kiezatlas.do_circle_search(undefined, undefined)
            kiezatlas.do_reverse_geocode()
        })
        kiezatlas.render_browser_location_button()
        kiezatlas.render_current_location_label()
        leafletMap.render_circle_search_control()
    },

    render_mobile: function() {
        // 1) switch to "Orte" tab
        citymap.clear_and_select_places_tab()
        // 2) render a plain listing of all items in this amp
        var places = leafletMap.get_items()
        for (var p in places) {
            citymap.render_mobile_details_card(places[p])
        }
        $('#detail-area .mobile-load').hide()
    },

    render_mobile_details_card: function(object) {
        // _append_ to dom
        var unconfirmedClass = (object.unconfirmed) ? " unconfirmed" : ""
        $('#detail-area').append('<div class="entry-card' + unconfirmedClass + '" id="details-'+object.id+'">'
            + '<h3>'+object.name+'</h3>'
            + '<div class="details">'
            + '<p>' + object.anschrift + '<br/>'
            + '</p>'
            // + '<a href="/website/geo/' + object.id + '" title="Zeige Details">mehr Infos</a>'
            + '<a href="javascript:citymap.show_selected_detail(' + object.id + ', false)" title="Zeige Details">mehr Infos</a>'
            + '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z=' + encodeURIComponent(object.anschrift)
                + '&REQ0JourneyStopsZA1=2&start=1&pk_campaign=kiezatlas.de">'
                + '<img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
            + '</div>'
        + '</div>')
        /** var $item = create_list_item(object)
        $item.click(function(e) {
            var itemId = e.target.getAttribute(DATA_TOPIC_ID)
            if (!itemId) itemId = e.delegateTarget.getAttribute(DATA_TOPIC_ID)
            citymap.show_selected_detail(object.id, true)
        })
        $('#detail-area .results').append($item) **/
        $('#detail-area .mobile-load').show()
    },

    show_selected_details: function(result_list) {
        var list_geo_object_ids = []
        for (var i in result_list) {
            var marker_id = result_list[i].options['id']
            list_geo_object_ids.push(marker_id)
            citymap.show_selected_detail(marker_id, false)
        }
    },

    clear_and_select_places_tab: function() {
        $('.tabular.menu .item').tab('change tab', 'first')
        $('#detail-area .search-option.d').remove()
        $('#detail-area .entry-card').remove()
    },

    show_selected_detail: function(marker_id, focusOnMap) {
        // 1) switch to "Orte" tab
        citymap.clear_and_select_places_tab()
        // 2) highlight/focus marker on map
        leafletMap.highlight_geo_object_marker_by_id(marker_id, focusOnMap)
        // 2) load basics
        restc.load_geo_object_detail(marker_id, function(result) {
            citymap.render_selected_detail(result)
            // 2.1) load facets
            restc.load_facetted_geo_object(marker_id, kiezatlas.get_site_id(), function(obj) {
                citymap.render_geo_object_facets(obj)
            })
            // 2.2) display angebote in an extra tab
            // ### TODO: angebote angebote.load_geo_objects_angebote(list_geo_object_ids)
        })
    },

    clear_details_area: function() { // remove duplicate, see ka-website.js
        $('.search-option.d').remove()
        var $entryCards = $('.entry-card')
        $entryCards.hide(200, "linear", function () { $entryCards.remove() })
    },

    render_selected_detail: function(object) {
        // var imprint_html = kiezatlas.get_imprint_html(object)
        var contact = object.kontakt
        // var opening_hours = object.oeffnungszeiten
        var lor_link = kiezatlas.get_lor_link(object)
        var fahrinfoLink = '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z=' + object.address_name.toString()
                + '&REQ0JourneyStopsZA1=2&start=1&pk_campaign=kiezatlas.de">'
                + '<img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
        var angebote_link = ''
        if (object.angebote_count > 0) {
            angebote_link = '<div class="angebote-link">'
                + '<a class="button" href="/website/geo/' + object.id + '">Aktuelle Angebote anzeigen</a></div>'
        }
        if (kiezatlas.get_site_info() && !kiezatlas.get_site_info().fahrinfoLink) {
            fahrinfoLink = ''
        }
        var body_text = ""
        // if (description) body_text += '<p><b>Info</b> ' + description + '</p>'
        if (typeof contact !== "undefined" && contact.value.length > 0) {
            // var fax = undefined, email = undefined, telefon = undefined, person = undefined
            var contact_text = "<br/>"
            // skipping ansprechpartner and email
            if (contact.childs.hasOwnProperty('ka2.kontakt.telefon')
                && contact.childs['ka2.kontakt.telefon'].value.length > 0) {
                contact_text += 'Tel.: ' + contact.childs['ka2.kontakt.telefon'].value  + '<br/>'
            }
            if (contact.childs.hasOwnProperty('ka2.kontakt.fax')
                && contact.childs['ka2.kontakt.fax'].value.length > 0) {
                contact_text += 'Fax: ' + contact.childs['ka2.kontakt.fax'].value
            }
            body_text += '<p><b>Kontakt</b>' + contact_text + '</p>'
        }
        var unconfirmedClass = (object.unconfirmed) ? " unconfirmed" : ""
        $('#detail-area').append('<div class="entry-card' + unconfirmedClass + '" id="details-'+object.id+'">'
            + '<h3>'+object.name+'</h3>'
            + '<div class="details">'
            + '<p>'
                + object.address_name.toString() + '<br/>'
                + '' + body_text + ''
            + '</p>'
            + angebote_link
            + '<div class="facets"></div>'
            // + '<a href="/website/geo/' + object.id + '" class="mobile-more" title="Zeige Details">mehr Infos</a>'
            + fahrinfoLink
            + '</div>'
            + lor_link
        + '</div>')
    },

    render_geo_object_facets: function(geoobject) {
        if (!facetTypeDefs) {
            console.warn("Could not load facetTypeDefs", facetTypeDefs)
            return
        }
        var $facetForm = $('#details-' + geoobject.id + ' .facets')
        for (var fi in facetTypeDefs) {
            var facetTopicType = facetTypeDefs[fi]
            // Analyze Type Definition
            var facetTypeUri = citymap.get_first_child_type_uri(facetTopicType)
            var assocDefType = facetTopicType.assoc_defs[0].type_uri
            var assocDefCardinality = facetTopicType.assoc_defs[0].child_cardinality_uri
            var facetValueTopics = geoobject.childs[facetTypeUri]
            // console.log("Geo Object Facet", facetValueTopics, facetTypeUri, assocDefType, assocDefCardinality)
            // Construct Label and Container
            var facetName = (facetTopicType.value.indexOf(" Facet") != -1) ? facetTopicType.value.replace(" Facet", "") : facetTopicType.value
            var $facetLabel = $('<div class="facet">' + facetName + '</div>')
            var $facetLabelDiv = $('<div class="facet-values">')
            var $facetValue = $('<span class="values">')
            // Helper to initialize the correct input field options on demand
            var valuesExist = true
            // Composition Definition (currently just ONE)
            if (assocDefType.indexOf("composition_def") !== -1) {
                if (assocDefCardinality.indexOf("many") !== -1) { // many, demo just the first value
                    if (facetValueTopics.length > 0) {
                        $facetValue = $('<span class="composition-def-many values">')
                        if (facetValueTopics[0]) {
                            $facetValue.html(facetValueTopics[0].value)
                        }
                    } else {
                        valuesExist = false
                    }
                } else {
                    if (facetValueTopics) {
                        $facetValue = $('<span class="composition-def-one values">')
                        // build a hyperlink-hack
                        if (facetName.indexOf("Link") !== -1 && facetValueTopics.value.indexOf("http") !== -1) {
                            $facetValue.html("<a target=\"_blank\" href=\""+facetValueTopics.value+"\">"+facetValueTopics.value+"</a>")
                        } else {
                            $facetValue.html(facetValueTopics.value)
                        }
                    } else {
                        valuesExist = false
                    }
                }
            // Aggregation_def, selector (ONE or MANY)
            } else if (assocDefType.indexOf("aggregation_def") !== -1) {
                if (assocDefCardinality.indexOf("many") !== -1) {
                    $facetValue = $('<ul class="aggregated-def-many values" id="'+facetTopicType.uri+'">')
                    for (var fi in facetValueTopics) {
                        var facetValueOption = facetValueTopics[fi]
                        var $facetInputOption = $('<li>' + facetValueOption.value + '</li>')
                        $facetValue.append($facetInputOption)
                    }
                    if (facetValueTopics.length === 0) {
                        valuesExist = false
                    }
                } else {
                    $facetValue = $('<ul class="aggregated-def-one values" id="'+facetTopicType.uri+'">')
                    if (facetValueTopics) {
                        $facetValue.append($('<li>' + facetValueTopics.value + '</li>'))
                    } else {
                        valuesExist = false
                    }
                }
            }
            if (valuesExist) {
                $facetLabelDiv.append($facetValue)
                $facetLabel.append($facetLabelDiv)
                $facetForm.append($facetLabel)
            }
        }
    },

    get_first_child_type_uri: function(topicType) {
        var childType = topicType.assoc_defs[0]
        if (childType.role_2.role_type_uri === "dm4.core.child_type") {
            return childType.role_2.topic_uri
        } else {
            return childType.role_1.topic_uri
        }
    },

    render_info_area: function(siteTopic) {
        $('.citymap-title').text(siteTopic.value)
        $('.welcome .title').text(siteTopic.value)
        $('.welcome .slogan').text('')
        $('#sidebar .imprint').html('<a href="'+siteTopic.imprint+'" target="_blank">Impressum</a>')
        $('.welcome .logo').attr("src", siteTopic.logo).attr("title", "Logo " + siteTopic.value)
        $('#sidebar .content-area').html(siteTopic.html)
    },

    // requires a certain dom structure and an instance of ka-website.js as "kiezatlas"
    do_citymap_fulltext_search: function(query) {
        kiezatlas.do_text_search_geo_objects(query.trim(), function(geoobjects) {
            hide_loading_indicator()
            // switch to results tab
            if ($('.tabular.menu #search-tab').length === 0) {
                $('.tabular.menu').append('<div id="search-tab" class="item" data-tab="third">Suche</div>')
            }
            $('.tabular.menu .item').tab('change tab', 'third')
            // render list of results in orte section
            var $ul = $('#search-area ul.results')
            if (geoobjects.length > 0) {
                $ul.empty()
            }
            // sorted?
            for (var geoidx in geoobjects) {
                var obj = geoobjects[geoidx]
                var $item = create_list_item(obj)
                $item.click(function(e) {
                    var itemId = e.target.getAttribute(DATA_TOPIC_ID)
                    if (!itemId) itemId = e.delegateTarget.getAttribute(DATA_TOPIC_ID)
                    citymap.show_selected_detail(itemId, true)
                })
                $ul.append($item)
            }
        })
        show_loading_indicator()
    },

    select_criteria: function(critName, criteriaId) {
        if ($('.tabular.menu #category-tab').length === 0) {
            $('.tabular.menu').append('<div id="category-tab" class="item" data-tab="fourth">Kategorien</div>')
        }
        $('#category-area .title.criteria').text(critName)
        $('#category-area .title.criteria').attr(DATA_TOPIC_ID, criteriaId)
        $('#category-area .title.criteria').unbind("click")
        $('#category-area .title.criteria').bind("click", function(e) {
            citymap.select_criteria(critName, criteriaId)
        })
        $('.tabular.menu .item').tab('change tab', 'fourth')
        var $ul = $('#category-area ul.results')
            $ul.removeClass("cats")
            $ul.empty()
        restc.load_topics_by_type(criteriaId, function(categories) {
            // console.log("Loaded Categories", categories)
            for (var c in categories) {
                var cat = categories[c]
                var $listitem = $("<li id=\"" + cat.id + "\" data-topic-id=\"" + cat.id + "\">"
                        + "<span class=\"label\" data-topic-id=\"" + cat.id + "\">" + cat.value + "</span></li>")
                    $listitem.click(function(e) {
                        var categoryId = e.target.getAttribute(DATA_TOPIC_ID)
                        citymap.select_category(categoryId)
                    })
                $ul.append($listitem)
            }
            // ...
        })
    },

    select_category: function(categoryId) {
        restc.load_geo_objects_by_category(kiezatlas.get_site_id(), categoryId, function(results) {
            // console.log("Loaded Geo Objects by Category", categoryId, results)
            var $ul = $('#category-area ul.results')
            if (results.length > 0) {
                $ul.addClass("cats")
                $ul.empty()
                for (var r in results) {
                    var geoobject = results[r]
                    var $item = create_list_item(geoobject)
                    $item.click(function(e) {
                        var itemId = e.target.getAttribute(DATA_TOPIC_ID)
                        if (!itemId) itemId = e.delegateTarget.getAttribute(DATA_TOPIC_ID)
                        citymap.show_selected_detail(itemId, true)
                    })
                    $ul.append($item)
                }
            } else {
                $("#" + categoryId).append("<span class=\"status\">(Keine Treffer)</span>")
            }
        })
    },

    // require a certain dom structure and an instance of ka-map.js as "leafletMap"
    register_page_handlers: function() {

        $(window).resize(function() {
            setTimeout(function() {
                leafletMap.fit_to_height(65)
                citymap.set_sidebar_height()
            }, 50)
        })

        // add click and touch handlers on our "three near by options"
        // kiezatlas.add_nearby_button_handler()

        $('.citymap .ui.search input').keyup(function(e) {
            if (e.target.value.length >= 3 && e.keyCode === 13) {
                citymap.do_citymap_fulltext_search(e.target.value)
            }
        })

        $('.citymap .ui.search button').click(function(e) {
            var query = $('.citymap .ui.search input').val()
            if (query.length >= 3) {
                citymap.do_citymap_fulltext_search(query)
            }
        })

        leafletMap.listen_to('marker_select', function(e) {
            $('.tabular.menu .item').tab('change tab', 'first')
        })

        // Activate register cards/tabs menu
        $('.tabular.menu .item').tab()

    },

    render_criteria_menu: function(criterias)  {
        var $div = $('.criterias')
            $div.empty()
        var $list = $('<ul class="items">')
            $div.append($list)
        for (var i in criterias) {
            var crit = criterias[i]
            var $item = $('<li>')
            var $link = $('<a id="'+crit.uri+'" href="#crit-' + crit.id + '">' + crit.value + '</a>')
                $link.click(function(e) {
                    console.log("Selected Criteria", e.target.text, e.target.id)
                    citymap.select_criteria(e.target.text, e.target.id)
                })
            $list.append($item.append($link))
        }
    },

    set_sidebar_height: function() {
        if ($('#karte').css("display") === "none") {
            $('#sidebar').height(window.innerHeight - 4)
        } else {
            $('#sidebar').height(window.innerHeight - 36)
        }
    }

}

/*!
 * # Semantic UI 2.2.2 - Sidebar
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */
!function(e,i,n,t){"use strict";i="undefined"!=typeof i&&i.Math==Math?i:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")(),e.fn.sidebar=function(o){var r,s=e(this),a=e(i),l=e(n),c=e("html"),u=e("head"),d=s.selector||"",f=(new Date).getTime(),b=[],h=arguments[0],m="string"==typeof h,g=[].slice.call(arguments,1),v=i.requestAnimationFrame||i.mozRequestAnimationFrame||i.webkitRequestAnimationFrame||i.msRequestAnimationFrame||function(e){setTimeout(e,0)};return s.each(function(){var s,p,y,C,k,w,T=e.isPlainObject(o)?e.extend(!0,{},e.fn.sidebar.settings,o):e.extend({},e.fn.sidebar.settings),x=T.selector,S=T.className,A=T.namespace,F=T.regExp,O=T.error,P="."+A,E="module-"+A,H=e(this),M=e(T.context),D=H.children(x.sidebar),j=M.children(x.fixed),R=M.children(x.pusher),z=this,B=H.data(E);w={initialize:function(){w.debug("Initializing sidebar",o),w.create.id(),k=w.get.transitionEvent(),w.is.ios()&&w.set.ios(),T.delaySetup?v(w.setup.layout):w.setup.layout(),v(function(){w.setup.cache()}),w.instantiate()},instantiate:function(){w.verbose("Storing instance of module",w),B=w,H.data(E,w)},create:{id:function(){y=(Math.random().toString(16)+"000000000").substr(2,8),p="."+y,w.verbose("Creating unique id for element",y)}},destroy:function(){w.verbose("Destroying previous module for",H),H.off(P).removeData(E),w.is.ios()&&w.remove.ios(),M.off(p),a.off(p),l.off(p)},event:{clickaway:function(e){var i=R.find(e.target).length>0||R.is(e.target),n=M.is(e.target);i&&(w.verbose("User clicked on dimmed page"),w.hide()),n&&(w.verbose("User clicked on dimmable context (scaled out page)"),w.hide())},touch:function(e){},containScroll:function(e){z.scrollTop<=0&&(z.scrollTop=1),z.scrollTop+z.offsetHeight>=z.scrollHeight&&(z.scrollTop=z.scrollHeight-z.offsetHeight-1)},scroll:function(i){0===e(i.target).closest(x.sidebar).length&&i.preventDefault()}},bind:{clickaway:function(){w.verbose("Adding clickaway events to context",M),T.closable&&M.on("click"+p,w.event.clickaway).on("touchend"+p,w.event.clickaway)},scrollLock:function(){T.scrollLock&&(w.debug("Disabling page scroll"),a.on("DOMMouseScroll"+p,w.event.scroll)),w.verbose("Adding events to contain sidebar scroll"),l.on("touchmove"+p,w.event.touch),H.on("scroll"+P,w.event.containScroll)}},unbind:{clickaway:function(){w.verbose("Removing clickaway events from context",M),M.off(p)},scrollLock:function(){w.verbose("Removing scroll lock from page"),l.off(p),a.off(p),H.off("scroll"+P)}},add:{inlineCSS:function(){var i,n=w.cache.width||H.outerWidth(),t=w.cache.height||H.outerHeight(),o=w.is.rtl(),r=w.get.direction(),a={left:n,right:-n,top:t,bottom:-t};o&&(w.verbose("RTL detected, flipping widths"),a.left=-n,a.right=n),i="<style>","left"===r||"right"===r?(w.debug("Adding CSS rules for animation distance",n),i+=" .ui.visible."+r+".sidebar ~ .fixed, .ui.visible."+r+".sidebar ~ .pusher {   -webkit-transform: translate3d("+a[r]+"px, 0, 0);           transform: translate3d("+a[r]+"px, 0, 0); }"):("top"===r||"bottom"==r)&&(i+=" .ui.visible."+r+".sidebar ~ .fixed, .ui.visible."+r+".sidebar ~ .pusher {   -webkit-transform: translate3d(0, "+a[r]+"px, 0);           transform: translate3d(0, "+a[r]+"px, 0); }"),w.is.ie()&&("left"===r||"right"===r?(w.debug("Adding CSS rules for animation distance",n),i+=" body.pushable > .ui.visible."+r+".sidebar ~ .pusher:after {   -webkit-transform: translate3d("+a[r]+"px, 0, 0);           transform: translate3d("+a[r]+"px, 0, 0); }"):("top"===r||"bottom"==r)&&(i+=" body.pushable > .ui.visible."+r+".sidebar ~ .pusher:after {   -webkit-transform: translate3d(0, "+a[r]+"px, 0);           transform: translate3d(0, "+a[r]+"px, 0); }"),i+=" body.pushable > .ui.visible.left.sidebar ~ .ui.visible.right.sidebar ~ .pusher:after, body.pushable > .ui.visible.right.sidebar ~ .ui.visible.left.sidebar ~ .pusher:after {   -webkit-transform: translate3d(0px, 0, 0);           transform: translate3d(0px, 0, 0); }"),i+="</style>",s=e(i).appendTo(u),w.debug("Adding sizing css to head",s)}},refresh:function(){w.verbose("Refreshing selector cache"),M=e(T.context),D=M.children(x.sidebar),R=M.children(x.pusher),j=M.children(x.fixed),w.clear.cache()},refreshSidebars:function(){w.verbose("Refreshing other sidebars"),D=M.children(x.sidebar)},repaint:function(){w.verbose("Forcing repaint event"),z.style.display="none";z.offsetHeight;z.scrollTop=z.scrollTop,z.style.display=""},setup:{cache:function(){w.cache={width:H.outerWidth(),height:H.outerHeight(),rtl:"rtl"==H.css("direction")}},layout:function(){0===M.children(x.pusher).length&&(w.debug("Adding wrapper element for sidebar"),w.error(O.pusher),R=e('<div class="pusher" />'),M.children().not(x.omitted).not(D).wrapAll(R),w.refresh()),(0===H.nextAll(x.pusher).length||H.nextAll(x.pusher)[0]!==R[0])&&(w.debug("Moved sidebar to correct parent element"),w.error(O.movedSidebar,z),H.detach().prependTo(M),w.refresh()),w.clear.cache(),w.set.pushable(),w.set.direction()}},attachEvents:function(i,n){var t=e(i);n=e.isFunction(w[n])?w[n]:w.toggle,t.length>0?(w.debug("Attaching sidebar events to element",i,n),t.on("click"+P,n)):w.error(O.notFound,i)},show:function(i){if(i=e.isFunction(i)?i:function(){},w.is.hidden()){if(w.refreshSidebars(),T.overlay&&(w.error(O.overlay),T.transition="overlay"),w.refresh(),w.othersActive())if(w.debug("Other sidebars currently visible"),T.exclusive){if("overlay"!=T.transition)return void w.hideOthers(w.show);w.hideOthers()}else T.transition="overlay";w.pushPage(function(){i.call(z),T.onShow.call(z)}),T.onChange.call(z),T.onVisible.call(z)}else w.debug("Sidebar is already visible")},hide:function(i){i=e.isFunction(i)?i:function(){},(w.is.visible()||w.is.animating())&&(w.debug("Hiding sidebar",i),w.refreshSidebars(),w.pullPage(function(){i.call(z),T.onHidden.call(z)}),T.onChange.call(z),T.onHide.call(z))},othersAnimating:function(){return D.not(H).filter("."+S.animating).length>0},othersVisible:function(){return D.not(H).filter("."+S.visible).length>0},othersActive:function(){return w.othersVisible()||w.othersAnimating()},hideOthers:function(e){var i=D.not(H).filter("."+S.visible),n=i.length,t=0;e=e||function(){},i.sidebar("hide",function(){t++,t==n&&e()})},toggle:function(){w.verbose("Determining toggled direction"),w.is.hidden()?w.show():w.hide()},pushPage:function(i){var n,t,o,r=w.get.transition(),s="overlay"===r||w.othersActive()?H:R;i=e.isFunction(i)?i:function(){},"scale down"==T.transition&&w.scrollToTop(),w.set.transition(r),w.repaint(),n=function(){w.bind.clickaway(),w.add.inlineCSS(),w.set.animating(),w.set.visible()},t=function(){w.set.dimmed()},o=function(e){e.target==s[0]&&(s.off(k+p,o),w.remove.animating(),w.bind.scrollLock(),i.call(z))},s.off(k+p),s.on(k+p,o),v(n),T.dimPage&&!w.othersVisible()&&v(t)},pullPage:function(i){var n,t,o=w.get.transition(),r="overlay"==o||w.othersActive()?H:R;i=e.isFunction(i)?i:function(){},w.verbose("Removing context push state",w.get.direction()),w.unbind.clickaway(),w.unbind.scrollLock(),n=function(){w.set.transition(o),w.set.animating(),w.remove.visible(),T.dimPage&&!w.othersVisible()&&R.removeClass(S.dimmed)},t=function(e){e.target==r[0]&&(r.off(k+p,t),w.remove.animating(),w.remove.transition(),w.remove.inlineCSS(),("scale down"==o||T.returnScroll&&w.is.mobile())&&w.scrollBack(),i.call(z))},r.off(k+p),r.on(k+p,t),v(n)},scrollToTop:function(){w.verbose("Scrolling to top of page to avoid animation issues"),C=e(i).scrollTop(),H.scrollTop(0),i.scrollTo(0,0)},scrollBack:function(){w.verbose("Scrolling back to original page position"),i.scrollTo(0,C)},clear:{cache:function(){w.verbose("Clearing cached dimensions"),w.cache={}}},set:{ios:function(){c.addClass(S.ios)},pushed:function(){M.addClass(S.pushed)},pushable:function(){M.addClass(S.pushable)},dimmed:function(){R.addClass(S.dimmed)},active:function(){H.addClass(S.active)},animating:function(){H.addClass(S.animating)},transition:function(e){e=e||w.get.transition(),H.addClass(e)},direction:function(e){e=e||w.get.direction(),H.addClass(S[e])},visible:function(){H.addClass(S.visible)},overlay:function(){H.addClass(S.overlay)}},remove:{inlineCSS:function(){w.debug("Removing inline css styles",s),s&&s.length>0&&s.remove()},ios:function(){c.removeClass(S.ios)},pushed:function(){M.removeClass(S.pushed)},pushable:function(){M.removeClass(S.pushable)},active:function(){H.removeClass(S.active)},animating:function(){H.removeClass(S.animating)},transition:function(e){e=e||w.get.transition(),H.removeClass(e)},direction:function(e){e=e||w.get.direction(),H.removeClass(S[e])},visible:function(){H.removeClass(S.visible)},overlay:function(){H.removeClass(S.overlay)}},get:{direction:function(){return H.hasClass(S.top)?S.top:H.hasClass(S.right)?S.right:H.hasClass(S.bottom)?S.bottom:S.left},transition:function(){var e,i=w.get.direction();return e=w.is.mobile()?"auto"==T.mobileTransition?T.defaultTransition.mobile[i]:T.mobileTransition:"auto"==T.transition?T.defaultTransition.computer[i]:T.transition,w.verbose("Determined transition",e),e},transitionEvent:function(){var e,i=n.createElement("element"),o={transition:"transitionend",OTransition:"oTransitionEnd",MozTransition:"transitionend",WebkitTransition:"webkitTransitionEnd"};for(e in o)if(i.style[e]!==t)return o[e]}},is:{ie:function(){var e=!i.ActiveXObject&&"ActiveXObject"in i,n="ActiveXObject"in i;return e||n},ios:function(){var e=navigator.userAgent,i=e.match(F.ios),n=e.match(F.mobileChrome);return i&&!n?(w.verbose("Browser was found to be iOS",e),!0):!1},mobile:function(){var e=navigator.userAgent,i=e.match(F.mobile);return i?(w.verbose("Browser was found to be mobile",e),!0):(w.verbose("Browser is not mobile, using regular transition",e),!1)},hidden:function(){return!w.is.visible()},visible:function(){return H.hasClass(S.visible)},open:function(){return w.is.visible()},closed:function(){return w.is.hidden()},vertical:function(){return H.hasClass(S.top)},animating:function(){return M.hasClass(S.animating)},rtl:function(){return w.cache.rtl===t&&(w.cache.rtl="rtl"==H.css("direction")),w.cache.rtl}},setting:function(i,n){if(w.debug("Changing setting",i,n),e.isPlainObject(i))e.extend(!0,T,i);else{if(n===t)return T[i];e.isPlainObject(T[i])?e.extend(!0,T[i],n):T[i]=n}},internal:function(i,n){if(e.isPlainObject(i))e.extend(!0,w,i);else{if(n===t)return w[i];w[i]=n}},debug:function(){!T.silent&&T.debug&&(T.performance?w.performance.log(arguments):(w.debug=Function.prototype.bind.call(console.info,console,T.name+":"),w.debug.apply(console,arguments)))},verbose:function(){!T.silent&&T.verbose&&T.debug&&(T.performance?w.performance.log(arguments):(w.verbose=Function.prototype.bind.call(console.info,console,T.name+":"),w.verbose.apply(console,arguments)))},error:function(){T.silent||(w.error=Function.prototype.bind.call(console.error,console,T.name+":"),w.error.apply(console,arguments))},performance:{log:function(e){var i,n,t;T.performance&&(i=(new Date).getTime(),t=f||i,n=i-t,f=i,b.push({Name:e[0],Arguments:[].slice.call(e,1)||"",Element:z,"Execution Time":n})),clearTimeout(w.performance.timer),w.performance.timer=setTimeout(w.performance.display,500)},display:function(){var i=T.name+":",n=0;f=!1,clearTimeout(w.performance.timer),e.each(b,function(e,i){n+=i["Execution Time"]}),i+=" "+n+"ms",d&&(i+=" '"+d+"'"),(console.group!==t||console.table!==t)&&b.length>0&&(console.groupCollapsed(i),console.table?console.table(b):e.each(b,function(e,i){console.log(i.Name+": "+i["Execution Time"]+"ms")}),console.groupEnd()),b=[]}},invoke:function(i,n,o){var s,a,l,c=B;return n=n||g,o=z||o,"string"==typeof i&&c!==t&&(i=i.split(/[\. ]/),s=i.length-1,e.each(i,function(n,o){var r=n!=s?o+i[n+1].charAt(0).toUpperCase()+i[n+1].slice(1):i;if(e.isPlainObject(c[r])&&n!=s)c=c[r];else{if(c[r]!==t)return a=c[r],!1;if(!e.isPlainObject(c[o])||n==s)return c[o]!==t?(a=c[o],!1):(w.error(O.method,i),!1);c=c[o]}})),e.isFunction(a)?l=a.apply(o,n):a!==t&&(l=a),e.isArray(r)?r.push(l):r!==t?r=[r,l]:l!==t&&(r=l),a}},m?(B===t&&w.initialize(),w.invoke(h)):(B!==t&&w.invoke("destroy"),w.initialize())}),r!==t?r:this},e.fn.sidebar.settings={name:"Sidebar",namespace:"sidebar",silent:!1,debug:!1,verbose:!1,performance:!0,transition:"auto",mobileTransition:"auto",defaultTransition:{computer:{left:"uncover",right:"uncover",top:"overlay",bottom:"overlay"},mobile:{left:"uncover",right:"uncover",top:"overlay",bottom:"overlay"}},context:"body",exclusive:!1,closable:!0,dimPage:!0,scrollLock:!1,returnScroll:!1,delaySetup:!1,duration:500,onChange:function(){},onShow:function(){},onHide:function(){},onHidden:function(){},onVisible:function(){},className:{active:"active",animating:"animating",dimmed:"dimmed",ios:"ios",pushable:"pushable",pushed:"pushed",right:"right",top:"top",left:"left",bottom:"bottom",visible:"visible"},selector:{fixed:".fixed",omitted:"script, link, style, .ui.modal, .ui.dimmer, .ui.nag, .ui.fixed",pusher:".pusher",sidebar:".ui.sidebar"},regExp:{ios:/(iPad|iPhone|iPod)/g,mobileChrome:/(CriOS)/g,mobile:/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/g},error:{method:"The method you called is not defined.",pusher:"Had to add pusher element. For optimal performance make sure body content is inside a pusher element",movedSidebar:"Had to move sidebar. For optimal performance make sure sidebar and pusher are direct children of your body tag",overlay:"The overlay setting is no longer supported, use animation: overlay",notFound:"There were no elements that matched the specified selector"}}}(jQuery,window,document);
/*!
 * # Semantic UI 2.2.2 - Checkbox
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */
!function(e,n,t,i){"use strict";n="undefined"!=typeof n&&n.Math==Math?n:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")(),e.fn.checkbox=function(o){var a,c=e(this),r=c.selector||"",d=(new Date).getTime(),l=[],s=arguments[0],u="string"==typeof s,b=[].slice.call(arguments,1);return c.each(function(){var c,h,g=e.extend(!0,{},e.fn.checkbox.settings,o),p=g.className,f=g.namespace,k=g.selector,m=g.error,v="."+f,y="module-"+f,C=e(this),x=e(this).children(k.label),w=e(this).children(k.input),I=w[0],D=!1,S=!1,E=C.data(y),O=this;h={initialize:function(){h.verbose("Initializing checkbox",g),h.create.label(),h.bind.events(),h.set.tabbable(),h.hide.input(),h.observeChanges(),h.instantiate(),h.setup()},instantiate:function(){h.verbose("Storing instance of module",h),E=h,C.data(y,h)},destroy:function(){h.verbose("Destroying module"),h.unbind.events(),h.show.input(),C.removeData(y)},fix:{reference:function(){C.is(k.input)&&(h.debug("Behavior called on <input> adjusting invoked element"),C=C.closest(k.checkbox),h.refresh())}},setup:function(){h.set.initialLoad(),h.is.indeterminate()?(h.debug("Initial value is indeterminate"),h.indeterminate()):h.is.checked()?(h.debug("Initial value is checked"),h.check()):(h.debug("Initial value is unchecked"),h.uncheck()),h.remove.initialLoad()},refresh:function(){x=C.children(k.label),w=C.children(k.input),I=w[0]},hide:{input:function(){h.verbose("Modifying <input> z-index to be unselectable"),w.addClass(p.hidden)}},show:{input:function(){h.verbose("Modifying <input> z-index to be selectable"),w.removeClass(p.hidden)}},observeChanges:function(){"MutationObserver"in n&&(c=new MutationObserver(function(e){h.debug("DOM tree modified, updating selector cache"),h.refresh()}),c.observe(O,{childList:!0,subtree:!0}),h.debug("Setting up mutation observer",c))},attachEvents:function(n,t){var i=e(n);t=e.isFunction(h[t])?h[t]:h.toggle,i.length>0?(h.debug("Attaching checkbox events to element",n,t),i.on("click"+v,t)):h.error(m.notFound)},event:{click:function(n){var t=e(n.target);return t.is(k.input)?void h.verbose("Using default check action on initialized checkbox"):t.is(k.link)?void h.debug("Clicking link inside checkbox, skipping toggle"):(h.toggle(),w.focus(),void n.preventDefault())},keydown:function(e){var n=e.which,t={enter:13,space:32,escape:27};n==t.escape?(h.verbose("Escape key pressed blurring field"),w.blur(),S=!0):e.ctrlKey||n!=t.space&&n!=t.enter?S=!1:(h.verbose("Enter/space key pressed, toggling checkbox"),h.toggle(),S=!0)},keyup:function(e){S&&e.preventDefault()}},check:function(){h.should.allowCheck()&&(h.debug("Checking checkbox",w),h.set.checked(),h.should.ignoreCallbacks()||(g.onChecked.call(I),g.onChange.call(I)))},uncheck:function(){h.should.allowUncheck()&&(h.debug("Unchecking checkbox"),h.set.unchecked(),h.should.ignoreCallbacks()||(g.onUnchecked.call(I),g.onChange.call(I)))},indeterminate:function(){return h.should.allowIndeterminate()?void h.debug("Checkbox is already indeterminate"):(h.debug("Making checkbox indeterminate"),h.set.indeterminate(),void(h.should.ignoreCallbacks()||(g.onIndeterminate.call(I),g.onChange.call(I))))},determinate:function(){return h.should.allowDeterminate()?void h.debug("Checkbox is already determinate"):(h.debug("Making checkbox determinate"),h.set.determinate(),void(h.should.ignoreCallbacks()||(g.onDeterminate.call(I),g.onChange.call(I))))},enable:function(){return h.is.enabled()?void h.debug("Checkbox is already enabled"):(h.debug("Enabling checkbox"),h.set.enabled(),g.onEnable.call(I),void g.onEnabled.call(I))},disable:function(){return h.is.disabled()?void h.debug("Checkbox is already disabled"):(h.debug("Disabling checkbox"),h.set.disabled(),g.onDisable.call(I),void g.onDisabled.call(I))},get:{radios:function(){var n=h.get.name();return e('input[name="'+n+'"]').closest(k.checkbox)},otherRadios:function(){return h.get.radios().not(C)},name:function(){return w.attr("name")}},is:{initialLoad:function(){return D},radio:function(){return w.hasClass(p.radio)||"radio"==w.attr("type")},indeterminate:function(){return w.prop("indeterminate")!==i&&w.prop("indeterminate")},checked:function(){return w.prop("checked")!==i&&w.prop("checked")},disabled:function(){return w.prop("disabled")!==i&&w.prop("disabled")},enabled:function(){return!h.is.disabled()},determinate:function(){return!h.is.indeterminate()},unchecked:function(){return!h.is.checked()}},should:{allowCheck:function(){return h.is.determinate()&&h.is.checked()&&!h.should.forceCallbacks()?(h.debug("Should not allow check, checkbox is already checked"),!1):g.beforeChecked.apply(I)===!1?(h.debug("Should not allow check, beforeChecked cancelled"),!1):!0},allowUncheck:function(){return h.is.determinate()&&h.is.unchecked()&&!h.should.forceCallbacks()?(h.debug("Should not allow uncheck, checkbox is already unchecked"),!1):g.beforeUnchecked.apply(I)===!1?(h.debug("Should not allow uncheck, beforeUnchecked cancelled"),!1):!0},allowIndeterminate:function(){return h.is.indeterminate()&&!h.should.forceCallbacks()?(h.debug("Should not allow indeterminate, checkbox is already indeterminate"),!1):g.beforeIndeterminate.apply(I)===!1?(h.debug("Should not allow indeterminate, beforeIndeterminate cancelled"),!1):!0},allowDeterminate:function(){return h.is.determinate()&&!h.should.forceCallbacks()?(h.debug("Should not allow determinate, checkbox is already determinate"),!1):g.beforeDeterminate.apply(I)===!1?(h.debug("Should not allow determinate, beforeDeterminate cancelled"),!1):!0},forceCallbacks:function(){return h.is.initialLoad()&&g.fireOnInit},ignoreCallbacks:function(){return D&&!g.fireOnInit}},can:{change:function(){return!(C.hasClass(p.disabled)||C.hasClass(p.readOnly)||w.prop("disabled")||w.prop("readonly"))},uncheck:function(){return"boolean"==typeof g.uncheckable?g.uncheckable:!h.is.radio()}},set:{initialLoad:function(){D=!0},checked:function(){return h.verbose("Setting class to checked"),C.removeClass(p.indeterminate).addClass(p.checked),h.is.radio()&&h.uncheckOthers(),!h.is.indeterminate()&&h.is.checked()?void h.debug("Input is already checked, skipping input property change"):(h.verbose("Setting state to checked",I),w.prop("indeterminate",!1).prop("checked",!0),void h.trigger.change())},unchecked:function(){return h.verbose("Removing checked class"),C.removeClass(p.indeterminate).removeClass(p.checked),!h.is.indeterminate()&&h.is.unchecked()?void h.debug("Input is already unchecked"):(h.debug("Setting state to unchecked"),w.prop("indeterminate",!1).prop("checked",!1),void h.trigger.change())},indeterminate:function(){return h.verbose("Setting class to indeterminate"),C.addClass(p.indeterminate),h.is.indeterminate()?void h.debug("Input is already indeterminate, skipping input property change"):(h.debug("Setting state to indeterminate"),w.prop("indeterminate",!0),void h.trigger.change())},determinate:function(){return h.verbose("Removing indeterminate class"),C.removeClass(p.indeterminate),h.is.determinate()?void h.debug("Input is already determinate, skipping input property change"):(h.debug("Setting state to determinate"),void w.prop("indeterminate",!1))},disabled:function(){return h.verbose("Setting class to disabled"),C.addClass(p.disabled),h.is.disabled()?void h.debug("Input is already disabled, skipping input property change"):(h.debug("Setting state to disabled"),w.prop("disabled","disabled"),void h.trigger.change())},enabled:function(){return h.verbose("Removing disabled class"),C.removeClass(p.disabled),h.is.enabled()?void h.debug("Input is already enabled, skipping input property change"):(h.debug("Setting state to enabled"),w.prop("disabled",!1),void h.trigger.change())},tabbable:function(){h.verbose("Adding tabindex to checkbox"),w.attr("tabindex")===i&&w.attr("tabindex",0)}},remove:{initialLoad:function(){D=!1}},trigger:{change:function(){var e=t.createEvent("HTMLEvents"),n=w[0];n&&(h.verbose("Triggering native change event"),e.initEvent("change",!0,!1),n.dispatchEvent(e))}},create:{label:function(){w.prevAll(k.label).length>0?(w.prev(k.label).detach().insertAfter(w),h.debug("Moving existing label",x)):h.has.label()||(x=e("<label>").insertAfter(w),h.debug("Creating label",x))}},has:{label:function(){return x.length>0}},bind:{events:function(){h.verbose("Attaching checkbox events"),C.on("click"+v,h.event.click).on("keydown"+v,k.input,h.event.keydown).on("keyup"+v,k.input,h.event.keyup)}},unbind:{events:function(){h.debug("Removing events"),C.off(v)}},uncheckOthers:function(){var e=h.get.otherRadios();h.debug("Unchecking other radios",e),e.removeClass(p.checked)},toggle:function(){return h.can.change()?void(h.is.indeterminate()||h.is.unchecked()?(h.debug("Currently unchecked"),h.check()):h.is.checked()&&h.can.uncheck()&&(h.debug("Currently checked"),h.uncheck())):void(h.is.radio()||h.debug("Checkbox is read-only or disabled, ignoring toggle"))},setting:function(n,t){if(h.debug("Changing setting",n,t),e.isPlainObject(n))e.extend(!0,g,n);else{if(t===i)return g[n];e.isPlainObject(g[n])?e.extend(!0,g[n],t):g[n]=t}},internal:function(n,t){if(e.isPlainObject(n))e.extend(!0,h,n);else{if(t===i)return h[n];h[n]=t}},debug:function(){!g.silent&&g.debug&&(g.performance?h.performance.log(arguments):(h.debug=Function.prototype.bind.call(console.info,console,g.name+":"),h.debug.apply(console,arguments)))},verbose:function(){!g.silent&&g.verbose&&g.debug&&(g.performance?h.performance.log(arguments):(h.verbose=Function.prototype.bind.call(console.info,console,g.name+":"),h.verbose.apply(console,arguments)))},error:function(){g.silent||(h.error=Function.prototype.bind.call(console.error,console,g.name+":"),h.error.apply(console,arguments))},performance:{log:function(e){var n,t,i;g.performance&&(n=(new Date).getTime(),i=d||n,t=n-i,d=n,l.push({Name:e[0],Arguments:[].slice.call(e,1)||"",Element:O,"Execution Time":t})),clearTimeout(h.performance.timer),h.performance.timer=setTimeout(h.performance.display,500)},display:function(){var n=g.name+":",t=0;d=!1,clearTimeout(h.performance.timer),e.each(l,function(e,n){t+=n["Execution Time"]}),n+=" "+t+"ms",r&&(n+=" '"+r+"'"),(console.group!==i||console.table!==i)&&l.length>0&&(console.groupCollapsed(n),console.table?console.table(l):e.each(l,function(e,n){console.log(n.Name+": "+n["Execution Time"]+"ms")}),console.groupEnd()),l=[]}},invoke:function(n,t,o){var c,r,d,l=E;return t=t||b,o=O||o,"string"==typeof n&&l!==i&&(n=n.split(/[\. ]/),c=n.length-1,e.each(n,function(t,o){var a=t!=c?o+n[t+1].charAt(0).toUpperCase()+n[t+1].slice(1):n;if(e.isPlainObject(l[a])&&t!=c)l=l[a];else{if(l[a]!==i)return r=l[a],!1;if(!e.isPlainObject(l[o])||t==c)return l[o]!==i?(r=l[o],!1):(h.error(m.method,n),!1);l=l[o]}})),e.isFunction(r)?d=r.apply(o,t):r!==i&&(d=r),e.isArray(a)?a.push(d):a!==i?a=[a,d]:d!==i&&(a=d),r}},u?(E===i&&h.initialize(),h.invoke(s)):(E!==i&&E.invoke("destroy"),h.initialize())}),a!==i?a:this},e.fn.checkbox.settings={name:"Checkbox",namespace:"checkbox",silent:!1,debug:!1,verbose:!0,performance:!0,uncheckable:"auto",fireOnInit:!1,onChange:function(){},beforeChecked:function(){},beforeUnchecked:function(){},beforeDeterminate:function(){},beforeIndeterminate:function(){},onChecked:function(){},onUnchecked:function(){},onDeterminate:function(){},onIndeterminate:function(){},onEnable:function(){},onDisable:function(){},onEnabled:function(){},onDisabled:function(){},className:{checked:"checked",indeterminate:"indeterminate",disabled:"disabled",hidden:"hidden",radio:"radio",readOnly:"read-only"},error:{method:"The method you called is not defined"},selector:{checkbox:".ui.checkbox",label:"label, .box",input:'input[type="checkbox"], input[type="radio"]',link:"a[href]"}}}(jQuery,window,document);
/*!
 * # Semantic UI 2.2.2 - API
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */
!function(e,t,r,n){"use strict";var t="undefined"!=typeof t&&t.Math==Math?t:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")();e.api=e.fn.api=function(r){var o,s=e(e.isFunction(this)?t:this),i=s.selector||"",a=(new Date).getTime(),u=[],c=arguments[0],d="string"==typeof c,l=[].slice.call(arguments,1);return s.each(function(){var s,g,f,p,m,b,v=e.isPlainObject(r)?e.extend(!0,{},e.fn.api.settings,r):e.extend({},e.fn.api.settings),h=v.namespace,y=v.metadata,q=v.selector,R=v.error,x=v.className,S="."+h,A="module-"+h,k=e(this),T=k.closest(q.form),P=v.stateContext?e(v.stateContext):k,j=this,O=P[0],w=k.data(A);b={initialize:function(){d||b.bind.events(),b.instantiate()},instantiate:function(){b.verbose("Storing instance of module",b),w=b,k.data(A,w)},destroy:function(){b.verbose("Destroying previous module for",j),k.removeData(A).off(S)},bind:{events:function(){var e=b.get.event();e?(b.verbose("Attaching API events to element",e),k.on(e+S,b.event.trigger)):"now"==v.on&&(b.debug("Querying API endpoint immediately"),b.query())}},decode:{json:function(e){if(e!==n&&"string"==typeof e)try{e=JSON.parse(e)}catch(t){}return e}},read:{cachedResponse:function(e){var r;return t.Storage===n?void b.error(R.noStorage):(r=sessionStorage.getItem(e),b.debug("Using cached response",e,r),r=b.decode.json(r))}},write:{cachedResponse:function(r,o){return o&&""===o?void b.debug("Response empty, not caching",o):t.Storage===n?void b.error(R.noStorage):(e.isPlainObject(o)&&(o=JSON.stringify(o)),sessionStorage.setItem(r,o),void b.verbose("Storing cached response for url",r,o))}},query:function(){if(b.is.disabled())return void b.debug("Element is disabled API request aborted");if(b.is.loading()){if(!v.interruptRequests)return void b.debug("Cancelling request, previous request is still pending");b.debug("Interrupting previous request"),b.abort()}return v.defaultData&&e.extend(!0,v.urlData,b.get.defaultData()),v.serializeForm&&(v.data=b.add.formData(v.data)),g=b.get.settings(),g===!1?(b.cancelled=!0,void b.error(R.beforeSend)):(b.cancelled=!1,f=b.get.templatedURL(),f||b.is.mocked()?(f=b.add.urlData(f),f||b.is.mocked()?(g.url=v.base+f,s=e.extend(!0,{},v,{type:v.method||v.type,data:p,url:v.base+f,beforeSend:v.beforeXHR,success:function(){},failure:function(){},complete:function(){}}),b.debug("Querying URL",s.url),b.verbose("Using AJAX settings",s),"local"===v.cache&&b.read.cachedResponse(f)?(b.debug("Response returned from local cache"),b.request=b.create.request(),void b.request.resolveWith(O,[b.read.cachedResponse(f)])):void(v.throttle?v.throttleFirstRequest||b.timer?(b.debug("Throttling request",v.throttle),clearTimeout(b.timer),b.timer=setTimeout(function(){b.timer&&delete b.timer,b.debug("Sending throttled request",p,s.method),b.send.request()},v.throttle)):(b.debug("Sending request",p,s.method),b.send.request(),b.timer=setTimeout(function(){},v.throttle)):(b.debug("Sending request",p,s.method),b.send.request()))):void 0):void b.error(R.missingURL))},should:{removeError:function(){return v.hideError===!0||"auto"===v.hideError&&!b.is.form()}},is:{disabled:function(){return k.filter(q.disabled).length>0},expectingJSON:function(){return"json"===v.dataType||"jsonp"===v.dataType},form:function(){return k.is("form")||P.is("form")},mocked:function(){return v.mockResponse||v.mockResponseAsync||v.response||v.responseAsync},input:function(){return k.is("input")},loading:function(){return b.request?"pending"==b.request.state():!1},abortedRequest:function(e){return e&&e.readyState!==n&&0===e.readyState?(b.verbose("XHR request determined to be aborted"),!0):(b.verbose("XHR request was not aborted"),!1)},validResponse:function(t){return b.is.expectingJSON()&&e.isFunction(v.successTest)?(b.debug("Checking JSON returned success",v.successTest,t),v.successTest(t)?(b.debug("Response passed success test",t),!0):(b.debug("Response failed success test",t),!1)):(b.verbose("Response is not JSON, skipping validation",v.successTest,t),!0)}},was:{cancelled:function(){return b.cancelled||!1},succesful:function(){return b.request&&"resolved"==b.request.state()},failure:function(){return b.request&&"rejected"==b.request.state()},complete:function(){return b.request&&("resolved"==b.request.state()||"rejected"==b.request.state())}},add:{urlData:function(t,r){var o,s;return t&&(o=t.match(v.regExp.required),s=t.match(v.regExp.optional),r=r||v.urlData,o&&(b.debug("Looking for required URL variables",o),e.each(o,function(o,s){var i=-1!==s.indexOf("$")?s.substr(2,s.length-3):s.substr(1,s.length-2),a=e.isPlainObject(r)&&r[i]!==n?r[i]:k.data(i)!==n?k.data(i):P.data(i)!==n?P.data(i):r[i];return a===n?(b.error(R.requiredParameter,i,t),t=!1,!1):(b.verbose("Found required variable",i,a),a=v.encodeParameters?b.get.urlEncodedValue(a):a,t=t.replace(s,a),void 0)})),s&&(b.debug("Looking for optional URL variables",o),e.each(s,function(o,s){var i=-1!==s.indexOf("$")?s.substr(3,s.length-4):s.substr(2,s.length-3),a=e.isPlainObject(r)&&r[i]!==n?r[i]:k.data(i)!==n?k.data(i):P.data(i)!==n?P.data(i):r[i];a!==n?(b.verbose("Optional variable Found",i,a),t=t.replace(s,a)):(b.verbose("Optional variable not found",i),t=-1!==t.indexOf("/"+s)?t.replace("/"+s,""):t.replace(s,""))}))),t},formData:function(t){var r,o=e.fn.serializeObject!==n,s=o?T.serializeObject():T.serialize();return t=t||v.data,r=e.isPlainObject(t),r?o?(b.debug("Extending existing data with form data",t,s),t=e.extend(!0,{},t,s)):(b.error(R.missingSerialize),b.debug("Cant extend data. Replacing data with form data",t,s),t=s):(b.debug("Adding form data",s),t=s),t}},send:{request:function(){b.set.loading(),b.request=b.create.request(),b.is.mocked()?b.mockedXHR=b.create.mockedXHR():b.xhr=b.create.xhr(),v.onRequest.call(O,b.request,b.xhr)}},event:{trigger:function(e){b.query(),("submit"==e.type||"click"==e.type)&&e.preventDefault()},xhr:{always:function(){},done:function(t,r,n){var o=this,s=(new Date).getTime()-m,i=v.loadingDuration-s,a=e.isFunction(v.onResponse)?b.is.expectingJSON()?v.onResponse.call(o,e.extend(!0,{},t)):v.onResponse.call(o,t):!1;i=i>0?i:0,a&&(b.debug("Modified API response in onResponse callback",v.onResponse,a,t),t=a),i>0&&b.debug("Response completed early delaying state change by",i),setTimeout(function(){b.is.validResponse(t)?b.request.resolveWith(o,[t,n]):b.request.rejectWith(o,[n,"invalid"])},i)},fail:function(e,t,r){var n=this,o=(new Date).getTime()-m,s=v.loadingDuration-o;s=s>0?s:0,s>0&&b.debug("Response completed early delaying state change by",s),setTimeout(function(){b.is.abortedRequest(e)?b.request.rejectWith(n,[e,"aborted",r]):b.request.rejectWith(n,[e,"error",t,r])},s)}},request:{done:function(e,t){b.debug("Successful API Response",e),"local"===v.cache&&f&&(b.write.cachedResponse(f,e),b.debug("Saving server response locally",b.cache)),v.onSuccess.call(O,e,k,t)},complete:function(e,t){var r,n;b.was.succesful()?(n=e,r=t):(r=e,n=b.get.responseFromXHR(r)),b.remove.loading(),v.onComplete.call(O,n,k,r)},fail:function(e,t,r){var o=b.get.responseFromXHR(e),i=b.get.errorFromRequest(o,t,r);return"aborted"==t?(b.debug("XHR Aborted (Most likely caused by page navigation or CORS Policy)",t,r),v.onAbort.call(O,t,k,e),!0):("invalid"==t?b.debug("JSON did not pass success test. A server-side error has most likely occurred",o):"error"==t&&e!==n&&(b.debug("XHR produced a server error",t,r),200!=e.status&&r!==n&&""!==r&&b.error(R.statusMessage+r,s.url),v.onError.call(O,i,k,e)),v.errorDuration&&"aborted"!==t&&(b.debug("Adding error state"),b.set.error(),b.should.removeError()&&setTimeout(b.remove.error,v.errorDuration)),b.debug("API Request failed",i,e),void v.onFailure.call(O,o,k,e))}}},create:{request:function(){return e.Deferred().always(b.event.request.complete).done(b.event.request.done).fail(b.event.request.fail)},mockedXHR:function(){var t,r,n,o=!1,s=!1,i=!1,a=v.mockResponse||v.response,u=v.mockResponseAsync||v.responseAsync;return n=e.Deferred().always(b.event.xhr.complete).done(b.event.xhr.done).fail(b.event.xhr.fail),a?(e.isFunction(a)?(b.debug("Using specified synchronous callback",a),r=a.call(O,g)):(b.debug("Using settings specified response",a),r=a),n.resolveWith(O,[r,o,{responseText:r}])):e.isFunction(u)&&(t=function(e){b.debug("Async callback returned response",e),e?n.resolveWith(O,[e,o,{responseText:e}]):n.rejectWith(O,[{responseText:e},s,i])},b.debug("Using specified async response callback",u),u.call(O,g,t)),n},xhr:function(){var t;return t=e.ajax(s).always(b.event.xhr.always).done(b.event.xhr.done).fail(b.event.xhr.fail),b.verbose("Created server request",t,s),t}},set:{error:function(){b.verbose("Adding error state to element",P),P.addClass(x.error)},loading:function(){b.verbose("Adding loading state to element",P),P.addClass(x.loading),m=(new Date).getTime()}},remove:{error:function(){b.verbose("Removing error state from element",P),P.removeClass(x.error)},loading:function(){b.verbose("Removing loading state from element",P),P.removeClass(x.loading)}},get:{responseFromXHR:function(t){return e.isPlainObject(t)?b.is.expectingJSON()?b.decode.json(t.responseText):t.responseText:!1},errorFromRequest:function(t,r,o){return e.isPlainObject(t)&&t.error!==n?t.error:v.error[r]!==n?v.error[r]:o},request:function(){return b.request||!1},xhr:function(){return b.xhr||!1},settings:function(){var t;return t=v.beforeSend.call(O,v),t&&(t.success!==n&&(b.debug("Legacy success callback detected",t),b.error(R.legacyParameters,t.success),t.onSuccess=t.success),t.failure!==n&&(b.debug("Legacy failure callback detected",t),b.error(R.legacyParameters,t.failure),t.onFailure=t.failure),t.complete!==n&&(b.debug("Legacy complete callback detected",t),b.error(R.legacyParameters,t.complete),t.onComplete=t.complete)),t===n&&b.error(R.noReturnedValue),t===!1?t:t!==n?e.extend(!0,{},t):e.extend(!0,{},v)},urlEncodedValue:function(e){var r=t.decodeURIComponent(e),n=t.encodeURIComponent(e),o=r!==e;return o?(b.debug("URL value is already encoded, avoiding double encoding",e),e):(b.verbose("Encoding value using encodeURIComponent",e,n),n)},defaultData:function(){var t={};return e.isWindow(j)||(b.is.input()?t.value=k.val():b.is.form()||(t.text=k.text())),t},event:function(){return e.isWindow(j)||"now"==v.on?(b.debug("API called without element, no events attached"),!1):"auto"==v.on?k.is("input")?j.oninput!==n?"input":j.onpropertychange!==n?"propertychange":"keyup":k.is("form")?"submit":"click":v.on},templatedURL:function(e){if(e=e||k.data(y.action)||v.action||!1,f=k.data(y.url)||v.url||!1)return b.debug("Using specified url",f),f;if(e){if(b.debug("Looking up url for action",e,v.api),v.api[e]===n&&!b.is.mocked())return void b.error(R.missingAction,v.action,v.api);f=v.api[e]}else b.is.form()&&(f=k.attr("action")||P.attr("action")||!1,b.debug("No url or action specified, defaulting to form action",f));return f}},abort:function(){var e=b.get.xhr();e&&"resolved"!==e.state()&&(b.debug("Cancelling API request"),e.abort())},reset:function(){b.remove.error(),b.remove.loading()},setting:function(t,r){if(b.debug("Changing setting",t,r),e.isPlainObject(t))e.extend(!0,v,t);else{if(r===n)return v[t];e.isPlainObject(v[t])?e.extend(!0,v[t],r):v[t]=r}},internal:function(t,r){if(e.isPlainObject(t))e.extend(!0,b,t);else{if(r===n)return b[t];b[t]=r}},debug:function(){!v.silent&&v.debug&&(v.performance?b.performance.log(arguments):(b.debug=Function.prototype.bind.call(console.info,console,v.name+":"),b.debug.apply(console,arguments)))},verbose:function(){!v.silent&&v.verbose&&v.debug&&(v.performance?b.performance.log(arguments):(b.verbose=Function.prototype.bind.call(console.info,console,v.name+":"),b.verbose.apply(console,arguments)))},error:function(){v.silent||(b.error=Function.prototype.bind.call(console.error,console,v.name+":"),b.error.apply(console,arguments))},performance:{log:function(e){var t,r,n;v.performance&&(t=(new Date).getTime(),n=a||t,r=t-n,a=t,u.push({Name:e[0],Arguments:[].slice.call(e,1)||"","Execution Time":r})),clearTimeout(b.performance.timer),b.performance.timer=setTimeout(b.performance.display,500)},display:function(){var t=v.name+":",r=0;a=!1,clearTimeout(b.performance.timer),e.each(u,function(e,t){r+=t["Execution Time"]}),t+=" "+r+"ms",i&&(t+=" '"+i+"'"),(console.group!==n||console.table!==n)&&u.length>0&&(console.groupCollapsed(t),console.table?console.table(u):e.each(u,function(e,t){console.log(t.Name+": "+t["Execution Time"]+"ms")}),console.groupEnd()),u=[]}},invoke:function(t,r,s){var i,a,u,c=w;return r=r||l,s=j||s,"string"==typeof t&&c!==n&&(t=t.split(/[\. ]/),i=t.length-1,e.each(t,function(r,o){var s=r!=i?o+t[r+1].charAt(0).toUpperCase()+t[r+1].slice(1):t;if(e.isPlainObject(c[s])&&r!=i)c=c[s];else{if(c[s]!==n)return a=c[s],!1;if(!e.isPlainObject(c[o])||r==i)return c[o]!==n?(a=c[o],!1):(b.error(R.method,t),!1);c=c[o]}})),e.isFunction(a)?u=a.apply(s,r):a!==n&&(u=a),e.isArray(o)?o.push(u):o!==n?o=[o,u]:u!==n&&(o=u),a}},d?(w===n&&b.initialize(),b.invoke(c)):(w!==n&&w.invoke("destroy"),b.initialize())}),o!==n?o:this},e.api.settings={name:"API",namespace:"api",debug:!1,verbose:!1,performance:!0,api:{},cache:!0,interruptRequests:!0,on:"auto",stateContext:!1,loadingDuration:0,hideError:"auto",errorDuration:2e3,encodeParameters:!0,action:!1,url:!1,base:"",urlData:{},defaultData:!0,serializeForm:!1,throttle:0,throttleFirstRequest:!0,method:"get",data:{},dataType:"json",mockResponse:!1,mockResponseAsync:!1,response:!1,responseAsync:!1,beforeSend:function(e){return e},beforeXHR:function(e){},onRequest:function(e,t){},onResponse:!1,onSuccess:function(e,t){},onComplete:function(e,t){},onFailure:function(e,t){},onError:function(e,t){},onAbort:function(e,t){},successTest:!1,error:{beforeSend:"The before send function has aborted the request",error:"There was an error with your request",exitConditions:"API Request Aborted. Exit conditions met",JSONParse:"JSON could not be parsed during error handling",legacyParameters:"You are using legacy API success callback names",method:"The method you called is not defined",missingAction:"API action used but no url was defined",missingSerialize:"jquery-serialize-object is required to add form data to an existing data object",missingURL:"No URL specified for api event",noReturnedValue:"The beforeSend callback must return a settings object, beforeSend ignored.",noStorage:"Caching responses locally requires session storage",parseError:"There was an error parsing your request",requiredParameter:"Missing a required URL parameter: ",statusMessage:"Server gave an error: ",timeout:"Your request timed out"},regExp:{required:/\{\$*[A-z0-9]+\}/g,optional:/\{\/\$*[A-z0-9]+\}/g},className:{loading:"loading",error:"error"},selector:{disabled:".disabled",form:"form"},metadata:{action:"action",url:"url"}}}(jQuery,window,document);
/*!
 * # Semantic UI 2.2.2 - Search
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */
!function(e,t,s,n){"use strict";t="undefined"!=typeof t&&t.Math==Math?t:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")(),e.fn.search=function(r){var i,a=e(this),o=a.selector||"",c=(new Date).getTime(),u=[],l=arguments[0],d="string"==typeof l,f=[].slice.call(arguments,1);return e(this).each(function(){var g,h=e.isPlainObject(r)?e.extend(!0,{},e.fn.search.settings,r):e.extend({},e.fn.search.settings),p=h.className,v=h.metadata,m=h.regExp,b=h.fields,y=h.selector,R=h.error,C=h.namespace,w="."+C,x=C+"-module",j=e(this),k=j.find(y.prompt),A=j.find(y.searchButton),E=j.find(y.results),q=j.find(y.result),F=j.find(y.category),S=this,T=j.data(x),D=!1;g={initialize:function(){g.verbose("Initializing module"),g.determine.searchFields(),g.bind.events(),g.set.type(),g.create.results(),g.instantiate()},instantiate:function(){g.verbose("Storing instance of module",g),T=g,j.data(x,g)},destroy:function(){g.verbose("Destroying instance"),j.off(w).removeData(x)},refresh:function(){g.debug("Refreshing selector cache"),k=j.find(y.prompt),A=j.find(y.searchButton),F=j.find(y.category),E=j.find(y.results),q=j.find(y.result)},refreshResults:function(){E=j.find(y.results),q=j.find(y.result)},bind:{events:function(){g.verbose("Binding events to search"),h.automatic&&(j.on(g.get.inputEvent()+w,y.prompt,g.event.input),k.attr("autocomplete","off")),j.on("focus"+w,y.prompt,g.event.focus).on("blur"+w,y.prompt,g.event.blur).on("keydown"+w,y.prompt,g.handleKeyboard).on("click"+w,y.searchButton,g.query).on("mousedown"+w,y.results,g.event.result.mousedown).on("mouseup"+w,y.results,g.event.result.mouseup).on("click"+w,y.result,g.event.result.click)}},determine:{searchFields:function(){r&&r.searchFields!==n&&(h.searchFields=r.searchFields)}},event:{input:function(){clearTimeout(g.timer),g.timer=setTimeout(g.query,h.searchDelay)},focus:function(){g.set.focus(),g.has.minimumCharacters()&&(g.query(),g.can.show()&&g.showResults())},blur:function(e){var t=s.activeElement===this,n=function(){g.cancel.query(),g.remove.focus(),g.timer=setTimeout(g.hideResults,h.hideDelay)};t||(g.resultsClicked?(g.debug("Determining if user action caused search to close"),j.one("click.close"+w,y.results,function(e){return g.is.inMessage(e)||D?void k.focus():(D=!1,void(g.is.animating()||g.is.hidden()||n()))})):(g.debug("Input blurred without user action, closing results"),n()))},result:{mousedown:function(){g.resultsClicked=!0},mouseup:function(){g.resultsClicked=!1},click:function(s){g.debug("Search result selected");var n=e(this),r=n.find(y.title).eq(0),i=n.is("a[href]")?n:n.find("a[href]").eq(0),a=i.attr("href")||!1,o=i.attr("target")||!1,c=(r.html(),r.length>0?r.text():!1),u=g.get.results(),l=n.data(v.result)||g.get.result(c,u);return e.isFunction(h.onSelect)&&h.onSelect.call(S,l,u)===!1?(g.debug("Custom onSelect callback cancelled default select action"),void(D=!0)):(g.hideResults(),c&&g.set.value(c),void(a&&(g.verbose("Opening search link found in result",i),"_blank"==o||s.ctrlKey?t.open(a):t.location.href=a)))}}},handleKeyboard:function(e){var t,s=j.find(y.result),n=j.find(y.category),r=s.index(s.filter("."+p.active)),i=s.length,a=e.which,o={backspace:8,enter:13,escape:27,upArrow:38,downArrow:40};if(a==o.escape&&(g.verbose("Escape key pressed, blurring search field"),g.trigger.blur()),g.is.visible())if(a==o.enter){if(g.verbose("Enter key pressed, selecting active result"),s.filter("."+p.active).length>0)return g.event.result.click.call(s.filter("."+p.active),e),e.preventDefault(),!1}else a==o.upArrow?(g.verbose("Up key pressed, changing active result"),t=0>r-1?r:r-1,n.removeClass(p.active),s.removeClass(p.active).eq(t).addClass(p.active).closest(n).addClass(p.active),e.preventDefault()):a==o.downArrow&&(g.verbose("Down key pressed, changing active result"),t=r+1>=i?r:r+1,n.removeClass(p.active),s.removeClass(p.active).eq(t).addClass(p.active).closest(n).addClass(p.active),e.preventDefault());else a==o.enter&&(g.verbose("Enter key pressed, executing query"),g.query(),g.set.buttonPressed(),k.one("keyup",g.remove.buttonFocus))},setup:{api:function(t){var s={debug:h.debug,on:!1,cache:!0,action:"search",urlData:{query:t},onSuccess:function(e){g.parse.response.call(S,e,t)},onAbort:function(e){},onFailure:function(){g.displayMessage(R.serverError)},onError:g.error};e.extend(!0,s,h.apiSettings),g.verbose("Setting up API request",s),j.api(s)}},can:{useAPI:function(){return e.fn.api!==n},show:function(){return g.is.focused()&&!g.is.visible()&&!g.is.empty()},transition:function(){return h.transition&&e.fn.transition!==n&&j.transition("is supported")}},is:{animating:function(){return E.hasClass(p.animating)},hidden:function(){return E.hasClass(p.hidden)},inMessage:function(t){return t.target&&e(t.target).closest(y.message).length>0},empty:function(){return""===E.html()},visible:function(){return E.filter(":visible").length>0},focused:function(){return k.filter(":focus").length>0}},trigger:{blur:function(){var e=s.createEvent("HTMLEvents"),t=k[0];t&&(g.verbose("Triggering native blur event"),e.initEvent("blur",!1,!1),t.dispatchEvent(e))}},get:{inputEvent:function(){var e=k[0],t=e!==n&&e.oninput!==n?"input":e!==n&&e.onpropertychange!==n?"propertychange":"keyup";return t},value:function(){return k.val()},results:function(){var e=j.data(v.results);return e},result:function(t,s){var r=["title","id"],i=!1;return t=t!==n?t:g.get.value(),s=s!==n?s:g.get.results(),"category"===h.type?(g.debug("Finding result that matches",t),e.each(s,function(s,n){return e.isArray(n.results)&&(i=g.search.object(t,n.results,r)[0])?!1:void 0})):(g.debug("Finding result in results object",t),i=g.search.object(t,s,r)[0]),i||!1}},select:{firstResult:function(){g.verbose("Selecting first result"),q.first().addClass(p.active)}},set:{focus:function(){j.addClass(p.focus)},loading:function(){j.addClass(p.loading)},value:function(e){g.verbose("Setting search input value",e),k.val(e)},type:function(e){e=e||h.type,"category"==h.type&&j.addClass(h.type)},buttonPressed:function(){A.addClass(p.pressed)}},remove:{loading:function(){j.removeClass(p.loading)},focus:function(){j.removeClass(p.focus)},buttonPressed:function(){A.removeClass(p.pressed)}},query:function(){var t=g.get.value(),s=g.read.cache(t);g.has.minimumCharacters()?(s?(g.debug("Reading result from cache",t),g.save.results(s.results),g.addResults(s.html),g.inject.id(s.results)):(g.debug("Querying for",t),e.isPlainObject(h.source)||e.isArray(h.source)?g.search.local(t):g.can.useAPI()?g.search.remote(t):g.error(R.source)),h.onSearchQuery.call(S,t)):g.hideResults()},search:{local:function(e){var t,s=g.search.object(e,h.content);g.set.loading(),g.save.results(s),g.debug("Returned local search results",s),t=g.generateResults({results:s}),g.remove.loading(),g.addResults(t),g.inject.id(s),g.write.cache(e,{html:t,results:s})},remote:function(e){j.api("is loading")&&j.api("abort"),g.setup.api(e),j.api("query")},object:function(t,s,r){var i=[],a=[],o=t.toString().replace(m.escape,"\\$&"),c=new RegExp(m.beginsWith+o,"i"),u=function(t,s){var n=-1==e.inArray(s,i),r=-1==e.inArray(s,a);n&&r&&t.push(s)};return s=s||h.source,r=r!==n?r:h.searchFields,e.isArray(r)||(r=[r]),s===n||s===!1?(g.error(R.source),[]):(e.each(r,function(n,r){e.each(s,function(e,s){var n="string"==typeof s[r];n&&(-1!==s[r].search(c)?u(i,s):h.searchFullText&&g.fuzzySearch(t,s[r])&&u(a,s))})}),e.merge(i,a))}},fuzzySearch:function(e,t){var s=t.length,n=e.length;if("string"!=typeof e)return!1;if(e=e.toLowerCase(),t=t.toLowerCase(),n>s)return!1;if(n===s)return e===t;e:for(var r=0,i=0;n>r;r++){for(var a=e.charCodeAt(r);s>i;)if(t.charCodeAt(i++)===a)continue e;return!1}return!0},parse:{response:function(e,t){var s=g.generateResults(e);g.verbose("Parsing server response",e),e!==n&&t!==n&&e[b.results]!==n&&(g.addResults(s),g.inject.id(e[b.results]),g.write.cache(t,{html:s,results:e[b.results]}),g.save.results(e[b.results]))}},cancel:{query:function(){g.can.useAPI()&&j.api("abort")}},has:{minimumCharacters:function(){var e=g.get.value(),t=e.length;return t>=h.minCharacters}},clear:{cache:function(e){var t=j.data(v.cache);e?e&&t&&t[e]&&(g.debug("Removing value from cache",e),delete t[e],j.data(v.cache,t)):(g.debug("Clearing cache",e),j.removeData(v.cache))}},read:{cache:function(e){var t=j.data(v.cache);return h.cache?(g.verbose("Checking cache for generated html for query",e),"object"==typeof t&&t[e]!==n?t[e]:!1):!1}},create:{id:function(e,t){var s,r,i=e+1;return t!==n?(s=String.fromCharCode(97+t),r=s+i,g.verbose("Creating category result id",r)):(r=i,g.verbose("Creating result id",r)),r},results:function(){0===E.length&&(E=e("<div />").addClass(p.results).appendTo(j))}},inject:{result:function(e,t,s){g.verbose("Injecting result into results");var r=s!==n?E.children().eq(s).children(y.result).eq(t):E.children(y.result).eq(t);g.verbose("Injecting results metadata",r),r.data(v.result,e)},id:function(t){g.debug("Injecting unique ids into results");var s=0,r=0;return"category"===h.type?e.each(t,function(t,i){r=0,e.each(i.results,function(e,t){var a=i.results[e];a.id===n&&(a.id=g.create.id(r,s)),g.inject.result(a,r,s),r++}),s++}):e.each(t,function(e,s){var i=t[e];i.id===n&&(i.id=g.create.id(r)),g.inject.result(i,r),r++}),t}},save:{results:function(e){g.verbose("Saving current search results to metadata",e),j.data(v.results,e)}},write:{cache:function(e,t){var s=j.data(v.cache)!==n?j.data(v.cache):{};h.cache&&(g.verbose("Writing generated html to cache",e,t),s[e]=t,j.data(v.cache,s))}},addResults:function(t){return e.isFunction(h.onResultsAdd)&&h.onResultsAdd.call(E,t)===!1?(g.debug("onResultsAdd callback cancelled default action"),!1):void(t?(E.html(t),g.refreshResults(),h.selectFirstResult&&g.select.firstResult(),g.showResults()):g.hideResults())},showResults:function(){g.is.visible()||(g.can.transition()?(g.debug("Showing results with css animations"),E.transition({animation:h.transition+" in",debug:h.debug,verbose:h.verbose,duration:h.duration,queue:!0})):(g.debug("Showing results with javascript"),E.stop().fadeIn(h.duration,h.easing)),h.onResultsOpen.call(E))},hideResults:function(){g.is.visible()&&(g.can.transition()?(g.debug("Hiding results with css animations"),E.transition({animation:h.transition+" out",debug:h.debug,verbose:h.verbose,duration:h.duration,queue:!0})):(g.debug("Hiding results with javascript"),E.stop().fadeOut(h.duration,h.easing)),h.onResultsClose.call(E))},generateResults:function(t){g.debug("Generating html from response",t);var s=h.templates[h.type],n=e.isPlainObject(t[b.results])&&!e.isEmptyObject(t[b.results]),r=e.isArray(t[b.results])&&t[b.results].length>0,i="";return n||r?(h.maxResults>0&&(n?"standard"==h.type&&g.error(R.maxResults):t[b.results]=t[b.results].slice(0,h.maxResults)),e.isFunction(s)?i=s(t,b):g.error(R.noTemplate,!1)):h.showNoResults&&(i=g.displayMessage(R.noResults,"empty")),h.onResults.call(S,t),i},displayMessage:function(e,t){return t=t||"standard",g.debug("Displaying message",e,t),g.addResults(h.templates.message(e,t)),h.templates.message(e,t)},setting:function(t,s){if(e.isPlainObject(t))e.extend(!0,h,t);else{if(s===n)return h[t];h[t]=s}},internal:function(t,s){if(e.isPlainObject(t))e.extend(!0,g,t);else{if(s===n)return g[t];g[t]=s}},debug:function(){!h.silent&&h.debug&&(h.performance?g.performance.log(arguments):(g.debug=Function.prototype.bind.call(console.info,console,h.name+":"),g.debug.apply(console,arguments)))},verbose:function(){!h.silent&&h.verbose&&h.debug&&(h.performance?g.performance.log(arguments):(g.verbose=Function.prototype.bind.call(console.info,console,h.name+":"),g.verbose.apply(console,arguments)))},error:function(){h.silent||(g.error=Function.prototype.bind.call(console.error,console,h.name+":"),g.error.apply(console,arguments))},performance:{log:function(e){var t,s,n;h.performance&&(t=(new Date).getTime(),n=c||t,s=t-n,c=t,u.push({Name:e[0],Arguments:[].slice.call(e,1)||"",Element:S,"Execution Time":s})),clearTimeout(g.performance.timer),g.performance.timer=setTimeout(g.performance.display,500)},display:function(){var t=h.name+":",s=0;c=!1,clearTimeout(g.performance.timer),e.each(u,function(e,t){s+=t["Execution Time"]}),t+=" "+s+"ms",o&&(t+=" '"+o+"'"),a.length>1&&(t+=" ("+a.length+")"),(console.group!==n||console.table!==n)&&u.length>0&&(console.groupCollapsed(t),console.table?console.table(u):e.each(u,function(e,t){console.log(t.Name+": "+t["Execution Time"]+"ms")}),console.groupEnd()),u=[]}},invoke:function(t,s,r){var a,o,c,u=T;return s=s||f,r=S||r,"string"==typeof t&&u!==n&&(t=t.split(/[\. ]/),a=t.length-1,e.each(t,function(s,r){var i=s!=a?r+t[s+1].charAt(0).toUpperCase()+t[s+1].slice(1):t;if(e.isPlainObject(u[i])&&s!=a)u=u[i];else{if(u[i]!==n)return o=u[i],!1;if(!e.isPlainObject(u[r])||s==a)return u[r]!==n?(o=u[r],!1):!1;u=u[r]}})),e.isFunction(o)?c=o.apply(r,s):o!==n&&(c=o),e.isArray(i)?i.push(c):i!==n?i=[i,c]:c!==n&&(i=c),o}},d?(T===n&&g.initialize(),g.invoke(l)):(T!==n&&T.invoke("destroy"),g.initialize())}),i!==n?i:this},e.fn.search.settings={name:"Search",namespace:"search",silent:!1,debug:!1,verbose:!1,performance:!0,type:"standard",minCharacters:1,selectFirstResult:!1,apiSettings:!1,source:!1,searchFields:["title","description"],displayField:"",searchFullText:!0,automatic:!0,hideDelay:0,searchDelay:200,maxResults:7,cache:!0,showNoResults:!0,transition:"scale",duration:200,easing:"easeOutExpo",onSelect:!1,onResultsAdd:!1,onSearchQuery:function(e){},onResults:function(e){},onResultsOpen:function(){},onResultsClose:function(){},className:{animating:"animating",active:"active",empty:"empty",focus:"focus",hidden:"hidden",loading:"loading",results:"results",pressed:"down"},error:{source:"Cannot search. No source used, and Semantic API module was not included",noResults:"Your search returned no results",logging:"Error in debug logging, exiting.",noEndpoint:"No search endpoint was specified",noTemplate:"A valid template name was not specified.",serverError:"There was an issue querying the server.",maxResults:"Results must be an array to use maxResults setting",method:"The method you called is not defined."},metadata:{cache:"cache",results:"results",result:"result"},regExp:{escape:/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,beginsWith:"(?:s|^)"},fields:{categories:"results",categoryName:"name",categoryResults:"results",description:"description",image:"image",price:"price",results:"results",title:"title",url:"url",action:"action",actionText:"text",actionURL:"url"},selector:{prompt:".prompt",searchButton:".search.button",results:".results",message:".results > .message",category:".category",result:".result",title:".title, .name"},templates:{escape:function(e){var t=/[&<>"'`]/g,s=/[&<>"'`]/,n={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},r=function(e){return n[e]};return s.test(e)?e.replace(t,r):e},message:function(e,t){var s="";return e!==n&&t!==n&&(s+='<div class="message '+t+'">',s+="empty"==t?'<div class="header">No Results</div class="header"><div class="description">'+e+'</div class="description">':' <div class="description">'+e+"</div>",s+="</div>"),s},category:function(t,s){var r="";e.fn.search.settings.templates.escape;return t[s.categoryResults]!==n?(e.each(t[s.categoryResults],function(t,i){i[s.results]!==n&&i.results.length>0&&(r+='<div class="category">',i[s.categoryName]!==n&&(r+='<div class="name">'+i[s.categoryName]+"</div>"),e.each(i.results,function(e,t){r+=t[s.url]?'<a class="result" href="'+t[s.url]+'">':'<a class="result">',t[s.image]!==n&&(r+='<div class="image"> <img src="'+t[s.image]+'"></div>'),r+='<div class="content">',t[s.price]!==n&&(r+='<div class="price">'+t[s.price]+"</div>"),t[s.title]!==n&&(r+='<div class="title">'+t[s.title]+"</div>"),t[s.description]!==n&&(r+='<div class="description">'+t[s.description]+"</div>"),r+="</div>",r+="</a>"}),r+="</div>")}),t[s.action]&&(r+='<a href="'+t[s.action][s.actionURL]+'" class="action">'+t[s.action][s.actionText]+"</a>"),r):!1},standard:function(t,s){var r="";return t[s.results]!==n?(e.each(t[s.results],function(e,t){r+=t[s.url]?'<a class="result" href="'+t[s.url]+'">':'<a class="result">',t[s.image]!==n&&(r+='<div class="image"> <img src="'+t[s.image]+'"></div>'),r+='<div class="content">',t[s.price]!==n&&(r+='<div class="price">'+t[s.price]+"</div>"),t[s.title]!==n&&(r+='<div class="title">'+t[s.title]+"</div>"),t[s.description]!==n&&(r+='<div class="description">'+t[s.description]+"</div>"),r+="</div>",r+="</a>"}),t[s.action]&&(r+='<a href="'+t[s.action][s.actionURL]+'" class="action">'+t[s.action][s.actionText]+"</a>"),r):!1}}}}(jQuery,window,document);