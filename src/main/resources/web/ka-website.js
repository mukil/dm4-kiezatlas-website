
/**
 * 
 * @type @new;_L5
 */
var kiezatlas = new function() {
    
    var _self = this

    this.default_radius = 750; /* default radius for circle search control (in meter) */
    this.circle_search_control = undefined
    // TODO: Increase max_bounds
    this.max_bounds = L.latLngBounds(L.latLng(52.298000, 12.909336), L.latLng(52.715646, 13.817779))
    this.webapp_title = "Kiezatlas 2 Website"

    // kiezatlas hex colors
    /** brighter blue #5a78f3, blue: "#1944fc" yellow: "#FFCC00"**/
    this.ka_blue = "#002856";
    this.blue = "#1944fc";
    this.ka_water = "#ccdddd";
    this.m_blue = "#5784b8";
    this.ka_red = "#8f1414";
    this.ka_gold = "#EACA8F";
    this.darkgrey = "#343434";
    this.bright_grey = "#a9a9a9";
    this.grey = "#868686";
    this.yellow = "#FFCC33";

    this.current_location = { name: "Neuenburger Straße, Berlin", coordinate: new L.latLng(52.5, 13.4) }
    this.locationsearch_results = [] // near-by search street-alternatives
    this.autocomplete_item = 0
    // Note: once a "district" set, no graphical query and circle dialog are available anymore
    // & all further queries get the district parameter appended!
    this.district = undefined
    //
    this.LEVEL_OF_DETAIL_ZOOM = 15 // the map focus when a map internal info Window is rendered
    this.LEVEL_OF_STREET_ZOOM = 14
    this.LEVEL_OF_KIEZ_ZOOM = 13
    this.LEVEL_OF_DISTRICT_ZOOM = 12
    this.LEVEL_OF_CITY_ZOOM = 11
    //
    this.location_circle = undefined
    //
    this.historyApiSupported = window.history.pushState
    //
    this.map = undefined
    // 
    this.markerGroup = undefined
    this.controlGroup = L.featureGroup()
    this.districtGroup = L.featureGroup()
    this.isMapCircleLocked = true
    // model of all geo-domain object in client
    this.items = []
    this.districts = []
    this.db = undefined // Does not work with IE / Breaks support for IE

    this.render_page = function() {
        // get current page alias
        var hash = window.location.hash
        if (!hash || hash == "#karte") {
            // render main kiezatlas page
            _self.init_map_dialog(true, undefined, false) // detectLocation=true
            _self.load_district_topics()
        } else {
            console.log("render sub-view", hash)
            // check if we should render district page
            _self.load_district_topics(function() {
                var district = _self.get_bezirks_topic_by_hash(hash)
                if (district) {
                    console.log("render sub-view for district", district.value)
                    _self.init_map_dialog(false, undefined, false) // detectLocation=false
                    // sets mitte filter
                    _self.render_district_page(district.id)
                }
            })
            // hash value not in districts
        }
        // add click and touch handlers on our "three near by options"
        _self.add_nearby_button_handler()
    }

    this.render_district_page = function(topic_id) {
        var bezirk = _self.get_bezirks_topic_by_id(topic_id)
        $('.location-label .text').html("Berlin " + bezirk.value) // duplicate, use render_current_location_label
        _self.update_document_title(undefined, bezirk.value)
        $('button.star').hide()
        // set page in "district" mode
        _self.district = bezirk
        // TODO: rewrite filter button container
        if ($('div.legende').children('a.district-control').length == 0) {
            $('div.legende').append('<a class="district-control" href="javascript:kiezatlas.clear_district_page()">'
                + 'Bezirksfilter aufheben</a>')
        }
        $('#fulltext-search').attr("placeholder", "Volltextsuche für " + bezirk.value)
        $('a.lock-control').hide()
        //
        _self.show_message("Hinweis: Die Volltextsuche liefert ab jetzt nur noch Ergebnisse aus dem Bezirk <em>"
            + bezirk.value + "</em>. W&auml;hlen sie <em>Bezirksfilter aufheben</em> um wieder Berlinweit"
            + " Einrichtungen zu finden.", 7000)
        // TODO: activate doubleClick to zoom on map
        _self.map.doubleClickZoom.enable();
        var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
        _self.jump_to_map(anchor_name)
        _self.remove_circle_search_control()
        _self.show_spinning_wheel()
        // _self.load_district_html()
        // _self.render_districts_layer()
        $.getJSON('/kiezatlas/bezirk/' + topic_id, function (response) {
            // TODO: render fetched "geo objects" in groups of hundred
            _self.clear_circle_marker_group()
            _self.hide_spinning_wheel()
            _self.render_geo_objects(response, true)
        })
    }

    this.clear_district_page = function() {
        _self.clear_district_filter_control()
        _self.do_current_center_circle_search()
    }

    this.clear_district_filter_control = function() {
        // 1) reset district filter for subsequent fulltext-searches
        _self.district = undefined
        $('#fulltext-search').attr("placeholder", "Volltextsuche")
        // 2) update gui accordingly
        $('a.district-control').remove()
        $('a.lock-control').show()
        _self.map.doubleClickZoom.disable();
        _self.clear_circle_marker_group()
    }

    this.do_current_center_circle_search = function() {
        _self.current_location.coordinate = _self.map.getCenter()
        _self.render_circle_search_control() // fitBounds=false
        _self.do_circle_search(undefined, undefined)
        _self.reverse_geocode()
        _self.map.setZoom(_self.LEVEL_OF_KIEZ_ZOOM)
    }

    this.init_map_dialog = function(detectLocation, zoomLevel, jumpToMap) {
        // initiaze map on browsers location
        if (typeof _self.map === "undefined") {
            _self.setup_leaflet_dom('map', false)
        }
        if (jumpToMap) _self.jump_to_map()
        if (detectLocation) _self.get_browser_location()
        if (zoomLevel) _self.map.setZoom(zoomLevel)
    }

    this.start_local_db = function() {
        // PouchDB.debug.enable('*')
        // PouchDB.debug.disable()
        // TODO: Try/Catch and check if IE is supported!
        _self.db = new PouchDB('kiezatlas_favourites')
    }
    
    this.add_entry_to_local_db = function() {
        // TODO; Use POST not PUT to auto-generate IDs
        // ### perform some kind of existence check
        get_next_id(function (next_id) {
            var entry = { _id : next_id, data: _self.current_location }
            _self.db.put(entry)
            _self.list_entries_in_local_db()
        })
        
        function get_next_id(handler) {
            _self.db.allDocs({include_docs: true})
                .then(function (result) {
                    var next_id = parseInt(result.total_rows)
                    handler("place_" + next_id)
                }).catch(function (err) {
                    console.log(err)
                })
        }
    }
    
    this.list_entries_in_local_db = function() {
        _self.db.allDocs({ include_docs: true, descending: true })
            .then(function (results) {
                if (results.total_rows > 0) {
                    $("#places .entries").empty()
                    for (var i in results.rows) {
                        var entry = results.rows[i]
                        if (typeof entry.doc.data !== "undefined") {
                            var $place_item = $('<li class="ui-menu-item submenu-item"><a id="'+entry.doc._id+'" href="#">' + entry.doc.data.name + '</a></li>')
                                $place_item.click(function (e) {
                                    _self.db.get(e.target.id).then(function (doc) {
                                        _self.show_favourite_location(doc.data)
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

    this.show_favourite_location = function(object) {
        //
        if (typeof _self.map === "undefined") {
            _self.setup_leaflet_dom('map', true)
        }
        //
        _self.current_location = object
        _self.render_current_location_label()
        // render radius control at new place
        _self.render_circle_search_control()
        // then fire query
        _self.do_circle_search(undefined, undefined)
        _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
    }

    this.setup_leaflet_dom = function(dom_el_id) {
        $('#map').empty()
        $('#map').addClass('outlined')
        $('#map').height('550px')
        $('#map').show()
        $('.search-option.d').css('display', 'inline-block')
        $('#detail-area').show()
        $("button.star").show()
        $("button.star").button()
        $("button.star").hover(function (e) {
            $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star-white.png')
        }, function (e) {
            $('button.star img').attr('src', '/de.kiezatlas.website/images/1441217865_black_5_favorite_star.png')
        })
        $('div.legende').show()
        // initiate map
        this.map = new L.Map(dom_el_id, {
            dragging: true, touchZoom: true, scrollWheelZoom: false,
            doubleClickZoom: false, zoomControl: false, minZoom: 9//,
            // TODO: Increase max_bounds to not interfere with a locked circle
            // maxBounds: _self.max_bounds,
        })
        // custom zoom control
        new L.control.zoom( { position: "topright" }).addTo(_self.map)
        // tile layer
        L.tileLayer('https://api.tiles.mapbox.com/v4/kiezatlas.map-feifsq6f/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6InFmRTdOWlUifQ.VjM4-2Ow6uuWR_7b49Y9Eg', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            id: '_self.m7222ia5',
            accessToken: 'pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6InFmRTdOWlUifQ.VjM4-2Ow6uuWR_7b49Y9Eg'
        }).addTo(_self.map)
        // browser location util
        _self.render_browser_location_button()
        _self.map.on('locationfound', _self.on_browser_location_found)
        _self.map.on('locationerror', _self.on_browser_location_error) // ### just if user answers "never"
        _self.map.on('dragend', _self.on_map_drag_end)
        _self.map.on('drag', _self.on_map_drag)
        // ### refactor from here on
        // show our standard location name
        _self.render_current_location_label()
        // render radius control at first place
        _self.render_circle_search_control()
        // correct current default viewport
        _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_KIEZ_ZOOM)
        console.log("> setup leaflet dom with zoomLevel", _self.map.getZoom())
        if (_self.isMapCircleLocked) $('.leaflet-editing-icon').hide() // ### duplicate, fix circle initialization
        // ### && !_self.district
    }

    this.on_map_drag = function(e) {
        if (_self.isMapCircleLocked) { // #### && !_self.district
            _self.current_location.coordinate = _self.map.getCenter()
            _self.default_radius = _self.circle_search_control.getRadius()
            _self.render_circle_search_control(false)
        }
    }

    this.on_map_drag_end = function(e) {
        if (_self.isMapCircleLocked && !_self.district) {
            _self.do_circle_search(undefined, undefined)
            _self.reverse_geocode()
        }
    }

    this.focus_locationsearch_result = function() {
        var item = _self.locationsearch_results[_self.autocomplete_item]
        if (item) {
            if (!_self.max_bounds.contains([item.geometry.location.lat, item.geometry.location.lng])) {
                _self.current_location.name = 'Der erste gefundene Standort liegt au&szlig;erhalb '
                    + 'von Berlin, bitte w&auml;hlen sie eine der Alternativen rechts:'
                _self.render_current_location_label(true)
                _self.jump_to_map()
                // correct current map-viewport to default after a seemingly correct (but not sane location-query result)
                _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
            } else {
                _self.current_location.coordinate = new L.latLng(item.geometry.location.lat, item.geometry.location.lng)
                _self.default_radius = 900 // adapt circle size for this search a bit
                _self.current_location.name = item['formatted_address']
                _self.jump_to_map()
                _self.render_current_location_label()
                _self.render_circle_search_control()
                _self.do_circle_search(undefined, undefined)
                _self.map.panTo(_self.current_location.coordinate)
            }
            /*** $("#near-by").val(item['formatted_address'])
            // Display marker at found location
            if (_self.location_circle) _self.map.removeLayer(_self.location_circle)
            _self.location_circle = new L.circle(item.geometry.location, 200, {"stroke": true,
                "clickable": false, "color": "#dae3f8", "fillOpacity": 0.6, "opacity": 0.8, "weight":10})
            _self.map.addLayer(_self.location_circle, {"clickable" : false}) **/
        } else {
            throw new Error("Autocomplete item is undefined", item, _self.autocomplete_item)
        }
    }

    this.render_locationsearch_alternatives = function() {
        //
        var prev_location = _self.locationsearch_results[_self.autocomplete_item - 1]
        var next_location = _self.locationsearch_results[_self.autocomplete_item + 1]
        var $prev = ""
        var $next = ""
        if (prev_location) {
            $prev = $('<a class="prev-location" title="'+ prev_location['formatted_address'] +'"><</a>')
            $prev.click(function(e) {
                _self.autocomplete_item = _self.autocomplete_item - 1
                _self.focus_locationsearch_result()
                _self.render_locationsearch_alternatives()
            })
        } else {
            // empty prev button
            $prev = $('<a class="prev-location defused" title=""><</a>')
        }

        if (next_location) {
            $next = $('<a class="next-location" title="'+ next_location['formatted_address'] +'">></a>')
            $next.click(function(e) {
                _self.autocomplete_item = _self.autocomplete_item + 1
                _self.focus_locationsearch_result()
                _self.render_locationsearch_alternatives()
            })
        } else {
            // empty next button
            $next = $('<a class="next-location defused" title="">></a>')
        }
        //
        $('#street-alternatives').html(_self.locationsearch_results.length + ' Ergebnisse').append($prev)
        .append
        ($next)
        $('#street-alternatives').css("display", "inline-block")
        $('#street-alternatives').show()
    }

    /** object.name, object.lat, object.lng */
    this.render_current_location_label = function(hideFavBtn) {
        // ### help to reset-view
        if (!_self.current_location.hasOwnProperty("name")) console.warn("Current location has no name")
        if (!_self.current_location.coordinate.hasOwnProperty("lat")) console.warn("Current location has no lat")
        if (!_self.current_location.coordinate.hasOwnProperty("lng")) console.warn("Current location has no lng")
        //
        var latitude, longitude;
            latitude = _self.current_location.coordinate.lat.toFixed(3)
            longitude = _self.current_location.coordinate.lng.toFixed(3)
        // ### sanity check for bigger berlin area before firing a range-query...
        $('.location-label .text').html(_self.current_location.name
            + ' <small>('+latitude+' N, '+longitude+' E)</small>')
        _self.update_document_title(_self.current_location.name)
        $('button.star').unbind('click')
        $('button.star').click(_self.add_entry_to_local_db)
        //
        if (typeof _self.map === "undefined") {
            _self.setup_leaflet_dom('map', true)
        }
        //
        if (hideFavBtn) {
            $('button.star').button("disable")
        } else {
            $('button.star').button("enable")
        }
    }

    this.update_document_title = function(titlePrefix, titleAddon) {
        if (titlePrefix) window.document.title = titlePrefix + " - " + _self.webapp_title
        if (titleAddon) window.document.title = _self.webapp_title + " - " + titleAddon
    }

    this.render_circle_search_control = function(fitBounds) {
        // setup radius control
        if (_self.circle_search_control) {
            _self.controlGroup.removeLayer(_self.circle_search_control)
            _self.map.removeLayer(_self.controlGroup)
        }
        if (!_self.district) {
            _self.circle_search_control = new L.CircleEditor(_self.current_location.coordinate, _self.default_radius, {
                color: _self.ka_blue, weight: 3, opacity: .5, fillColor: _self.yellow, fillOpacity: 0,
                extendedIconClass: "extend-icon-medium", className: "leaflet-radius-control", clickable: false,
                zIndexOffset: 101
            })
            // add circle search control to map
            _self.controlGroup.addLayer(_self.circle_search_control)
            _self.controlGroup.addTo(_self.map)
            // add event handler to radius control
            _self.circle_search_control.on('edit', function(event) {
                console.log("edit fires...")
                // fire a new query
                var new_radius = event.target._mRadius
                _self.current_location.coordinate.lat = event.target._latlng.lat
                _self.current_location.coordinate.lng = event.target._latlng.lng
                // console.log("Update circle position event TO", event, _self.current_location)
                // ### on small screens (here, after dragging) our current center should be the mapcenter (fitBounds..)
                _self.do_circle_search(event.target._latlng, new_radius)
                _self.reverse_geocode()
            })
            // update viewport to the programmatically set radius-control
            if (fitBounds) {
                // _self.map.fitBounds(_self.controlGroup.getBounds())
                _self.map.setView(
                    _self.controlGroup.getBounds().getCenter(),
                    _self.LEVEL_OF_STREET_ZOOM)
            }
            if (_self.isMapCircleLocked) $('.leaflet-editing-icon').hide()
        }
    }

    this.remove_circle_search_control = function() {
        if (_self.circle_search_control) {
            _self.controlGroup.removeLayer(_self.circle_search_control)
            _self.map.removeLayer(_self.controlGroup)
        }
    }

    // Removes all geo object (circle markers) from the map without removing them from _self.markerGroup
    this.clear_geo_object_marker = function() {
        _self.map.eachLayer(function (el) {
            // do not remove control group, just items with a geo_object id
            if (el.hasOwnProperty('options') && el.options.hasOwnProperty('geo_object_id')) {
                _self.map.removeLayer(el)
            }
            _self.map.addLayer(_self.controlGroup)
        })
    }

    this.clear_circle_marker_group = function() {
        // TODO revise this (returns straight for e.g. init via districts page)
        if (!_self.markerGroup) return
        // clear complete marker group, e.g. for fulltext_search
        _self.markerGroup.eachLayer(function (marker){
            _self.map.removeLayer(marker)
        })
        _self.markerGroup = undefined
    }

    this.render_geo_objects = function(data, set_view_to_bounds) {
        // ### We do not clear markers here (which would be nice), we should not render any duplicates ..
        var list_of_markers = []
        // -- PREPARE NEW MARKER
        for (var el in data) {
            var geo_object= data[el]
            if (geo_object == null || !geo_object) {
                console.warn("Skipping geo object response entry [" + el+ "]", geo_object)
            } else {
                var geo_marker = _self.create_geo_object_marker(geo_object)
                if (geo_marker) list_of_markers.push(geo_marker)
            }
        }
        // -- MERGE EXISTING WITH NEW MARKER
        // maintain also all previously added markers
        if (_self.markerGroup) {
            _self.markerGroup.eachLayer(function (marker) {
                if (!_self.exist_in_marker_listing(marker.options.geo_object_id, list_of_markers)) {
                    list_of_markers.push(marker)
                }
            })
        }
        // -- FINALIZE ALL MARKER IN NEW MARKER GROUP
        // create updated/new feature/markerGroup
        _self.markerGroup = L.featureGroup(list_of_markers)
        _self.markerGroup.addTo(_self.map)
        if (set_view_to_bounds && list_of_markers.length > 0) {
            // _self.map.setMaxBounds(_self.markerGroup.getBounds())
            _self.map.fitBounds(_self.markerGroup.getBounds())
        }
    }

    this.create_geo_object_marker = function(geo_object) {
        if (geo_object.hasOwnProperty("geo_coordinate_lat") && geo_object.hasOwnProperty("geo_coordinate_lon")) { //sanity check
            var result = geo_object
            // do worldwide check & report
            if (geo_object.geo_coordinate_lat > 90 || geo_object.geo_coordinate_lon > 180 ||
                geo_object.geo_coordinate_lat < -90 || geo_object.geo_coordinate_lon < -180 ) {
                console.info("Invalid WGS 84 coordinates spotted at", geo_object)
                return undefined
            }
            // do berlin check & report
            if (geo_object.geo_coordinate_lon < 10 || geo_object.geo_coordinate_lat < 45 ||
                geo_object.geo_coordinate_lon > 15 || geo_object.geo_coordinate_lat > 55) {
                console.info("WGS 84 coordinates do look strange in case of Berlin", geo_object)
                return undefined
            }
            if (geo_object["bezirksregion_uri"] == "") {
                console.info("Invalid Geo Object - Missing Bezirksregion URI", geo_object["name"])
                return undefined
            }
            // start creating marker
            var coordinate = L.latLng(result["geo_coordinate_lat"], result["geo_coordinate_lon"])
            var circle = L.circleMarker(coordinate, {
                    color: _self.ka_gold, weight: 2, opacity: .8, fillColor: _self.ka_gold, fillOpacity: .6,
                    title: result["name"], alt: "Markierung von " + result["name"], location_id: result["address_id"],
                    geo_object_id: result["id"], uri: result["uri"], name: result["name"],// riseOnHover: true,
                    bezirksregion_uri: result["bezirksregion_uri"], z_indexOffset: 1001
                })
            // ### Level: 14 > 8px e.g. Level: 13 > 5px
            circle.setRadius(10)
            circle.on('click', function (e) {
                _self.select_geo_object_marker(e.target)
            })
            circle.on('mouseover', function (e) {
                var geo_objects_under_marker = _self.find_all_geo_objects(e.target.options['location_id'])
                _self.show_marker_name_info(geo_objects_under_marker)
            })
            circle.on('mouseout', _self.hide_marker_name_info)
            return circle
        } else {
            console.warn("Could not geo object marker caused by missing geo coordinates")
            return undefined
        }
    }

    this.select_geo_object_marker = function(marker) {
        // highlight selection
        _self.markerGroup.eachLayer(function (el) {
            el.setStyle({color: _self.ka_gold, weight: 2, opacity: .8,
                fillColor: _self.ka_gold,fillOpacity: .4})
            if (el.options['geo_object_id'] === marker.options['geo_object_id']) {
                // ### adding class name to path does not work
                marker.setStyle({ color: _self.ka_gold, weight: 4, opacity: 1,
                    fillColor: _self.m_blue, fillOpacity: 1, className: "selected" })
                marker.bringToFront()
                marker.setRadius(12)
            }
        })
        // gather selection
        var selected_geo_objects = _self.find_all_geo_objects(marker.options['location_id'])
        // prepare gui for new details
        _self.clear_details_area()
        // load all details in selection
        _self.load_geo_object_details(selected_geo_objects)
    }

    this.render_geo_object_details_card = function(geo_object) {
        // construct impressum for geo object
        var imprint_html = _self.get_imprint_html(geo_object)
        // prepare citymap link
        var web_alias = geo_object.bezirksregion_uri.slice(18) // ### number of chars the prefix has
        var topic_id = geo_object.uri.slice(19) // ### number of chars the prefix has)
        var description = geo_object.beschreibung
        var contact = geo_object.kontakt
        var opening_hours = geo_object.oeffnungszeiten
        var lor_link = _self.get_lor_link(geo_object)
        // build up dom for geo object details
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
        if (typeof opening_hours !== "undefined"
            && opening_hours.length > 0) body_text += '<p><b>&Ouml;ffnungszeiten</b>' + opening_hours + '</p>'
        // _append_ to dom
        $('#detail-area').append('<div class="entry-card">'
            + '<h3>'+geo_object.name+'</h3>'
            + '<div class="details">'
            + '<p>'
                + geo_object.address_name.toString() + '<br/>'
                + '' + body_text + ''
            + '</p>'
            + '<a href="http://www.kiezatlas.de/map/'+web_alias+'/p/'+topic_id+'" title="Diesen'
                + ' Datensatz in seinem ursprünglichen Stadtplan anzeigen">Details im Stadtplan</a>'
            + '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z=' + geo_object.address_name.toString()
                + '&REQ0JourneyStopsZA1=2&start=1&pk_campaign=_self.de">'
                + '<img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
            + '</div>'
            + lor_link
            + imprint_html
        + '</div>')
    }

    // Simple HTML click handler

    this.toggle_circle_search_lock_button = function(e) {
        _self.isMapCircleLocked = (_self.isMapCircleLocked) ? false : true;
        if (_self.isMapCircleLocked) {
            $('.lock-control').text('Unlock circle')
            $('.leaflet-editing-icon').hide()
            _self.current_location.coordinate = _self.map.getCenter()
            _self.default_radius = _self.circle_search_control.getRadius()
            _self.render_circle_search_control()
            // ### _self.reverse_geocode()
        } else {
            $('.leaflet-editing-icon').show()
            $('.lock-control').text('Lock circle')
        }
    }

    this.toggle_location_menu = function(show) {
        if (show) {
            $('#main-menu .options').show()
            return
        }
        $('#main-menu .options').toggle()
    }

    this.add_nearby_button_handler = function() {
        // TODO: Will add up if we call render_page e.g. twice
        $('.search-option.a').on('touchend', handle_option_a)
        $('.search-option.a').on('click', handle_option_a)
        //
        $('.search-option.b').on('touchend', _self.focus_location_input_field)
        $('.search-option.b').on('click', _self.focus_location_input_field)
        //
        $('.search-option.c').on('touchend', _self.handle_option_c)
        $('.search-option.c').on('click', _self.handle_option_c)

        function handle_option_a (e) {
            // initialize map on browsers location
            _self.init_map_dialog(true, null, true)
        }

    }

    this.handle_option_c = function(e) {
        // initiate map with edible circle control
        _self.init_map_dialog(false, _self.LEVEL_OF_KIEZ_ZOOM, true)
    }

    this.handle_option_b = function(e) {
        // initiate map with edible circle control but focus on street
        _self.init_map_dialog(false, _self.LEVEL_OF_STREET_ZOOM, true)
    }

    // Utility Methods for Application Model

    this.get_imprint_html = function(entry) {
        var bezirk = _self.get_bezirks_topic(entry.bezirk_uri)
        var html = '<div class="imprint">'
            + '<a href="' + bezirk.imprint + '" title="Impressum: Bezirksamt ' + bezirk.value + '">Impressum</a></div>'
        return html
    }

    this.get_lor_link = function(entry) {
        if (!entry.hasOwnProperty("lor_id")) return ""
        var html = '<div class="lor-link">'
            + '<a href="http://sozialraumdaten.kiezatlas.de/seiten/2014/12/?lor=' + entry.lor_id
            + '" title="zur Einwohnerstatistik des Raums (LOR Nr. ' + entry.lor_id +')">Sozialraumdaten</a></div>'
        return html
    }

    this.get_bezirks_topic = function(uri) {
        for (var i in _self.districts) {
            var element = _self.districts[i]
            if (element.uri === uri) return element
        }
        return undefined
    }

    this.get_bezirks_topic_by_id = function(id) {
        // console.log("Searching for bezirk in", _self.districts)
        for (var i in _self.districts) {
            if (_self.districts[i].id === id) return _self.districts[i]
        }
    }

    this.get_bezirks_topic_by_hash = function(hash) {
        for (var i in _self.districts) {
            var bezirk = _self.districts[i]
            var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
            if (anchor_name == hash) return bezirk
        }
    }

    this.find_all_geo_objects = function(coordinate_id) {
        var results = []
        _self.markerGroup.eachLayer(function (el) {
            if (el.options.location_id === coordinate_id) results.push(el)
        })
        return results
    }

    this.exist_in_marker_listing = function(geo_object_id, listing) {
        if (typeof listing !== "undefined") {
            for (var i in listing) {
                if (listing[i].options.geo_object_id === geo_object_id) {
                    // console.warn("Skipping to add an (already present) Geo Object ID to marker group list", geo_object_id)
                    return true
                }
            }
        }
        return false
    }

    this.value_sort_asc = function(a, b) {
        var nameA = a.value
        var nameB = b.value
        //
        if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string descending
          return 1
        if (nameA.toLowerCase() < nameB.toLowerCase())
          return -1
        return 0 //default return value (no sorting)
    }

    this.name_sort_asc = function(a, b) {
        var nameA = a.name
        var nameB = b.name
        //
        if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string descending
          return 1
        if (nameA.toLowerCase() < nameB.toLowerCase())
          return -1
        return 0 //default return value (no sorting)
    }

    // Utility Methods for manipulating GUI State

    this.show_marker_name_info = function(objects) {
        var names_html = ""
        max_count = 4
        for (var o in objects) {
            names_html += "<b>" + objects[o].options.name + "</b><br/>"
            if (o == max_count) {
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
        }
    }

    this.hide_marker_name_info = function() {
        $('#marker-name', '#map').hide()
    }

    this.jump_to_map = function(custom_anchor) {
        // jump to map in any case
        window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/#karte"
        if (custom_anchor) { // but maybe alter anchor name
            window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/" + custom_anchor
        }
    }

    this.focus_location_input_field = function() {
        // set focus on text input
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

    this.hide_spinning_wheel = function(isLocating) {
        if (isLocating) {
            $('#location-input .spinning-wheel').hide()
        } else {
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
        $('.entry-card').hide(200, "linear", function (e) { this.remove() })
    }

    // Location based service helper

    this.get_browser_location = function(options) {
        //
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by your browser")
            return
        }
        //
        if (typeof options === "undefined") { // ??? do this options work for us?
            options =  {
                "setView" : true, "maxZoom" : _self.LEVEL_OF_DETAIL_ZOOM
            }
        }
        _self.map.locate(options)
    }

    this.on_browser_location_found = function(e) {
        _self.jump_to_map()
        if (!_self.max_bounds.contains([e.latitude, e.longitude])) {
            // ### enable button for reset-view
            _self.current_location.name = 'Ihr Standort liegt au&szlig;erhalb von Berlin, '
                + 'bitte nutzen sie die Umkreissuche auf der Karte um Einrichtungen zu finden oder '
                + '<a href="javascript:kiezatlas.focus_location_input_field()" '+ '>die Texteingabe</a>.'
            _self.render_current_location_label(true)
            // correct current map-viewport to default after a seemingly correct (but not sane location-query result)
            _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
        } else {
            _self.current_location.coordinate.lat = e.latitude
            _self.current_location.coordinate.lng = e.longitude
            // render radius control at new place
            _self.render_circle_search_control()
            // then fire query
            _self.do_circle_search(undefined, undefined)
            // correct current default viewport
            _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
            // ### if location in berlin, do something smart (suggest to save location to favourites'db
                // ### complete error handling, for geo-name lookup
            _self.reverse_geocode()
        }
    }

    /**
      * As it turns out this is just called if location will \"never\" be shared with this website
      * but NOT if user decides to share location \"not this time\" (available in Firefox) or just clicks into the
      * void of our page (Chromium).
      */
    this.on_browser_location_error = function(e) {
        _self.hide_spinning_wheel(true)
        // _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_DISTRICT_ZOOM)
        if (_self.max_bounds.contains([_self.current_location.coordinate.lat, _self.current_location.coordinate.lng])) {
            // render radius control at standard place
            _self.render_circle_search_control()
            // then fire query
            _self.do_circle_search(undefined, undefined)
        }
        _self.show_message("Tipp: Bewegen sie den Kartenausschnitt oder w&auml;hlen sie "
            + "<em>Unlock Circle</em>, so k&ouml;nnen sie Einrichtungen in einer ganz bestimmten Gegend aufdecken.",
            7000)
    }

    /** Note: Unused method */
    this.render_districts_layer = function() {
        $.getJSON('/de.kiezatlas.website/vendor/berlin_bezirke.geojson',
            function (data) {
                var geoJson = L.geoJson(data, {
                    style: function (feature) {
                        return {
                            "color": _self.ka_red, "width" : 1, "dashArray" : "15, 10, 5, 10",
                            "fillColor": "transparent", "fillOpacity": 0, "opacity": 0.2
                        }
                    },
                    onEachFeature: function (feature, layer) {
                        // console.log("GeoJSON Feature", feature)
                        // layer.bindPopup(feature.properties["name"])
                    }
                }).addTo(_self.map)
                // .geometryToLayer(data)
                // _self.districtGroup
            })
        // _self.districtGroup.addTo(_self.map)
    }

    // Kiezatlas API Service helper

    this.load_district_topics = function(callback) {
        $.getJSON('/kiezatlas/bezirk',
            function (districts) {
                _self.districts = districts.sort(_self.value_sort_asc)
                if (callback) callback()
                // console.log("ka_districts", _self.districts)
                for (var i in _self.districts) {
                    var district = _self.districts[i]
                    var bezirke_html = '<li ' + 'class="bezirk">'
                            bezirke_html += '<a class="district-button" id="' + district.id
                            + '" title="zur Bezirksseite '+ district.value +'" href="javascript:kiezatlas.render_district_page('
                            + district.id + ')">' + district["value"] + '</a>'
                        bezirke_html += '<ul class="bezirksregionen">'
                        var subdistricts = district.childs.sort(_self.name_sort_asc)
                        for (var k in subdistricts) {
                            var region = subdistricts[k]
                            // console.log("ka_subdistrict", region)
                            bezirke_html += '<li><a id="' + region["id"] + '">' + region["name"] + '</a></li>'
                        }
                        bezirke_html += '</ul>'
                        bezirke_html += '</li>'
                    var $bezirke = $(bezirke_html)
                    $('ul.bezirke').append($bezirke)
                }
            }
        )
    }

    this.load_geo_object_details = function(result_list) {
        // rendering all geo objects sharing this very geo coordinate
        for (var i in result_list) {
            $.getJSON('/kiezatlas/topic/'+result_list[i].options['geo_object_id'],
                function (geo_object) {
                    if (geo_object) {
                        _self.render_geo_object_details_card(geo_object)
                    } else {
                        console.warn("Error while loading details for geo object", result_list[i])
                    }
                }
            )
        }
    }

    this.do_circle_search = function(location, radius) {
        // ### TODO: dont query if given location and given radius "equals" our latest "query settings"
        _self.show_spinning_wheel()
        var location_string = ''
        var radius_value = _self.default_radius
        if (!location) {
            location_string = _self.current_location.coordinate.lng + ', '+_self.current_location.coordinate.lat
        } else {
            location_string = location.lng + ', '+location.lat
        }
        if (radius) radius_value = radius
        $.getJSON('/kiezatlas/search/'+encodeURIComponent(location_string)+'/' + (radius_value / 1000),
            function (geo_objects) {
                _self.items = geo_objects
                // directly removing them from the map without removing them from the markergroup
                _self.clear_geo_object_marker()
                _self.hide_spinning_wheel()
                _self.render_geo_objects(geo_objects, false)
            })
    }

    this.do_text_search_geo_objects = function(text, success) {
        var queryUrl = '/kiezatlas/search/?search='+text
        if (_self.district) {
            queryUrl = '/kiezatlas/search/'+_self.district.id+'/?search='+text;
        }
        _self.clear_details_area()
        _self.show_spinning_wheel()
        $.getJSON(queryUrl,
            function (geo_objects) {
                console.log("> Text based search returned", geo_objects)
                // TODO: If search results are zero
                if (geo_objects.length > 0) {
                    _self.items = geo_objects
                    if (typeof success !== "undefined") {
                        // clear marker group completely after fulltext-search
                        _self.clear_circle_marker_group()
                        _self.hide_spinning_wheel()
                        // TODO: for resultsets bigger than 100 implement a incremental rendering method
                        _self.render_geo_objects(geo_objects, true)
                    }
                } else {
                    _self.show_message('Keine Treffer f&uuml;r diese Suche')
                }
            })
    }

    this.reverse_geocode = function(e) {
        $.getJSON('/kiezatlas/reverse-geocode/' + _self.current_location.coordinate.lat
                + ',' + _self.current_location.coordinate.lng, function (geo_names) {
            _self.hide_spinning_wheel(true)
            if (geo_names.results.length > 0) {
                var first_result = geo_names.results[0]
                var components = first_result.address_components
                var o = { coordinates : "" + _self.current_location.coordinate.lat + "," + _self.current_location.coordinate.lng }
                for (var i in components) {
                    var el = components[i]
                    if (el.types[0] === "route") {
                        o.street = el.long_name
                    } else if (el.types[0] === "sublocality_level_2") {
                        o.area = el.long_name
                    } else if (el.types[0] === "street_number") {
                        if (typeof el.long_name !== "undefined") o.street_nr = el.long_name
                    } else if (el.types[0] === "locality") {
                        o.city = el.long_name
                    } else if (el.types[0] === "postal_code") {
                        o.postal_code= el.long_name
                    }
                }
                _self.current_location.name = o.street + " " + o.street_nr + ", " + o.city
                if (typeof o.area !== "undefined") _self.current_location.name += " " + o.area
                _self.render_current_location_label()
            }
        })
    }

}
