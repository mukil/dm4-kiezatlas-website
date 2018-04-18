
/** --- ka-restclient.js --- **/

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
    "map_controls_results": false, // false, means: map_controls_query
    "set_site_info": function(topic) { model.site_info = topic },
    "set_site_id": function(topicId) { model.site_id = topicId },
    "get_site_info": function() { return model.site_info },
    "get_site_id": function() { return model.site_id },
    "set_districts": function(districts) { model.districts = districts },
    "get_districts": function() { return model.districts },
    "set_frontpage_mode": function() {
        model.set_site_info(undefined)
        model.set_site_id(undefined)
    },
    "set_angebotsfilter": function(value) { model.view_angebote = value },
    "set_mapcontrol_mode_results": function() {
        model.map_controls_results = true
        leafletMap.deactivate_circle_control()
        leafletMap.remove_circle_search_control()
    },
    "set_mapcontrol_mode_query": function(fitBounds) {
        model.map_controls_results = false
        if (!leafletMap.is_circle_query_active()) {
            leafletMap.activate_circle_control()
            leafletMap.render_circle_search_control(fitBounds)
            console.log("Activating circle query control...")
        } else {
            leafletMap.render_circle_search_control(fitBounds)
        }
    },
    "is_kiezatlas_site": function() { return (model.siteId) },
    "is_map_result_control": function() { return model.map_controls_results },
    "is_map_query_control": function() { return !model.map_controls_results },
    "is_angebote_mode": function() { return (model.view_angebote) },
    // ### Migrate from global scoope
    "month_names_de": [ "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember" ],
    "colors": {                  // kiezatlas hex colors
        "ka_blue": "#3e606f",       // circle control
        "ka_red": "#ce0000",        // districs layer polygon outline
        "ka_green": "#9cc300",      // ...
        "m_blue": "#9ec8d6",        // marker: medium blue outline and fill-in (selected)
        "ka_gold": "#f8f6e9",       // marker: yellow fill-ine and outline (selected)
        "bright_grey": "#a9a9a9",   // circlemarker: fill-in
        "yellow": "#f8f6e9",        // circle control
        "darkgrey": "#343434",      // unused
        "dark_blue": "#193441",     // unused
        "bright_blue": "#ecf4f7",   // unused
        "ka_water": "#ccdddd",      // unused
        "grey": "#868686",           // unused,
        "ka_yellow": "#f8f6e9", 
        "blue1": "#193441",
        "blue2": "#9ec8d6",
        "blue3": "#3787ab",
        "blue4": "#ecf4f7",
        "blue5": "#3e606f"
    }
}





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

    map.setup = function(elementId, mouseWheelZoom, newMap, initialZoom) {
        // console.log("Set up Leaflet Map #"+ elementId + ", mouseWheelZoom", mouseWheelZoom)
        if (newMap) {
            map.map = newMap
            map.elementId = 'map' // fallback: Leaflet map object seems not to store the element id it was initialized in
        } else {
            map.map = new L.Map(elementId)
            map.elementId = elementId
            L.tileLayer('https://api.tiles.mapbox.com/v4/kiezatlas.pd8lkp64/{z}/{x}/{y}.png?' // old style id="kiezatlas.map-feifsq6f"
                + 'access_token=pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6ImNpa3BndjU2ODAwYm53MGxzM3JtOXFmb2IifQ._PcBhOcfLYDD8RP3BS0U_g', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors,'
                + '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &#169; <a href="http://mapbox.com">Mapbox</a>',
                id: 'kiezatlas.m7222ia5'}).addTo(map.map)
        }
        L.Util.setOptions(map.map, {
            dragging: true, touchZoom: true, scrollWheelZoom: false, doubleClickZoom: true,
            zoomControl: false, minZoom: 9
        })
        map.map.setMaxBounds(mapping.max_bounds)
        // map.zoom = L.control.zoom({ position: "topright" })
        // map.zoom.addTo(map.map)
        L.control.scale( { imperial: false, updateWhenIdle: true } ).addTo(map.map)
        map.map.on('locationfound', map.on_browser_location_found)
        map.map.on('locationerror', map.on_browser_location_error) // ### just if user answers "never"
        map.map.on('dragend', map.on_map_drag_end)
        map.map.on('drag', map.on_map_drag)
        //
        mapping.control_group.addTo(map.map)
        map.map.setView(map.get_current_location_coords(), (initialZoom) ? initialZoom : mapping.zoom_kiez)
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
        // var hasAngebote = (marker_topic["angebote_count"] > 0) ? true : false
        // var angeboteDashArray = map.calculate_geo_object_dash_array(marker_topic)
        var angeboteId = (marker_topic.hasOwnProperty("angebots_id")) ? marker_topic["angebots_id"] : undefined
        return { // ### improve new colors for angebote rendering
            fillColor: model.colors.ka_yellow, color : model.colors.blue3, fillOpacity: 0.4, 
            lineCap: 'square', weight: 2, // dashArray: angeboteDashArray,
            title: marker_topic["name"], name: marker_topic["name"], alt: "Markierung von " + marker_topic["name"],
            bezirk_uri: marker_topic["bezirk_uri"], uri: marker_topic["uri"], // riseOnHover: true,
            bezirksregion_uri: marker_topic["bezirksregion_uri"], z_indexOffset: 1001, uri: marker_topic["uri"],
            angebote_count: marker_topic["angebote_count"], angebots_id: angeboteId, address: marker_topic["address"],
            id: marker_topic["id"], address_id: marker_topic["address_id"], location_id: marker_topic["location_id"]
        }
    }

    map.calculate_selected_circle_options = function() {
        return {
            color: model.colors.blue3, weight: 3, opacity: 1,
            fillColor: model.colors.blue2, fillOpacity: 1, className: "selected"
        }
    }

    map.calculate_hover_circle_options = function() {
        return {
            color: model.colors.blue3, weight: 3, opacity: 1,
            fillColor: model.colors.ka_yellow, fillOpacity: 1, className: "hover"
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
        console.log("fire geo marker select", map.elementId)
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

var kiezatlas = (function($, leafletMap, restc, favourites) {

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
                var url = "/" +parameter.page + viewportState
                window.history.replaceState(parameter, settings.webapp_title, url)
            }
        } else {
            console.warn("window.history manipulation not supported", window.navigator)
        }
        console.log("Pushing page view parameter in ka-website.js")
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
        } /**else if (_self.is_map_result_control() && query) {
            if (_self.is_angebote_mode()) {
                parameter.page = "#angebotssuche=" + query
            } else {
                parameter.page = "#ortssuche=" + query
            }
        } else if (_self.is_angebote_mode()) {
            parameter.page = "#angebote"
        } else {
            parameter.page = "#gesamt"
        } **/
        parameter.page = "website"
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
        var viewport = undefined // _self.get_map_viewport_from_url()
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
                } else if (parameter.page.indexOf("suche") !== -1) {
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
        render_district_menu() // should do "Gesamtstadtplan"
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
            clusterStyle1.setAttribute("href", "/de.kiezatlas.website/vendor/leaflet-1.3.1/MarkerCluster.css")
            clusterStyle1.setAttribute("rel", "stylesheet")
        var clusterStyle2 = document.createElement("link")
            clusterStyle2.setAttribute("href", "/de.kiezatlas.website/vendor/leaflet-1.3.1/MarkerCluster.Default.css")
            clusterStyle2.setAttribute("rel", "stylesheet")
        var clusterScript = document.createElement("script")
            clusterScript.setAttribute("src", "/de.kiezatlas.website/vendor/leaflet-1.3.1/leaflet.markercluster.js")
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
        console.log("District Menu Item Clicked", click_href, "onStartseite", frontpage, "ka-website.js")
        if (frontpage && click_href === "#gesamt") {
            kiezatlas.clear_district_page()
            render_page("gesamt")
        } else if (frontpage) {
            var bezirksTopic = get_bezirks_topic_by_hash(click_href)
            searchContext = bezirksTopic.id
            render_page("bezirk")
        } else {
            window.document.location.assign(window.document.location.origin + "/website" + click_href)
        }
        // _self.hide_sidebar()
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
        _self.register_map_listeners()
        _self.render_browser_location_button()
        _self.render_current_location_label()
        if (!skipCircleSearch) leafletMap.render_circle_search_control()
    }

    this.register_map_listeners = function() {
        var mapMovedSkipLocating = false // a local var to influence the outcome of the "browser locating" query
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
        var $sidebar = $('#map-sidebar')
            $sidebar.empty()
            $sidebar.show()
        for (var i in result_list) {
            var marker_model = result_list[i].options
            var marker_id = marker_model['id']
            $sidebar.append('<div class="entry"><h3>' + marker_model.name + '</h3><a href="/website/geo/' + marker_id + '">'
                + '<i class="icon caret right"></i>mehr Infos</a></div>')
            list_of_marker_ids.push(marker_id)
            restc.load_geo_object_detail(marker_id, function(result) {
                _self.render_selected_details_card(result)
            })
        }
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

})($, leafletMap, restc, favourites)


/** --- ka-citymap.js --- **/

var DATA_TOPIC_ID = "data-topic-id"

function create_list_item(obj) {
    if (obj != null) {
        return $('<li class="item" data-topic-id="'+obj.id+'"><h3>' + obj.name
            + ', <span class="anschrift">'+obj.anschrift.replace(" Deutschland", "") +'</span>, '
            + '<a href="javascript:citymap.show_selected_detail('+obj.id+', true);">mehr Infos</a></h3></li>')
    } else {
        console.log("Skipped creting null list item", obj)
    }
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
        // leafletMap.zoom.setPosition("topleft")
        leafletMap.deactivate_circle_control()
        leafletMap.remove_circle_search_control()
        // Init our map container
        // ### Todo: introduce new site configuration options (marker radius/size) with migration
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
        if (obj != null) {
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
        }
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
                leafletMap.fit_to_height(81)
                citymap.set_sidebar_height()
            }, 350)
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
