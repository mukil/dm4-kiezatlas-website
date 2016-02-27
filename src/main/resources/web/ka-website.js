
// kiezatlas hex colors
var colors = {
    "ka_blue": "#002856",       // circle control
    "blue": "#1944fc",          // unused
    "b_blue": "#5a78f3",        // unused
    "ka_water": "#ccdddd",      // unused
    "ka_red": "#8f1414",        // districs layer polygon outline
    "m_blue": "#5784b8",        // marker: medium blue outline and fill-in (selected)
    "ka_gold": "#EACA8F",       // marker: yellow fill-ine and outline (selected)
    "darkgrey": "#343434",      // unused
    "bright_grey": "#a9a9a9",   // unused
    "grey": "#868686",          // unused
    "yellow": "#FFCC33"         // circle control
}

var settings = {
    "webappTitle" : "Kiezatlas 2 Website",
    "historyApiSupported" : window.history.pushState
}

var kiezatlas = (function($, angebote) {

    // Website Application Model
    var model = {
        "items": [],                  // Geo Objects
        "districts": [],              // Bezirks- & Bezirksregionen Child Topics
        "district": undefined,        // Selected Bezirk Topic
        // Note: once a "district" set, no graphical query and circle dialog are available anymore
        // & all further queries get the district parameter appended!
        "locationsearch_results": [], // near-by search street-alternatives
        "autocomplete_item": 0
    }

    var _self = this

    /** Renders either the
     *  - Standard Frontpage or (Berlin wide)
     *  - District Frontpage (District Infos, District Fulltext search)
     **/
    this.render_page = function() {
        // get current page alias
        var hash = window.location.hash
        if (!hash || hash == "#karte") {
            // render main kiezatlas page
            _self.init_map_dialog(true, undefined, false) // detectLocation=true
            _self.get_district_topics()
        } else {
            // check if we should render district page
            _self.get_district_topics(function() {
                var district = _self.get_bezirks_topic_by_hash(hash)
                if (district) {
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

    this.render_user_menu = function(state) {
        if (state) {
            $('li.register').hide()
            $('li.login').hide()
            $('li.angebote').attr('style', 'display: inline-block;')
            $('li.logout').attr('style', 'display: inline-block;')
        } else {
            $('li.register').show()
            $('li.login').show()
            $('li.angebote').hide()
            $('li.logout').hide()
        }
    }

    this.update_document_title = function(titlePrefix, titleAddon) {
        if (titlePrefix) window.document.title = titlePrefix + " - " + settings.webappTitle
        if (titleAddon) window.document.title = settings.webappTitle + " - " + titleAddon
    }

    this.render_district_page = function(topic_id) {
        var bezirk = _self.get_bezirks_topic_by_id(topic_id)
        var bezirk_html = bezirk.html
        $('.location-label .text').html("Berlin " + bezirk.value) // duplicate, use render_current_location_label
        _self.update_document_title(undefined, bezirk.value)
        $('button.star').hide()
        // set page in "district" mode
        model.district = bezirk
        // TODO: rewrite filter button container
        if ($('div.legende').children('a.district-control').length == 0) {
            $('div.legende').append('<a class="district-control" href="javascript:kiezatlas.clear_district_page()">'
                + 'Bezirksfilter aufheben</a>')
        }
        $('#fulltext-search').attr("placeholder", "Volltextsuche für " + bezirk.value)
        $('a.lock-control').hide()
        //
        $('#district-area').html(bezirk_html)
        $('#district-area').show()
        _self.show_message("Hinweis: Die Volltextsuche liefert ab jetzt nur noch Ergebnisse aus dem Bezirk <em>"
            + bezirk.value + "</em>. W&auml;hlen sie <em>Bezirksfilter aufheben</em> um wieder Berlinweit"
            + " Einrichtungen zu finden.", 7000)
        // leafletMap.map.doubleClickZoom.enable();
        var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
        _self.jump_to_map(anchor_name)
        _self.remove_circle_search_control()
        _self.show_spinning_wheel()
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
        $('#district-area').hide()
    }

    this.clear_district_filter_control = function() {
        // 1) reset district filter for subsequent fulltext-searches
        model.district = undefined
        $('#fulltext-search').attr("placeholder", "Volltextsuche")
        // 2) update gui accordingly
        $('a.district-control').remove()
        $('a.lock-control').show()
        // leafletMap.map.doubleClickZoom.disable();
        _self.clear_circle_marker_group()
        leafletMap.show_anchor() // ### this updates address bar too
    }

    this.do_current_center_circle_search = function() {
        mapping.current_location.coordinate = leafletMap.map.getCenter()
        _self.render_circle_search_control() // fitBounds=false
        _self.do_circle_search(undefined, undefined)
        _self.reverse_geocode()
        leafletMap.map.setZoom(mapping.zoomKiezLevel)
    }

    this.init_map_dialog = function(detectLocation, zoomLevel, jumpToMap) {
        // initiaze map on browsers location
        if (!leafletMap.map) {
            _self.setup_leaflet_dom('map', false)
        }
        if (jumpToMap) leafletMap.show_anchor()
        if (detectLocation) _self.get_browser_location()
        if (zoomLevel) leafletMap.map.setZoom(zoomLevel)
    }

    this.show_favourite_location = function(object) {
        //
        if (!leafletMap.map) {
            _self.setup_leaflet_dom('map', true)
        }
        //
        mapping.current_location = object
        _self.render_current_location_label()
        // render radius control at new place
        _self.render_circle_search_control()
        // then fire query
        _self.do_circle_search(undefined, undefined)
        leafletMap.map.setView(mapping.current_location.coordinate, mapping.zoomStreetLevel)
    }

    this.setup_leaflet_dom = function(dom_el_id) {
        console.log("Setting up new Leaflet Map")
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
        //
        leafletMap.setup(dom_el_id)
        // Consume Drag
        leafletMap.listen_to('drag', function(e) {
            if (mapping.isMapCircleLocked) { // #### && !model.district
                mapping.current_location.coordinate = leafletMap.map.getCenter()
                mapping.defaultRadiusMeter = mapping.circle_search_control.getRadius()
                // fire control
                _self.render_circle_search_control(false)
            }
        })
        // Consume Drag End
        leafletMap.listen_to('drag_end', function(e) {
            if (mapping.isMapCircleLocked && !model.district) {
                console.log("Website recieved drag end..")
                _self.do_circle_search(undefined, undefined)
                _self.reverse_geocode()
            }
        })
        // ...
        // browser location util
        _self.render_browser_location_button()
        // ### refactor from here on
        // show our standard location name
        _self.render_current_location_label()
        // render radius control at first place
        _self.render_circle_search_control()
    }

    this.focus_locationsearch_result = function() {
        var item = model.locationsearch_results[model.autocomplete_item]
        if (item) {
            if (!mapping.max_bounds.contains([item.geometry.location.lat, item.geometry.location.lng])) {
                mapping.current_location.name = 'Der erste gefundene Standort liegt au&szlig;erhalb '
                    + 'von Berlin, bitte w&auml;hlen sie eine der Alternativen rechts:'
                _self.render_current_location_label(true)
                leafletMap.show_anchor()
                // correct current map-viewport to default after a seemingly correct (but not sane location-query result)
                leafletMap.map.setView(mapping.current_location.coordinate, mapping.zoomStreetLevel)
            } else {
                mapping.current_location.coordinate = new L.latLng(item.geometry.location.lat, item.geometry.location.lng)
                mapping.defaultRadiusMeter = 900 // adapt circle size for this search a bit
                mapping.current_location.name = item['formatted_address']
                leafletMap.show_anchor()
                _self.render_current_location_label()
                _self.render_circle_search_control()
                _self.do_circle_search(undefined, undefined)
                leafletMap.map.panTo(mapping.current_location.coordinate)
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

    this.render_locationsearch_alternatives = function() {
        //
        var prev_location = model.locationsearch_results[model.autocomplete_item - 1]
        var next_location = model.locationsearch_results[model.autocomplete_item + 1]
        var $prev = ""
        var $next = ""
        if (prev_location) {
            $prev = $('<a class="prev-location" title="'+ prev_location['formatted_address'] +'"><</a>')
            $prev.click(function(e) {
                model.autocomplete_item = model.autocomplete_item - 1
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
                model.autocomplete_item = model.autocomplete_item + 1
                _self.focus_locationsearch_result()
                _self.render_locationsearch_alternatives()
            })
        } else {
            // empty next button
            $next = $('<a class="next-location defused" title="">></a>')
        }
        //
        $('#street-alternatives').html(model.locationsearch_results.length + ' Ergebnisse').append($prev)
        .append
        ($next)
        $('#street-alternatives').css("display", "inline-block")
        $('#street-alternatives').show()
    }

    /** object.name, object.lat, object.lng */
    this.render_current_location_label = function(hideFavBtn) {
        // ### help to reset-view
        if (!mapping.current_location.hasOwnProperty("name")) console.warn("Current location has no name")
        if (!mapping.current_location.coordinate.hasOwnProperty("lat")) console.warn("Current location has no lat")
        if (!mapping.current_location.coordinate.hasOwnProperty("lng")) console.warn("Current location has no lng")
        //
        var latitude, longitude;
            latitude = mapping.current_location.coordinate.lat.toFixed(3)
            longitude = mapping.current_location.coordinate.lng.toFixed(3)
        // ### sanity check for bigger berlin area before firing a range-query...
        $('.location-label .text').html(mapping.current_location.name
            + ' <small>('+latitude+' N, '+longitude+' E)</small>')
        _self.update_document_title(mapping.current_location.name)
        $('button.star').unbind('click')
        $('button.star').click(favourites.add_entry_to_local_db)
        //
        if (!leafletMap.map) {
            _self.setup_leaflet_dom('map', true)
        }
        //
        if (hideFavBtn) {
            $('button.star').button("disable")
        } else {
            $('button.star').button("enable")
        }
    }

    this.render_circle_search_control = function(fitBounds) {
        // setup radius control
        if (mapping.circle_search_control) {
            mapping.controlGroup.removeLayer(mapping.circle_search_control)
            leafletMap.map.removeLayer(mapping.controlGroup)
        }
        if (!model.district) {
            mapping.circle_search_control = new L.CircleEditor(mapping.current_location.coordinate, mapping.defaultRadiusMeter, {
                color: colors.ka_blue, weight: 3, opacity: .5, fillColor: colors.yellow, fillOpacity: 0,
                extendedIconClass: "extend-icon-medium", className: "leaflet-radius-control", clickable: false,
                zIndexOffset: 101
            })
            // add circle search control to map
            mapping.controlGroup.addLayer(mapping.circle_search_control)
            mapping.controlGroup.addTo(leafletMap.map)
            // add event handler to radius control
            mapping.circle_search_control.on('edit', function(event) {
                // fire a new query
                var new_radius = event.target._mRadius
                mapping.current_location.coordinate.lat = event.target._latlng.lat
                mapping.current_location.coordinate.lng = event.target._latlng.lng
                // console.log("Update circle position event TO", event, mapping.current_location)
                // ### on small screens (here, after dragging) our current center should be the mapcenter (fitBounds..)
                _self.do_circle_search(event.target._latlng, new_radius)
                _self.reverse_geocode()
            })
            // update viewport to the programmatically set radius-control
            if (fitBounds) {
                // leafletMap.map.fitBounds(mapping.controlGroup.getBounds())
                leafletMap.map.setView(
                    mapping.controlGroup.getBounds().getCenter(),
                    mapping.zoomStreetLevel)
            }
            if (mapping.isMapCircleLocked) $('.leaflet-editing-icon').hide()
        }
    }

    this.remove_circle_search_control = function() {
        if (mapping.circle_search_control) {
            mapping.controlGroup.removeLayer(mapping.circle_search_control)
            leafletMap.map.removeLayer(mapping.controlGroup)
        }
    }

    // Removes all geo object (circle markers) from the map without removing them from _self.markerGroup
    this.clear_geo_object_marker = function() {
        leafletMap.map.eachLayer(function (el) {
            // do not remove control group, just items with a geo_object id
            if (el.hasOwnProperty('options') && el.options.hasOwnProperty('geo_object_id')) {
                leafletMap.map.removeLayer(el)
            }
            leafletMap.map.addLayer(mapping.controlGroup) // ### Todo: This should never be called from this method!
        })
    }

    // Removes all geo objects from markerClusterGroup.
    this.clear_geo_object_cluster_group = function() {
        if (_self.markerGroup) {
            _self.markerGroup.eachLayer(function (el) {
                // do not remove control group, just items with a geo_object id
                if (el.hasOwnProperty('options') && el.options.hasOwnProperty('geo_object_id')) {
                    _self.markerGroup.removeLayer(el)
                }
            })
        }
    }

    this.clear_circle_marker_group = function() {
        // TODO revise this (returns straight for e.g. init via districts page)
        if (!_self.markerGroup) return
        // clear complete marker group, e.g. for fulltext_search
        _self.markerGroup.eachLayer(function (marker){
            leafletMap.map.removeLayer(marker)
        })
        _self.markerGroup = undefined
    }

    this.render_geo_objects = function(data, set_view_to_bounds) {
        // Note: Here we decide to not render any duplicates
        var list_of_markers = []
        // pre-process results
        for (var el in data) {
            var geo_object= data[el]
            if (geo_object == null || !geo_object) {
                console.warn("Skipping geo object response entry [" + el+ "]", geo_object)
            } else {
                var geo_marker = _self.create_geo_object_marker(geo_object)
                if (geo_marker) list_of_markers.push(geo_marker)
            }
        }
        // merge: maintain also all previously added markers
        if (_self.markerGroup) {
            _self.markerGroup.eachLayer(function (marker) {
                if (!_self.exist_in_marker_listing(marker.options.geo_object_id, list_of_markers)) {
                    list_of_markers.push(marker)
                }
            })
        }
        // clear marker on map
        _self.clear_geo_object_cluster_group()
        // build up: create new markerGroup
        _self.markerGroup = L.featureGroup(list_of_markers)
        _self.markerGroup.addTo(leafletMap.map)
        //
        for (var el in list_of_markers) {
            var topic = list_of_markers[el]
             _self.markerGroup.addLayer(topic)
        }
        leafletMap.map.addLayer(_self.markerGroup)
        //
        if (set_view_to_bounds && list_of_markers.length > 0) {
            // leafletMap.map.setMaxBounds(_self.markerGroup.getBounds())
            leafletMap.map.fitBounds(_self.markerGroup.getBounds())
        }
    }

    this.create_geo_object_marker = function(geo_object) {
        // Sets up an interactive leaflet marker for a "ka2.geo_object"
        if (geo_object.hasOwnProperty("geo_coordinate_lat")
            && geo_object.hasOwnProperty("geo_coordinate_lon")) {
            // 0) pre-process: geo object has geo coordinate
            var result = geo_object
            // 1) pre-processing: do worldwide coordinate check & log
            if (geo_object.geo_coordinate_lat > 90 || geo_object.geo_coordinate_lon > 180 ||
                geo_object.geo_coordinate_lat < -90 || geo_object.geo_coordinate_lon < -180 ) {
                console.info("Invalid WGS 84 coordinates spotted at", geo_object)
                return undefined
            }
            // 2) pre-processing: do berlin coordinate check & log
            if (geo_object.geo_coordinate_lon < 10 || geo_object.geo_coordinate_lat < 45 ||
                geo_object.geo_coordinate_lon > 15 || geo_object.geo_coordinate_lat > 55) {
                console.info("WGS 84 coordinates do look strange in case of Berlin", geo_object)
                return undefined
            }
            // 3) pre-precossing: do kiezatlas deep link check & log
            if (geo_object["bezirksregion_uri"] === "") {
                console.info("Invalid Geo Object - Missing Bezirksregion URI", geo_object["name"])
                return undefined
            }
            // 4) Create a circle marker
            var coordinate = L.latLng(result["geo_coordinate_lat"], result["geo_coordinate_lon"])
            var circle = L.circleMarker(coordinate, _self.calculate_default_circle_options(result))
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

    this.calculate_default_circle_options = function(result) {
        var angeboteDashArray = _self.calculate_geo_object_dash_array(result)
        var hasAngebote = (result["angebote_count"] > 0) ? true : false
        return {
            weight: (hasAngebote) ? 3 : 3, opacity: .8, fillColor: colors.ka_gold, fillOpacity: .6, lineCap: 'square',
            dashArray: angeboteDashArray, color : (hasAngebote) ? colors.m_blue : colors.ka_gold,
            title: result["name"], alt: "Markierung von " + result["name"], location_id: result["address_id"],
            geo_object_id: result["id"], uri: result["uri"], name: result["name"],// riseOnHover: true,
            bezirksregion_uri: result["bezirksregion_uri"], z_indexOffset: 1001
        }
    }

    this.calculate_selected_circle_options = function(result) {
        return {
            color: colors.ka_gold, weight: 4, opacity: 1,
            fillColor: colors.m_blue, fillOpacity: 1, className: "selected"
        }
    }

    this.calculate_geo_object_dash_array = function(item) {
        var value = item["angebote_count"]
        if (value === 0) return [75]
        if (value === 1) return [2,75]
        if (value === 2) return [2,5, 2,70]
        if (value === 3) return [2,5, 2,5, 2,65]
        if (value === 4) return [2,5, 2,5, 2,5, 2,60]
        if (value === 5) return [2,5, 2,5, 2,5, 2,5, 2,55]
        if (value === 6) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,50]
        if (value === 7) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,45]
        if (value === 8) return [2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,5, 2,40]
        if (value > 8) return [2,5]
    }

    this.select_geo_object_marker = function(marker) {
        // highlight selection
        _self.markerGroup.eachLayer(function (el) {
            // default rendering
            var geo_object_id = el.options["geo_object_id"]
            if (geo_object_id) {
                var geo_object = _self.get_geo_object_topic(el.options["geo_object_id"])
                if (geo_object) {
                    el.setStyle(_self.calculate_default_circle_options(geo_object))
                    // selected rendering
                    if (el.options['geo_object_id'] === marker.options['geo_object_id']) {
                        // ### adding class name to path does not work
                        marker.setStyle(_self.calculate_selected_circle_options(geo_object))
                        marker.bringToFront()
                        marker.setRadius(12)
                    }
                } else {
                    console.warn('Geo Object in Layer Not in Our Model', geo_object_id)
                }
            } else {
                console.warn('Geo Object Topic ID Not Encoded In Selected Element:',
                    geo_object_id, 'Element', el)
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
        // var description = geo_object.beschreibung
        var contact = geo_object.kontakt
        var opening_hours = geo_object.oeffnungszeiten
        var lor_link = _self.get_lor_link(geo_object)
        var angebote_link = ''
        if (geo_object.angebote_count > 0) {
            angebote_link = '<div class="angebote-link">'
                + '<a class="button" href="javascript:angebote.show_angebotsinfos('+geo_object.id+')">Aktuelle Angebote</a></div>'
        }
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
            + angebote_link
            + '<a href="http://www.kiezatlas.de/map/'+web_alias+'/p/'+topic_id+'" title="Diesen'
                + ' Datensatz in seinem ursprünglichen Stadtplan anzeigen">Details im Stadtplan</a>'
            + '<a href="https://fahrinfo.bvg.de/Fahrinfo/bin/query.bin/dn?Z=' + geo_object.address_name.toString()
                + '&REQ0JourneyStopsZA1=2&start=1&pk_campaign=kiezatlas.de">'
                + '<img src="/de.kiezatlas.website/images/fahrinfo.gif"></a>'
            + '</div>'
            + lor_link
            + imprint_html
        + '</div>')
    }

    // Simple HTML click handler

    this.toggle_circle_search_lock_button = function(e) {
        mapping.isMapCircleLocked = (mapping.isMapCircleLocked) ? false : true;
        if (mapping.isMapCircleLocked) {
            $('.lock-control').text('Unlock circle')
            $('.leaflet-editing-icon').hide()
            mapping.current_location.coordinate = leafletMap.map.getCenter()
            mapping.defaultRadiusMeter = mapping.circle_search_control.getRadius()
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
        _self.init_map_dialog(false, mapping.zoomKiezLevel, true)
    }

    this.handle_option_b = function(e) {
        // initiate map with edible circle control but focus on street
        _self.init_map_dialog(false, mapping.zoomStreetLevel, true)
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

    this.find_all_geo_objects = function(coordinate_id) {
        var results = []
        _self.markerGroup.eachLayer(function (el) {
            if (el.options.location_id === coordinate_id) results.push(el)
        })
        return results
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
                "setView" : true, "maxZoom" : mapping.zoomDetailLevel
            }
        }
        leafletMap.map.locate(options)
    }

    // Kiezatlas API Service helper

    this.get_district_topics = function(callback) {
        restc.load_district_topics(function(results) {
            model.districts = results.sort(_self.value_sort_asc)
            // console.log("ka_districts", model.districts)
            if (callback) callback()
            for (var i in model.districts) {
                var district = model.districts[i]
                var bezirke_html = '<li ' + 'class="bezirk">'
                        bezirke_html += '<a class="district-button" id="' + district.id
                        + '" title="zur Bezirksseite '+ district.value
                        + '" href="javascript:kiezatlas.render_district_page('
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
        })
    }

    this.load_geo_object_details = function(result_list) {
        // rendering all geo objects sharing this very geo coordinate
        if (result_list.length > 0) {
            $('#district-area').hide()
        }
        var list_geo_object_ids = []
        for (var i in result_list) {
            var geo_object_id = result_list[i].options['geo_object_id']
            list_geo_object_ids.push(geo_object_id)
            restc.load_geo_object_detail(geo_object_id, function(result) {
                _self.render_geo_object_details_card(result)
            })
        }
        // load angebote of all selected geo objects at once
        angebote.load_geo_objects_angebote(list_geo_object_ids)
    }

    this.do_circle_search = function(location, radius) {
        // ### TODO: dont query if given location and given radius "equals" our latest "query settings"
        _self.show_spinning_wheel()
        var location_string = ''
        var radius_value = mapping.defaultRadiusMeter
        if (!location) {
            location_string = mapping.current_location.coordinate.lng + ', '+mapping.current_location.coordinate.lat
        } else {
            location_string = location.lng + ', '+location.lat
        }
        if (radius) radius_value = radius
        $.getJSON('/kiezatlas/search/'+encodeURIComponent(location_string)+'/' + (radius_value / 1000),
            function (geo_objects) {
                model.items.push(geo_objects)
                // directly removing them from the map without removing them from the markergroup
                _self.clear_geo_object_marker()
                _self.hide_spinning_wheel()
                _self.render_geo_objects(geo_objects, false)
            })
    }

    this.do_text_search_geo_objects = function(text, success) {
        var queryUrl = '/kiezatlas/search/?search='+text
        if (model.district) {
            queryUrl = '/kiezatlas/search/'+model.district.id+'/?search='+text;
        }
        _self.clear_details_area()
        _self.show_spinning_wheel()
        $.getJSON(queryUrl,
            function (geo_objects) {
                console.log("> Text based search returned", geo_objects)
                // TODO: If search results are zero
                if (geo_objects.length > 0) {
                    model.items.push(geo_objects)
                    if (typeof success !== "undefined") {
                        // clear marker group completely after fulltext-search
                        _self.clear_circle_marker_group()
                        _self.hide_spinning_wheel()
                        // TODO: for resultsets bigger than 100 implement a incremental rendering method
                        _self.render_geo_objects(geo_objects, true)
                    }
                } else {
                    _self.hide_spinning_wheel()
                    _self.show_message('Keine Treffer f&uuml;r diese Suche')
                }
            })
    }

    this.reverse_geocode = function(e) {
        $.getJSON('/kiezatlas/reverse-geocode/' + mapping.current_location.coordinate.lat
                + ',' + mapping.current_location.coordinate.lng, function (geo_names) {
            _self.hide_spinning_wheel(true)
            if (geo_names.results.length > 0) {
                var first_result = geo_names.results[0]
                var components = first_result.address_components
                var o = { coordinates : "" + mapping.current_location.coordinate.lat + "," + mapping.current_location.coordinate.lng }
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
                mapping.current_location.name = o.street + " " + o.street_nr + ", " + o.city
                if (typeof o.area !== "undefined") mapping.current_location.name += " " + o.area
                _self.render_current_location_label()
            }
        })
    }

    // --- Util

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

    // --- Website Model Operations

    this.get_current_location = function(){
        return mapping.current_location
    }

    this.get_geo_object_topic = function(id) {
        for (var el in model.items) {
            var result_list = model.items[el]
            if (typeof result_list === "Object") {
                if (result_list.id === id) return result_list
            }
            for (var element in result_list) {
                var topic = result_list[element]
                if (topic.id === id) return topic
            }
        }
        return undefined
    }

    this.get_bezirks_topic = function(uri) {
        for (var i in model.districts) {
            var element = model.districts[i]
            if (element.uri === uri) return element
        }
        return undefined
    }

    this.get_bezirks_topic_by_id = function(id) {
        // console.log("Searching for bezirk in", model.districts)
        for (var i in model.districts) {
            if (model.districts[i].id === id) return model.districts[i]
        }
    }

    this.get_bezirks_topic_by_hash = function(hash) {
        for (var i in model.districts) {
            var bezirk = model.districts[i]
            var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
            if (anchor_name == hash) return bezirk
        }
    }

    this.set_autocomplete_item = function(index) {
        model.autocomplete_item = index
    }

    this.get_autocomplete_item = function() {
        return model.autocomplete_item
    }

    this.set_locationsearch_results = function(results) {
        console.log(results.length  + " items found in Place Search", _self.get_locationsearch_results())
        model.locationsearch_results = results
    }

    this.get_locationsearch_results = function() {
        return model.locationsearch_results
    }

    return this

})($, angebote)
