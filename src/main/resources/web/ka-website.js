
/**
 * 
 * @type @new;_L5
 */
var kiezatlas = new function() {
    
    var _self = this

    this.default_radius = 750; /* radius in meters*/
    this.radius_control = undefined
    // TODO: Increase max_bounds
    this.max_bounds = L.latLngBounds(L.latLng(52.298000, 12.909336), L.latLng(52.715646, 13.817779))

    // kiezatlas hex colors
    this.ka_blue = "#002856";
    this.ka_red = "#8f1414";
    this.ka_gold = "#EACA8F";
    this.darkgrey = "#343434";
    this.bright_grey = "#a9a9a9";
    this.grey = "#868686";
    this.yellow = "#FFCC00";

    this.current_location = { name: "Neuenburger Straße, Berlin", coordinate: new L.latLng(52.5, 13.4) }
    this.alternative_items = [] // near-by search street-alternatives
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
    
    this.init_location_selection = function() {
        //
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

    this.init_map_dialog = function(detectLocation, zoomLevel, jumpToMap) {
        // initiaze map on browsers location
        if (typeof _self.map === "undefined") {
            _self.init_map_area('map', false)
        }
        if (jumpToMap) _self.jump_to_map()
        if (detectLocation) _self.get_browser_location()
        if (zoomLevel) _self.map.setZoom(zoomLevel)
    }

    this.handle_option_c = function(e) {
        // initiate map with edible circle control
        _self.init_map_dialog(false, _self.LEVEL_OF_KIEZ_ZOOM, true)
    }

    this.handle_option_b = function(e) {
        // initiate map with edible circle control but focus on street
        _self.init_map_dialog(false, _self.LEVEL_OF_STREET_ZOOM, true)
    }

    this.jump_to_map = function(custom_anchor) {
        window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/#karte"
        if (custom_anchor) {
            window.document.location.href = window.document.location.protocol + '//' + window.document.location.host + "/" + custom_anchor
        }
    }

    this.focus_location_input_field = function() {
        // set focus on text input
        $('#location-input #near-by').focus()
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
                                        _self.go_to_location(doc.data)
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

    this.go_to_location = function(object) {
        //
        if (typeof _self.map === "undefined") {
            _self.init_map_area('map', true)
        }
        //
        _self.current_location = object
        _self.update_current_location_label()
        // render radius control at new place
        _self.render_radius_control()
        // then fire query
        _self.query_geo_objects(undefined, undefined, _self.render_geo_objects)
        _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
    }

    this.init_map_area = function(dom_el_id) {
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
            doubleClickZoom: true, zoomControl: false, minZoom: 9//,
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
        // paint standard location name
        _self.update_current_location_label()
        // render radius control at new place
        _self.render_radius_control()
        // then fire query
        _self.query_geo_objects(undefined, undefined, _self.render_geo_objects)
        // correct current default viewport
        _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_KIEZ_ZOOM)
        //
        _self.render_location_button()
        _self.map.on('locationfound', _self.on_location_found)
        _self.map.on('locationerror', _self.on_location_error) // ### just if user answers "never"
        _self.map.on('moveend', function(e) {
            if (_self.isMapCircleLocked && !_self.district) {
                _self.query_geo_objects(undefined, undefined, _self.render_geo_objects)
                _self.reverse_geocode()
            }
        })
        _self.map.on('move', function(e) {
            if (_self.isMapCircleLocked) { // #### && !_self.district
                _self.current_location.coordinate = _self.map.getCenter()
                _self.default_radius = _self.radius_control.getRadius()
                _self.render_radius_control(false)
            }
        })
        if (_self.isMapCircleLocked) $('.leaflet-editing-icon').hide() // ### duplicate, fix circle initialization
        // ### && !_self.district
    }

    this.query_districts = function() {
        $.getJSON('/kiezatlas/bezirk',
            function (districts) {
                _self.districts = districts.sort(_self.value_sort_asc)
                // console.log("ka_districts", _self.districts)
                for (var i in _self.districts) {
                    var district = _self.districts[i]
                    var bezirke_html = '<li ' + 'class="bezirk">'
                            bezirke_html += '<a class="link-out" id="' + district.id
                            + '" href="javascript:kiezatlas.render_district_page('+district.id+')">' + district["value"]
                            + '</a>'
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
            })
    }

    this.render_district_page = function(topic_id) {
        var bezirk = _self.get_bezirks_topic_by_id(topic_id)
        console.log("rendering page for bezirk", bezirk)
        // set page in "district" mode
        _self.district = bezirk
        // TODO: rewrite "unlock circle" label
        $('div.legende').append('<a class="district-control" '
            + 'href="javascript:kiezatlas.unset_district();">"Mitte" Filter aufheben</a>')
        $('a.lock-control').text('Berlinweite Umkreissuche')
        $('a.lock-control').click(_self.start_graphical_search)
        // TODO: activate doubleClick to zoom on map
        var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
        _self.jump_to_map(anchor_name)
        _self.remove_radius_control()
        _self.show_spinning_wheel()
        // _self.load_district_html()
        _self.render_districts_layer()
        // TODO: Query geo objects in a bunch of hundred items
        $.getJSON('/kiezatlas/bezirk/' + topic_id, function (response) {
            console.log("render all geo objects", response)
            _self.clear_map_marker_group()
            _self.hide_spinning_wheel()
            _self.render_geo_objects(response, true)
        })
    }

    this.render_districts_layer = function () {
        // TODO: deactivate clicking on bezirks feature
        $.getJSON('/de.kiezatlas.website/berlin_bezirke.geojson',
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

    this.toggle_radius_control_lock = function(e) {
        _self.isMapCircleLocked = (_self.isMapCircleLocked) ? false : true;
        if (_self.isMapCircleLocked) {
            $('.lock-control').text('Unlock circle')
            $('.leaflet-editing-icon').hide()
            _self.current_location.coordinate = _self.map.getCenter()
            _self.default_radius = _self.radius_control.getRadius()
            _self.render_radius_control()
        } else {
            $('.leaflet-editing-icon').show()
            $('.lock-control').text('Lock circle')
        }
    }

    this.toggle_location_menu = function() {
        $('#main-menu .options').toggle()
    }

    /** object.name, object.lat, object.lng */
    this.update_current_location_label = function (hideStarButton) {
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
        $('button.star').unbind('click')
        $('button.star').click(_self.add_entry_to_local_db)
        //
        if (typeof _self.map === "undefined") {
            _self.init_map_area('map', true)
        }
        //
        if (hideStarButton) {
            $('button.star').button("disable")
        } else {
            $('button.star').button("enable")
        }
    }

    this.render_radius_control = function (fitBounds) {
        // setup radius control
        if (typeof _self.radius_control !== "undefined") {
            _self.controlGroup.removeLayer(_self.radius_control)
            _self.map.removeLayer(_self.controlGroup)
        }
        if (!_self.district) {
            console.log("working in freestyle mode, no district set!")
            _self.radius_control = new L.CircleEditor(_self.current_location.coordinate, _self.default_radius, {
                color: _self.yellow, weight: 3, fillColor: _self.yellow, fillOpacity: 0,
                fillOpacity: .1, extendedIconClass: "extend-icon-medium",
                className: "leaflet-radius-control", clickable: false, zIndexOffset: 101
            })
            // add raduis control to map
            _self.controlGroup.addLayer(_self.radius_control)
            _self.controlGroup.addTo(_self.map)
            // add event handler to radius control
            _self.radius_control.on('edit', function (event) {
                // fire a new query
                var new_radius = event.target._mRadius
                _self.current_location.coordinate.lat = event.target._latlng.lat
                _self.current_location.coordinate.lng = event.target._latlng.lng
                // console.log("Update circle position event TO", event, _self.current_location)
                // ### on small screens (here, after dragging) our current center should be the mapcenter (fitBounds..)
                _self.query_geo_objects(event.target._latlng, new_radius, _self.render_geo_objects)
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

    this.remove_radius_control = function() {
        if (typeof _self.radius_control !== "undefined") {
            _self.controlGroup.removeLayer(_self.radius_control)
            _self.map.removeLayer(_self.controlGroup)
        }
    }

    this.query_geo_objects = function (location, radius, success) {
        _self.show_spinning_wheel()
        var location_string = ''
        var radius_value = _self.default_radius
        if (typeof location === "undefined") {
            location_string = _self.current_location.coordinate.lng + ', '+_self.current_location.coordinate.lat
        } else {
            location_string = location.lng + ', '+location.lat
        }
        if (typeof radius !== "undefined") radius_value = radius
        $.getJSON('/kiezatlas/search/'+encodeURIComponent(location_string)+'/' + (radius_value / 1000),
            function (geo_objects) {
                _self.items = geo_objects
                if (typeof success !== "undefined") {
                    _self.clear_markers()
                    _self.hide_spinning_wheel()
                    success(geo_objects)
                }
            })
    }

    this.search_geo_objects = function (text, success) {
        _self.show_spinning_wheel()
        $.getJSON('/kiezatlas/search/?search='+encodeURIComponent(text), 
            function (geo_objects) {
                _self.items = geo_objects
                if (typeof success !== "undefined") {
                    // clear markers after fulltext-search
                    _self.clear_markers()
                    _self.hide_spinning_wheel()
                    success(geo_objects, true) // ####
                }
            })
    }

    this.show_marker_name_info = function (objects) {
        var names_html = ""
        for (var o in objects) {
            names_html += "<b>" + objects[o].options.name + "</b><br/>"
        }
        $('#marker-name').html(names_html)
        $('#marker-name').show()
    }

    this.hide_marker_name_info = function () {
        $('#marker-name').hide()
    }

    this.clear_map_marker_group = function() {
        _self.markerGroup.eachLayer(function (marker){
            _self.map.removeLayer(marker)
        })
        _self.markerGroup = undefined
    }

    this.render_geo_objects = function (data, set_view_to_bounds) {
        // ### if we do not clear markers (which would be nice), we should not render any duplicates ..
        var list_of_markers = []
        // TODO: Keep previously selected markers (when in range)
        // -- PREPARE NEW MARKER
        for (var el in data) {
            var geo_object= data[el]
            if (geo_object == null || !geo_object) {
                console.warn("Skipping geo object response entry [" + el+ "]", geo_object)
            } else {
                var circle_marker = _self.create_circle_marker(geo_object)
                list_of_markers.push(circle_marker)
            }
        }
        // -- MERGE EXISTING WITH NEW MARKER
        // maintain also all previously added markers
        if (typeof _self.markerGroup !== "undefined") {
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

    this.create_circle_marker = function(geo_object) {
        if (geo_object.hasOwnProperty("geo_coordinate_lat") ||
            geo_object.hasOwnProperty("geo_coordinate_lon")) { // client-side sanity check of search results
            var result = geo_object // ### refactor name
            var coordinate = L.latLng(result["geo_coordinate_lat"], result["geo_coordinate_lon"])
            /** brighter blue #5a78f3, blue: "#1944fc" yellow: "#FFCC33"**/
            var circle = L.circleMarker(coordinate, {
                    color: _self.grey, strokeOpacity: 1, weight: 2, opacity: .5,
                    fillColor: _self.grey, fillOpacity: .2, title: result["name"],
                    alt: "Markierung von " + result["name"], location_id: result["address_id"],
                    geo_object_id: result["id"], uri: result["uri"], name: result["name"],// riseOnHover: true,
                    bezirksregion_uri: result["bezirksregion_uri"], z_indexOffset: 1001
                })// .bindPopup('<b>' + result["name"] + '</b>')
            // ### Level: 14 > 8px e.g. Level: 13 > 5px
            circle.setRadius(10)
            circle.on('click', function (e) {
                _self.select_map_entry(e.target)
            })
            circle.on('mouseover', function (e) {
                // ### display all geo_objects at this markers location
                var geo_objects_under_marker = _self.find_all_geo_objects(e.target.options['location_id'])
                // console.log("hovering all", geo_objects_under_marker)
                _self.show_marker_name_info(geo_objects_under_marker)
            })
            circle.on('mouseout', function (e) {
                _self.hide_marker_name_info()
            })
            return circle
        } else {
            console.warn("Could not create circle marker caused by missing geo coordinates")
        }
    }

    this.select_map_entry = function (marker) {
        _self.markerGroup.eachLayer(function (el) {
            el.setStyle({ color: _self.grey, fillColor: _self.grey, fillOpacity: .2 })
            if (el.options['geo_object_id'] === marker.options['geo_object_id']) {
                // ### adding class name to path does not work
                marker.setStyle({ color: _self.grey, weight: 4, opacity: .7,
                fillColor: _self.yellow, fillOpacity: 1, className: "selected" })
                // marker.redraw()
            }
        })
        var geo_objects_under_marker = _self.find_all_geo_objects(marker.options['location_id'])
        _self.clear_details_area()
        _self.render_selected_details(geo_objects_under_marker)
    }

    this.render_selected_details = function (result_list) {
        // ### impressums link je nach bezirk
        if (result_list.length > 0) $('#detail-area h3.help').remove()
        for (var i in result_list) {
            $.getJSON('/kiezatlas/topic/'+result_list[i].options['geo_object_id'],
                function (geo_object) {
                    if (typeof geo_object !== "undefined") {
                        if (typeof geo_object.bezirksregion_uri !== "undefined") {
                            // ### just render item if data has bezirksregion set
                            console.log("entry_view", geo_object)
                            // construct resp. impressum
                            var imprint_html = _self.get_imprint_html(geo_object)
                            // make linkage work
                            var web_alias = geo_object.bezirksregion_uri.slice(18) // ### number of chars the prefix has
                            var topic_id = geo_object.uri.slice(19) // ### number of chars the prefix has)
                            var description = geo_object.beschreibung
                            var contact = geo_object.kontakt
                            var opening_hours = geo_object.oeffnungszeiten
                            //
                            var body_text = ""
                            if (typeof description !== "undefined") {
                                body_text += '<p><b>Info</b> ' + description + '</p>'
                            }
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
                            // append to dom
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
                                + imprint_html
                            + '</div>')   
                        } else {
                            console.warn("Geo Object Bezirksregionen URI undefined", geo_object)
                        }
                    }
                }
            )
        }
    }

    this.get_imprint_html = function(entry) {
        var bezirk = _self.get_bezirks_topic(entry.bezirk_uri)
        // console.log("found bezirk", bezirk, bezirk.imprint)
        var html = '<div class="imprint">'
            + '<a href="' + bezirk.imprint + '" title="Impressum: Bezirksamt ' + bezirk.value + '">Impressum</a></div>'
        return html
    }

    this.get_bezirks_topic = function(uri) {
        // console.log("Searching for bezirk in", _self.districts)
        for (var i in _self.districts) {
            var element = _self.districts[i]
            if (element.uri === uri) return element
        }
    }

    this.get_bezirks_topic_by_id = function(id) {
        // console.log("Searching for bezirk in", _self.districts)
        for (var i in _self.districts) {
            if (_self.districts[i].id === id) return _self.districts[i]
        }
    }

    this.clear_markers = function () {
        _self.map.eachLayer(function (el) {
            // ### do not remove control group
            if (el.hasOwnProperty('options') && el.options.hasOwnProperty('geo_object_id')) {
                _self.map.removeLayer(el)
            }
            _self.map.addLayer(_self.controlGroup)
        })
    }

    this.clear_details_area = function () {
        $('.search-option.d').remove()
        $('.entry-card').remove()
    }

    this.show_spinning_wheel = function (isLocating) {
        if (isLocating) {
            $('#location-input .spinning-wheel').show()
        } else {
            $('#spinning-wheel').show()
        }
    }

    this.hide_spinning_wheel = function (isLocating) {
        if (isLocating) {
            $('#location-input .spinning-wheel').hide()
        } else {
            $('#spinning-wheel').hide()
        }
    }

    this.find_all_geo_objects = function (coordinate_id) {
        var results = []
        _self.markerGroup.eachLayer(function (el) {
            if (el.options.location_id === coordinate_id) results.push(el)
        })
        return results
    }

    this.exist_in_marker_listing = function (geo_object_id, listing) {
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

    this.render_location_button = function () {
        var locateButton = '<a class="leaflet-control-zoom-loc" href="#" title="Your Location"></a>'
        $(locateButton).insertBefore(".leaflet-control-zoom-in")
        $(".leaflet-control-zoom-loc").click(_self.get_browser_location);
    }

    this.get_browser_location = function (options) {
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

    this.on_location_found = function (e) {
        if (!_self.max_bounds.contains([e.latitude, e.longitude])) {
            // ### enable button for reset-view
            _self.current_location.name = 'Ihr aktueller Standort liegt au&szlig;erhalb '
                + 'unseres momentanen Einflu&szlig;bereichs. Wir k&ouml;nnen ihnen lediglich Daten aus dem '
                + 'Gro&szlig;raum Berlin anbieten. Bitte geben sie dazu z.B.: bei <a href="javascript:kiezatlas.focus_location_input_field()" '
                + '>B)</a> einen Stra&szlig;ennamen ein.'
            _self.update_current_location_label(true)
            // correct current map-viewport to default  (after a correct but insane location-query result)
            _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
        } else {
            _self.current_location.coordinate.lat = e.latitude
            _self.current_location.coordinate.lng = e.longitude
            // render radius control at new place
            _self.render_radius_control()
            // then fire query
            _self.query_geo_objects(undefined, undefined, _self.render_geo_objects)
            // correct current default viewport
            _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_STREET_ZOOM)
            // ### if location in berlin, do something smart (suggest to save location to favourites'db
                // ### complete error handling, for geo-name lookup
            _self.reverse_geocode()
        }
    }

    /**
      * As it turns out this is just called if location will \"never\" be shared with this website
      * but NOT if user decides to share location \"not this time\" (available in Firefox).
      */
    this.on_location_error = function (e) {
        _self.hide_spinning_wheel(true)
        _self.map.setView(_self.current_location.coordinate, _self.LEVEL_OF_DISTRICT_ZOOM)
        if (_self.max_bounds.contains([_self.current_location.coordinate.lat, _self.current_location.coordinate.lng])) {
            // render radius control at standard place
            _self.render_radius_control()
            // then fire query
            _self.query_geo_objects(undefined, undefined, _self.render_geo_objects)
        }
    }

    this.reverse_geocode = function (e) {
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
                _self.update_current_location_label()
            }
        })
    }

    this.value_sort_asc = function (a, b) {
        var nameA = a.value
        var nameB = b.value
        //
        if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string descending
          return 1
        if (nameA.toLowerCase() < nameB.toLowerCase())
          return -1
        return 0 //default return value (no sorting)
    }

    this.name_sort_asc = function (a, b) {
        var nameA = a.name
        var nameB = b.name
        //
        if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string descending
          return 1
        if (nameA.toLowerCase() < nameB.toLowerCase())
          return -1
        return 0 //default return value (no sorting)
    }

}
