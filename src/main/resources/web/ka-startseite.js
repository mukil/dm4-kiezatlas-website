
// --- Frontpage State --- //
// See website-detail, website-grid and "dm4-kiezatlas-angebote/detail"
// for all global state vars

var results = [],
    MAX_RESULTS = 7,
    from = undefined,
    to = 0,
    updateURL = true, // If false, updating the url using replaceState is defunct (see text search requests)
    parameter = { // View/Page Parameter
        page: undefined, // optional location hash
        viewport: undefined, // map viewport
        from: undefined, to: undefined // search user input, search result starting from, render to
    },
    webapp_title = "Kiezatlas 2 Website",
    history_api_supported = window.history.pushState,
    selected_marker = undefined, // geoobject or marker id
    month_names_de = [ "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember" ],
    colors = {                  // kiezatlas hex colors
        "ka_blue": "#3e606f",       // circle control
        "ka_red": "#ce0000",        // districs layer polygon outline
        "ka_green": "#9cc300",      // ...
        "m_blue": "#9ec8d6",        // marker: medium blue outline and fill-in (selected)
        "ka_gold": "#EACA8F",       // marker: yellow fill-ine and outline (selected)
        "bright_grey": "#a9a9a9",   // circlemarker: fill-in
        "yellow": "#f8f6e9",        // circle control
        "darkgrey": "#343434",      // unused
        "dark_blue": "#193441",     // unused
        "bright_blue": "#ecf4f7",   // unused
        "ka_water": "#ccdddd",      // unused
        "grey": "#868686"           // unused
    },
    districts = undefined,
    bezirksTopic = undefined,
    viewSearchMap = false,
    viewCityMap = false

var $sidebarUi = undefined

// --- Page Methods -- //

function init_page(page) {
    var subdomain_mitte = (window.location.host.indexOf("mitte.") !== -1 || window.location.hostname.indexOf("mitte.") !== -1) ? true : false
    // Build up UI handlers
    $('.ui.checkbox').checkbox()
    $('.ui.menu .dropdown').dropdown()
    $sidebarUi = $('.ui.sidebar').sidebar('attach events', '.toc.item')
    // fix lower page top nav menu when passing header
    init_fixed_top_menu('.ui.vertical.segment.teaser')
    register_key_handlers()
    // ### $('.ui.sidebar').sidebar()
    // initialize data on districts
    load_district_data(function() {
        // On any page this script is loaded we render the district menu
        if (typeof districtId !== "undefined") {
            render_district_menu({ id: districtId })
        } else {
            render_district_menu()
        }
            // --- End User Facing Pages --- //
        if (page === "startseite") {
            // Register historyState API
            register_pop_state_navigation()
            get_location_hash_from_url()
            get_viewport_from_url()
            console.log("Initialized startseite page", parameter.page, searchText, searchType, searchMethod, searchContext, searchNearby, "mitte", subdomain_mitte)
            if (subdomain_mitte) {
                bezirksTopic = get_bezirks_topic_by_id(7275)
                searchContext = bezirksTopic.id
                render_frontpage("bezirk") // by bezirksTopic
            } else if (searchContext !== 0 && searchContext != null) {
                render_frontpage("bezirk") // by searchContext Id
            } else if (parameter.page) {
                bezirksTopic = get_bezirks_topic_by_hash(parameter.page)
                searchContext = bezirksTopic.id
                render_frontpage("bezirk") // by bezirksTopic
            } else {
                render_frontpage("gesamt")
            }
            init_search_page_fragment()

        } else if (page === "search-map") {
            register_pop_state_navigation()
            get_location_hash_from_url()
            get_viewport_from_url()
            render_search_map()

        } else if (page === "place") {
            init_einrichtungs_page()
            init_search_page_fragment()

        } else if (page === "place-edit") {
            init_einrichtungs_edit_page()
            init_search_page_fragment()

        } else if (page === "citymap") {
            init_citymap()

        } else if (page === "message") {
            init_fixed_top_menu('.ui.vertical.segment.commands')
            init_search_page_fragment()

        } else if (page === "sozialraumdaten") {
            init_sozialraumdaten_page()

        } else if (page === "my-entries") { // --- Angebote UI
            // 

        } else if (page === "event") { // --- Angebote UI
            init_angebots_page()
            init_search_page_fragment()

        } else if (page === "event-edit") { // -- Angebote UI
            // 

        } else if (page === "angebots_assignment") { // --- Angebote UI
            //

        } else if (page === "revise") { // --- Angebote UI
            //
            // --- Editorial Pages --- //

        } else if (page === "comments") {
            init_fixed_top_menu('.ui.vertical.segment.commands')

        } else if (page === "confirm") {
            init_fixed_top_menu('.ui.vertical.segment.commands')

        } else if (page === "editors") {
            init_editors_list()
            init_fixed_top_menu('.ui.vertical.segment.commands')

        } else if (page === "user_assignment") {
            init_fixed_top_menu('.ui.vertical.segment.commands')

        } else if (page === "filter-list") {
            init_fixed_top_menu('.ui.vertical.segment.commands')
            init_filter_list()
            // --- Kiezatlas Administrator Pages --- //

        } else if (page === "site-editor") {
            init_fixed_top_menu('#header')
            sites.init_site_editor()

        } else if (page === "site-listing") {
            init_fixed_top_menu('#header')
            sites.init_list()

        } else if (page === "facet-editor") {
            init_fixed_top_menu('.ui.vertical.segment.commands')
            sites.init_facet_editor()

        } else if (page === "sign-up") {
            //
        } else {
            init_search_page_fragment()
        }
    })
}

function init_fixed_top_menu(elementClassNames) {
    $(elementClassNames).visibility({
        once: false,
        onBottomPassed: function () {
            $('.fixed.menu').show();
            // $('.fixed.menu').transition('fade in');
        },
        onBottomPassedReverse: function () {
            // $('.fixed.menu').transition('fade out');
            $('.fixed.menu').hide();
        }
    })
}

function init_search_page_fragment() {
    init_angebote_tag_handler()
    if (searchNearby && searchNearby !== "undefined" && searchNearby.length >= 3) {
        showNearbySearch()
        set_nearby_input(searchNearby)
        // fires angebote_search subsequently (if geo-cording succeeded)
        do_search_streetcoordinates()
    } else if (searchText && searchText.length >= 2) {
        searchNearby = undefined
        set_search_input(searchText)
        if (typeof frontpage !== "undefined") {
            if (frontpage) do_text_search()
        }
    }
    init_search_type_menu()
    update_search_criteria_dialog()
}

function render_search_map() {
    viewSearchMap = true
    kiezatlas.render_map(true, undefined, false, true, true)
    set_search_input(searchText)
}

function render_frontpage(name) {
    if (name === "gesamt") {
        kiezatlas.render_gesamtstadtplan()
    } else if (name === "bezirk") {
        render_district_frontpage()
    }
}

function init_angebote_tag_handler() {
    $('.page .stichworte .tag').click(angebot_tag_clicked)
    $('.page .angebote-tags .tag').click(angebot_tag_clicked)
}

function angebot_tag_clicked(e) {
    searchType = "event"
    init_search_type_menu()
    set_search_input(e.currentTarget.innerText)
    do_text_search()
    scroll_to('query')
}

function init_citymap() {
    viewCityMap = true
    // $sidebarUi = $('.ui.sidebar').sidebar('setting', 'dimPage', false)
    // $sidebarUi.sidebar('setting', 'scrollLock', true).sidebar('setting', 'returnScroll',
    // true).sidebar('setting', 'dimPage', false).sidebar('hide')
    $('.tabular.menu .item').tab()
    // 1) setup citymap page
    citymap.init(window.location.pathname.substr(1), ($('#karte').css("display") !== "none"))
    citymap.register_page_handlers()
    // 2) update layout
    leafletMap.fit_to_height(65)
    citymap.set_sidebar_height()
    // ### Double check if districts already loaded
}

function init_einrichtungs_edit_page() {
    if (districtId !== -1) {
        searchContext = districtId
        bezirksTopic = get_bezirks_topic_by_id(districtId)
        if (bezirksTopic) {
            show_context_subline()
        } else {
            console.warn("Bezirks Topic could not be loaded")
        }
    }
    console.log("initializing place edit page \"", searchText, "\" type=", searchType, "site=", searchContext,
                "method=", searchMethod, "nearby=", searchNearby)
}

function init_sozialraumdaten_page() {
    // Yet nothing to do here
}

function init_einrichtungs_page() {
    if (districtId !== -1) {
        searchContext = districtId
        bezirksTopic = get_bezirks_topic_by_id(districtId)
        if (bezirksTopic) {
            show_context_subline()
        } else {
            console.warn("Bezirks Topic could not be loaded")
        }
    }
    init_detail_map()
}

function init_angebots_page() {
    console.log("initializing event page search=", searchText, "type=", searchType, "context=", searchContext,
        "method=", searchMethod, "nearby=", searchNearby)
}



/** --- District Frontpage / Bezirks-Startseite Rendering --- */

function render_district_frontpage() {
    if (frontpage) {
        if (!bezirksTopic) {
            bezirksTopic = get_bezirks_topic_by_id(searchContext)
            console.log("Rendering Bezirks-Startseite by searchContext ID:" , searchContext, "Topic", bezirksTopic.value)
        } else {
            console.log("Rendering Bezirks-Startseite by Topic", bezirksTopic.value)
        }
        if (bezirksTopic) { // Renders BEZIRKSPAGE
            set_site_info(bezirksTopic)
            // kiezatlas.load_marker_cluster_scripts()
            mapping.do_cluster_marker = true
            kiezatlas.render_map(false, parameter.viewport, false, true) // detectLocation=false
            // sets district filter
            show_district_frontpage()
            render_district_menu(bezirksTopic)
            return
        }
        kiezatlas.clear_district_page()
        kiezatlas.render_gesamtstadtplan() // Renders GESAMTSTADTPLAN
        console.info("Gesamtstadplan Fallback - No district with given ID found")
    }
}

function click_circle_search_action() {
    kiezatlas.clear_district_page()
    scroll_to('map-row')
    // leafletMap.scroll_into_view()
}

function render_district_menu(districtVal) {
    var bezirke = districts
    var $bezirk = $('#bezirksauswahl')
        $bezirk.empty()
    // Render inactive/active "Gesamtstadtplan" button
    var $gesamt = $('<a href="#gesamt" id="gesamt" class="item gesamt">Gesamtstadtplan</a>')
        $gesamt.click(handle_bezirks_item_click)
    if (!districtVal) $gesamt.addClass("active")
    $bezirk.append($gesamt)
    for (var idx in bezirke) {
        var bezirk = bezirke[idx]
        var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
        var $menuitem = $('<a href="'+anchor_name+'" id="'+encodeURIComponent(bezirk.value.toLowerCase())+'" class="item '+anchor_name+'">'+ bezirk.value +'</a>')
        if (districtVal) if (bezirk.id === districtVal.id) $menuitem.addClass('active')
        if (anchor_name.indexOf("marzahn") !== -1 || anchor_name.indexOf("reinickendorf") !== -1 || anchor_name.indexOf("pankow") !== -1) {
            $menuitem.addClass("disabled")
        } else {
            $menuitem.click(handle_bezirks_item_click)
        }
        $bezirk.append($menuitem)
    }
}

function handle_bezirks_item_click(e) {
    var click_href = e.target.getAttribute("href")
    if (click_href.indexOf("/") === 0) {
        click_href = click_href.substr(1)
    }
    if (typeof frontpage === "undefined" || !frontpage) {
        window.document.location.assign(window.document.location.origin + "/website" + click_href)
        return
    }
    if (frontpage && click_href === "#gesamt") {
        kiezatlas.clear_district_page()
        render_frontpage("gesamt")
    } else if (frontpage) {
        bezirksTopic = get_bezirks_topic_by_hash(click_href)
        searchContext = bezirksTopic.id
        $('.ui.dropdown').dropdown('hide')
        render_frontpage("bezirk")
        update_search_criteria_dialog()
    }
}

function show_district_frontpage() {
    // var bezirk_html = bezirksTopic.html
    var bezirk_name = bezirksTopic.value
    var bezirk_feed_url = bezirksTopic.newsfeed
    $('.teaser .header b').text(bezirk_name)
    kiezatlas.show_message("<em>Die Volltextsuche liefert ab jetzt nur Ergebnisse aus dem Bezirk</em> <b>"
        + bezirk_name + "</b><em>. W&auml;hlen sie <em>Bezirksfilter aufheben</em> um wieder Berlinweit"
        + " Einrichtungen zu finden.</em>", 4000)
    show_context_subline()
    show_newsfeed_area(searchContext, bezirk_feed_url)
    update_search_criteria_dialog()
    // leafletMap.scroll_into_view()
    kiezatlas.set_mapcontrol_mode_results()
    kiezatlas.update_document_title(undefined, bezirk_name)
    show_loading_map()
    // update map segment title
    $('.location-label .text').html('Gesamtstadtplan f&uuml;r ' + bezirk_name)
    // Load Geo Objects in District
    karestc.load_district_topics(searchContext, function(response) {
        hide_loading_map()
        leafletMap.clear_marker()
        // _self.hide_spinning_wheel()
        leafletMap.set_items(response)
        /** if (parameter.viewport) {
            leafletMap.render_geo_objects(false)
        } else { **/
        leafletMap.render_geo_objects(true)
        //}
    })
}

function show_context_subline() {
    if (bezirksTopic) {
        var contextName = bezirksTopic.value
        var contextHtml = bezirksTopic.html
        $('.teaser .header.subline').html(contextHtml)
        $('.teaser .header.white b').text(contextName)
    } else {
        console.warn("No context subline available")
    }
    // ### append imprint
}

function show_newsfeed_area() {
    // gather news context
    var contextId = searchContext
    if (bezirksTopic) {
        var contextName = bezirksTopic.value
        var feedUrl = bezirksTopic.newsfeed
        if (feedUrl !== "undefined") {
            $('.content .column .aktuelles .news-item').remove()
            $('.content .column .aktuelles').append('<div class="ui loader">Lade Aktuelles</div>')
            // load news feed
            karestc.load_news_items(contextId, function(results) {
                // construct news items
                if (!results) {
                    console.warn("Error fetching newsfeed for ", bezirksTopic.value, feedUrl)
                    return
                }
                var html_item = ""
                if (results.length > 0) {
                    for (var r in results) {
                        var news = results[r]
                        html_item += '<div class="news-item">'
                            + '<div class="date bold">' + kiezatlas.format_date(news.published) + '</div>'
                            + '<div class="headline">' + news.title + '</div><a href="'
                            + news.link +'" target="_blank"><i class="icon caret right"/>mehr Infos</a>'
                        + '</div>'
                    }
                } else {
                    html_item = '<div class="news-item">Entschuldigen Sie bitte...</div>'
                    html_item += '<div class="news-item">Der Newsfeed f&uuml;r diese Site (<a target="_blank" href="'
                            + feedUrl + '">Link</a>) konnte gerade nicht geladen werden.</div>'
                }
                // render "aktuelles" column
                $('.content .column.aktuelles h3 .context').text('in ' + contextName)
                var $area = $('.content .column.aktuelles .news-area')
                    $area.empty()
                    $area.append(html_item)        
            })
        } else {
            console.warn("No newsfeed for context", contextId, "available")
        }
    } else {
        console.warn("No bezirkstopic for context", contextId, "available")
    }
}

// --- Leaflet Map Dialog Functionality -- //

function init_map_segment() {
    // ### get page parameter
    // enable circle search
    kiezatlas.render_map(false, false, false, true, false)
    kiezatlas.do_circle_search(undefined, undefined)
    kiezatlas.render_current_location_label()
    var radiusM = leafletMap.get_circle_control_radius()
    console.log("Im Umkreis von", radiusM, " Metern")
    // hide loading indicator
    // use heatmap visualization first
    // set map mode "angebote" oder "einrichtungen"
}

function show_loading_map() {
    $('#map').append('<div class="ui text loader">Lade Stadtplan...</div>')
    $('#map .leaflet-map-pane').css('opacity', 0.7)
}

function hide_loading_map() {
    $('#map .loader').remove()
    $('#map .leaflet-map-pane').removeAttr('style')
}

function create_nearby_marker(place) {
    if (place.latitude && place.longitude) {
        var coords = L.latLng(place.latitude, place.longitude)
        var marker = L.circleMarker(coords, {
            weight: 2, opacity: 1, fillColor: model.colors.ka_yellow, fillOpacity: 1, color : model.colors.blue3,
            geo_object_id: place.id, title: place.name + ', ' + place.anschrift
        })
        marker.on('click', function(e) {
            window.document.location.href = "/website/geo/" + e.target.options.geo_object_id
        }).bindPopup('<h4>' + place.name + '</h4>', {'offset': L.point(0, -10)})
        marker.on('mouseover', function(e) {
            // check if popup is openn ..if (this.popup)
            // e.target.setStyle({ fillOpacity: 1, opacity: 1 })
            this.openPopup()
        })
        marker.on('mouseout', function(e) {
            // e.target.setStyle({ fillOpacity: 0.6, opacity: 0.6 })
            this.closePopup()
        })
        return marker
    }
}

function activate_circle_search() {
    clear_map()
    leafletMap.activate_circle_control()
    leafletMap.set_zoom(mapping.kiez_detail)
    leafletMap.set_circle_control_fixed(true)
    leafletMap.set_circle_control_radius(NEIGHBOUR_QUERY_RADIUS)
    var mapCenter = leafletMap.get_map_center()
    leafletMap.set_current_location_coords(mapCenter)
    leafletMap.map.setView(mapCenter, mapping.zoom_street)
    leafletMap.render_circle_search_control()
    do_circle_search(undefined, undefined)
    // kiezatlas.do_reverse_geocode()
    leafletMap.listen_to('drag_end', function(e) {
        if (e.detail >= 8) {
            if (leafletMap.is_circle_query_active() && leafletMap.is_circle_control_fixed()) {
                do_circle_search(undefined, undefined)
            }
        }
    })
    leafletMap.listen_to('drag', function(e) {
        if (leafletMap.is_circle_control_fixed()) {
            leafletMap.set_current_location_coords(leafletMap.get_map_center())
            leafletMap.set_circle_control_radius(leafletMap.get_circle_control_radius())
            leafletMap.activate_circle_control()
            leafletMap.render_circle_search_control(false)
        }
    })
    leafletMap.listen_to('marker_select', function(e) {
        // clear_details_area()
        show_selected_geo_details(e.detail)
        selected_marker = e
    })
    leafletMap.listen_to('marker_mouseover', function(e) {
        var geo_objects_under_marker = leafletMap.find_all_geo_objects(e.detail.target.options['address_id'])
        show_marker_name_info(geo_objects_under_marker)
    })
    leafletMap.listen_to('marker_mouseout', function(e) {
        hide_marker_name_info()
    })
    if (leafletMap.is_circle_query_active()) {
        $('#map .circle-control .button').remove()
    }
    scroll_to('map')
}

function show_selected_geo_details (result_list) {
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
    }
}

function show_marker_name_info(objects) {
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

function hide_marker_name_info () {
    $('#marker-name', '#map').hide()
}

function clear_map() {
    leafletMap.map.removeLayer(singleGroupLayer)
}

function create_location_string(location) {
    var location_string = ''
    if (!location) {
        location_string = leafletMap.get_current_location_lng() + ', '+ leafletMap.get_current_location_lat()
    } else {
        location_string = location.lng.toFixed(4) + ', '+location.lat.toFixed(4)
    }
    return location_string
}

function do_circle_search(location, radius) {
    // _self.show_spinning_wheel()
    // _self.set_mapcontrol_mode_query()
    var location_string = create_location_string(location)
    var radius_value = radius
    if (!radius) radius_value = leafletMap.get_circle_control_radius()
    $.getJSON('/website/search/'+encodeURIComponent(location_string)+'/' + (radius_value / 1000),
        function (geo_objects) {
            if (geo_objects.length > 0) {
                leafletMap.set_items(geo_objects) // ### let markers add up
                leafletMap.clear_marker()
                leafletMap.render_geo_objects(false)
            } else {
                // _self.show_message('Keine Treffer in diesem Umkreis', 2000)
            }
            // _self.hide_spinning_wheel()
        })
}


/** --- Browser History Navigation Methods --- */

function get_location_hash_from_url() {
    var locationHash = window.location.hash
    if (window.location.hash) {
        parameter.page = locationHash
    }
}

function get_viewport_from_url() {
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
    parameter.viewport = { center: mapCenter, zoom: zoomstufe }
}

function register_pop_state_navigation() {
    if (settings.history_api_supported) {
        window.onpopstate = function(e) {
            /** if (e.state) {
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
            }**/
            console.log("Popstate event noticed", e.state)
        }
    }
}

function get_page_parameter() {
    return "?search=" + searchText + "&type=" + searchType + "&method=" + searchMethod + "&context=" + searchContext
            + "&nearby=" + encodeURIComponent(searchNearby)
}

function get_context_parameter_from_url () {
    // var viewport = undefined // _self.get_map_viewport_from_url()
    // var locationHash = window.location.hash
    if (window.location.hash.indexOf("&context") !== -1) {
        paramStart = window.location.hash.indexOf("&context")
        paramEnd = window.location.hash.indexOf("&nearby")
        contextId = window.location.hash.slice(paramStart + "&context=".length, paramEnd)
        return contextId
    }
    return 0
}

function replace_page_parameters() {
    parameter.search = searchText
    parameter.searchType = searchType
    parameter.searchMethod = searchMethod
    parameter.searchContext = searchContext
    parameter.searchNearby = searchNearby
    parameter.from = from
    parameter.to = to
    var url = window.document.location.origin
    if (frontpage) {
        url += '/website'
    } else if (viewCityMap) {
        console.log("Skipping update of url page parameter...")
        return
    } else {
        url += window.document.location.pathname
    }
    url += get_page_parameter()
    if (history_api_supported) {
        // console.log("replace history state", parameter, url)
        window.history.replaceState(parameter, webapp_title, url)
    } else {
        console.warn("window.history manipulation not supported", window.navigator)
    }
}

function create_viewport_parameter() {
    var mapView = leafletMap.get_map_viewport()
    var viewportState = undefined
    if (mapView) {
        viewportState = "?koordinate=" + mapView.center.lat.toFixed(5) + "," + mapView.center.lng.toFixed(5) + "&zoomstufe=" + mapView.zoom
    }
    return viewportState
}



/** --- Search Dialog Handlers --- **/

function toggleSearchCriteria() {
    $('.ui.grid.filter').toggle()
    var $headerIcon = $('.search-criterias .header .caret')
    if ($headerIcon[0].className.indexOf('down') !== -1) {
        $headerIcon.addClass('up')
        $headerIcon.removeClass('down')
    } else {
        $headerIcon.addClass('down')
        $headerIcon.removeClass('up')
    }
}

function get_search_input() {
    return $('#query').val()
}

function set_search_input(value) {
    searchText = value
    $('#query').val(value)
}

function set_nearby_input(value) {
    searchNearby = value
    $('#nearby').val(value)
}

function register_key_handlers() {
    $("#query").keyup(function(e) {
        const keyName = e.key
        if (keyName === "Enter") {
            do_text_search()
        }
    })
    $("#nearby").keyup(function(e) {
        const keyName = e.key
        if (keyName === "Enter") {
            do_search_streetcoordinates()
        }
    })
}

function do_angebote_search() {
    show_results_container()
    show_loading_search()
    fire_angebote_search(searchText, function(events) {
        angebotsinfos = events
        render_angebote_search_results()
    })
}

function do_text_search() {
    // reset search result list container
    to = 0
    $('.more-results').data("result-from", to)
    // fire query
    searchText = get_search_input()
    show_results_container()
    show_loading_search()
    var queryUrl = '/website/search/autocomplete?query=' + searchText
    if (searchType === "event") {
        // Fire search query
        do_angebote_search()
    } else if (searchType === "place") {
        // Prepare the correct search endpoint
        if (searchMethod === "fulltext") {
            queryUrl = '/website/search/?search=' + searchText
            if (searchContext != 0) {
                queryUrl = '/website/search/' + searchContext + '/?search=' + searchText
            }
        } else if (searchMethod === "quick") {
            searchContext = 0 // quicksearch is not available with district filter
        }
        // Fire search request
        $.getJSON(queryUrl, function (geo_objects) {
            // Handling search result formats
            if (searchMethod === "quick") {
                results = geo_objects.results.cat1.results // Einrichtungen
            } else if (searchMethod === "fulltext") {
                results = geo_objects
            }
            render_search_results()
        })   
    }
    replace_page_parameters()
    update_search_criteria_dialog()
}

function show_loading_search() {
    $('.result-list .container').html('<div class="ui active dimmer inverted">'
        + '<div class="ui loader">Suche gestartet</div>'
    + '</div>')
    $('.search-results .count').text('...')
    hide_more_results_button()
}

function show_results_container() {
    $('.search-results').removeClass('hidden')
    $('.result-list').removeClass('hidden')
    $('.search-results .header').removeClass('hidden')
}

function hide_results_container() {
    $('.search-results').addClass('hidden')
    $('.result-list').addClass('hidden')
    $('.search-results .header').addClass('hidden')
    $('.segment.more-button').addClass('hidden')
}

function show_more_results_button(count) {
    $('.segment.more-button').removeClass('hidden')
    $('.more-results .count').text(count)
}

function hide_more_results_button() {
    $('.segment.more-button').addClass('hidden')
}

function hideAngeboteTags() {
    $('.ui.grid.filter .column.angebote-tags').addClass('hidden')
}

function showAngeboteTags() {
    $('.ui.grid.filter .column.angebote-tags').removeClass('hidden')
}

function click(e) {
    e.stopPropagation()
    window.document.location.assign(e.currentTarget.href + get_page_parameter())
    return false
}

function init_search_type_menu() {
    // init new search dropdown component according for place
    if (typeof searchType === "undefined" ||  searchType == null) {
        searchType = "place"
    }
    $('.search .ui.dropdown').dropdown({
        onChange: search_menu_changed,
        values: [
            {
                name: 'Einrichtungen',
                value: 'place',
                selected: (searchType === "place") ? true : false
            },
            {
                name     : 'Angebote',
                value    : 'event',
                selected :  (searchType === "event") ? true : false
            }
        ]
    })
}

function search_menu_changed(value, text, $selectedItem) {
    searchType = value
    replace_page_parameters()
    update_search_criteria_dialog()
}

function update_search_criteria_dialog() {
    console.log("Updating search criteria dialog", searchType, searchContext, searchMethod, searchNearby)
    if (searchType === "place") {
        hideAngeboteTags()
        disableNearbySearchChecked()        // deactivate nearby search for both
        hideNearbySearch()
        if (searchContext == 0) {
            checkBerlinwideSearchbox()
        }
        enableQuickSearchCheckbox()
        if (searchMethod === "quick") {
            // deactivate district filter
            disableDistrictCheckboxes()
            checkQuickSearchbox()
            // checkBerlinwideSearchbox()
        } else if (searchMethod === "fulltext") {
            // activate district filter
            enableDistrictCheckboxes()
        }
    } else if (searchType === "event") {
        showAngeboteTags()
        enableNearbySearchChecked()         // deactivate district filter in general
        disableDistrictCheckboxes()        // activate nearby search
        checkFulltextSearchbox()
        checkBerlinwideSearchbox()
        disableQuickSearchCheckbox()
    }
    if (searchNearby && searchNearby !== "undefined" && searchNearby.length > 2) {
        $('#nearby').val(searchNearby)
        enableNearbySearchChecked()
        checkNearbySearchbox()
        // do_search_streetcoordinates()
    }
    // Well, semantic ui does neither update dom properly nor does it wrap the correct element.
    // This is a workaround to let our (form) HTML reflect the state of the currentsearch criterias.
    // $('[name="area"]').removeAttr("checked")
    // So we check the input field buttons by classname
    if (searchContext) {
        $(".ui.checkbox." + searchContext).checkbox("check")
        $(".ui.checkbox." + searchContext + " input").attr("checked", "checked")   
    }
    if (searchMethod) {
        $(".ui.checkbox." + searchMethod).checkbox("check")
        $(".ui.checkbox." + searchMethod + " input").attr("checked", "checked")
    }
    if (searchText) {
        $('#query').val(searchText)
    }
    render_query_parameter()
}

function quickSearchChecked() {
    searchMethod = "quick" // or "fulltext"
    berlinSearchChecked({id: 0}) // only available berlin wide
    disableDistrictCheckboxes()
    // checkBerlinwideSearchbox()
    replace_page_parameters()
}

function fulltextSearchChecked() {
    var checkedDistrict = $('.ui.grid .district .checkbox.checked input')
    searchMethod = "fulltext" // or "quick"
    if (checkedDistrict[0]) {
        searchContext = parseInt(checkedDistrict[0].id)
        // ### console.log("fulltextSearchChecked - check if district filter is checked", searchContext, checkedDistrict[0])
    }
    replace_page_parameters()
    enableDistrictCheckboxes()
}

function showNearbySearch() {
    $('.ui.grid.filter .column.nearby').removeClass('hidden')
    replace_page_parameters()
}

function hideNearbySearch() {
    $('.ui.grid.filter .column.nearby').addClass('hidden')
    $('.query-parameter .parameter.location').remove()
}

function berlinSearchChecked(e) {
    if (frontpage) {
        // set district filter
        $('.ui.grid.filter .column.nearby').addClass('hidden')
        searchContext = e.id
        bezirksTopic = get_bezirks_topic_by_id(e.id)
        // district search is only availabe with searchMethod=fulltext
        if (searchContext != 0) {
            fulltextSearchChecked()
            render_district_frontpage()
        } else if (searchContext == 0) {
            // check gesamtberlin
            checkBerlinwideSearchbox()
        }
    } else {
        searchContext = e.id
        if (searchContext != 0) {
            bezirksTopic = get_bezirks_topic_by_id(e.id)
            show_context_subline()
            // ### leave radiobutton unchecked and check preovious cheked again
            console.log("Set District Filter", bezirksTopic.value)   
        }
    }
    replace_page_parameters()
    return true
}

function enableNearbySearchChecked() {
    $('.ui.checkbox.circle input').removeAttr('disabled')
}

function disableNearbySearchChecked() {
    $('.ui.checkbox.circle input').attr('disabled', "disabled")
}

function disableQuickSearchCheckbox() {
    $('.ui.checkbox.quick input').attr('disabled', "disabled")
}

function enableQuickSearchCheckbox() {
    $('.ui.checkbox.quick input').removeAttr('disabled')
}

function enableDistrictCheckboxes() {
    $('.ui.grid .district .checkbox input').removeAttr('disabled')
    $('.ui.grid .district .checkbox.1707925 input').attr('disabled', "disabled")
    $('.ui.grid .district .checkbox.7290 input').attr('disabled', "disabled")
    $('.ui.grid .district .checkbox.1707928 input').attr('disabled', "disabled")
}

function disableDistrictCheckboxes() {
    $('.ui.grid .district .checkbox input').attr('disabled', "disabled")
}

function checkFulltextSearchbox() {
    $('.ui.radio.checkbox.fulltext').checkbox('check')
    searchMethod = "fulltext"
}

function checkNearbySearchbox() {
    $('.ui.radio.checkbox.circle').checkbox('check')
}

function checkQuickSearchbox() {
    $('.ui.radio.checkbox.quick').checkbox('check')
    searchMethod = "quick"
}

function checkBerlinwideSearchbox() {
    $('.ui.radio.checkbox.berlin').checkbox('check')
    searchContext = 0
}

// --- Search Results Rendering --- //

function render_search_results() {
    if (viewSearchMap) {
        leafletMap.set_items(results)
        leafletMap.render_geo_objects(true)
    } else {
        var $container = $('.result-list .container')
        var count = results.length
        from = $('.more-results').data("result-from")
        to += MAX_RESULTS
        if (from === 0) {
            $container.empty()
        }
        $('.search-results .count').text(count)
        if (count > 0) {
            show_results_container()
            if (searchType === "place") {
                if (searchMethod === "quick") {
                    render_place_search_results(from, to, count, $container)
                } else if (searchMethod === "fulltext") {
                    render_place_fulltext_search_results(from, to, count, $container)
                }
            } else if (searchType === "event") {
                // ### exclude which were never assigned to a place
                render_event_search_results(from, to, count, $container)
            }
        } else {
            contextText = (searchContext == 0) ? (typeof searchNearby !== "undefined") ? " in der Nähe von " + searchNearby : " in Gesamtberlin " : (bezirksTopic) ? " im Bezirk " + bezirksTopic.value : " in diesem Bezirk"
            // filterText = (searchText)
            $('.result-list .container').html('Zur Suchanfrage "' + searchText + '" ' + contextText + ' gab es keine Treffer')
        }
        $(".item a").on('click', click)
    }
}

function render_place_fulltext_search_results(from, to, count, $container) {
    rendering:
    for (var r in results) {
        if (r >= from && r < to) {
            var el = results[r]
            // var anschrift = (el.anschrift) ? el.anschrift.replace(' Deutschland', '') + ', ' : ''
            $container.append('<div class="item"><h3 class="thin">' + el.name + '</h3>'
                + '<div class="subline">' + el.anschrift.replace(" Berlin Deutschland", "") +', ' + el.bezirk + '<br/>'
                + '<a href="/website/geo/'+ el.id +'">'
                + '<i class="icon caret right"></i>mehr Infos</a></div></div>')
        }
    }
    if (to > count) {
        hide_more_results_button()
    } else {
        show_more_results_button(count)
        $('.more-results').data("result-from", to)
    }
}

function render_place_search_results(from, to, count, $container) {
    rendering:
    for (var r in results) {
        if (r >= from && r < to) {
            var el = results[r]
            // var anschrift = (el.anschrift) ? el.anschrift.replace(' Deutschland', '') + ', ' : ''
            $container.append('<div class="item"><h3 class="thin">' + el.name + '</h3>'
                + '<div class="subline">' + el.zusatz +'<br/>'
                + '<a href="/website/geo/'+ el.link.substr((el.link.lastIndexOf("/")+1)) +'">'
                + '<i class="icon caret right"></i>mehr Infos</a></div></div>')
        }
    }
    if (to > count) {
        hide_more_results_button()
    } else {
        show_more_results_button(count)
        $('.more-results').data("result-from", to)
    }
}

function render_fulltext_list_item(el, $container) {
    $container.append(get_event_list_item_html(el))
}

function render_spatial_list_item(el, $container) {
    $container.append(get_spatial_event_list_item_html(el))
}

function render_event_search_results(from, to, count, $container) {
    rendering:
    for (var r in results) {
        if (r >= from && r < to) {
            var el = results[r]
            if (searchType === "event" && searchMethod === "fulltext" && location_coords) {
                $container.append(get_spatial_event_list_item_html(el))
            } else {
                $container.append(get_event_list_item_html(el))
            }
        }
    }
    if (to > count) {
        hide_more_results_button()
    } else {
        show_more_results_button(count)
        $('.more-results').data("result-from", to)
    }
}

function get_event_list_item_html(element) {
    if (!element.locations) return ""
    var location_count = element.locations.length
    var first_assignment = element.locations[get_random_int_inclusive(1, location_count+1)]
    if (!first_assignment) first_assignment = element.locations[0]
    if (first_assignment) {// Angebote werden nur angezeigt wenn sie mindestens ein "Assignment" haben
        var standort_html = (location_count > 1) ? location_count + ' Standorten' : ' einem Standort'
        var zb_html = (location_count > 1) ? 'z.B. vom' : 'Vom'
        var html_string = '<div class="item"><h3 class="thin">' + element.name + '</h3>'
                + '<div class="subline">wird an ' + standort_html + ' angeboten, '
                + zb_html +' <i>'+first_assignment.anfang+'</i> bis </i>'+first_assignment.ende+'</i>, <b>' + first_assignment.name + '</b>'
        if (!is_empty(element.kontakt)) html_string += '<br/><span class="contact">Kontakt: ' + element.kontakt + '</span>'
        // if (element.creator) html_string += '<br/><span class="username">Info von <em>'+element.creator+'</em></span>'
        html_string += '<br/><a href="/angebote/'+ element.id +'"><i class="icon caret right"></i>mehr Infos</a></div></div>'
        return html_string
    }
    return ""
}

function get_spatial_event_list_item_html(element) {
    var locationName = element.name
    var name = element.angebots_name
    var angebots_id = element.angebots_id
    var distanceValue = "&nbsp;"
    if (element.search_distance) {
        distanceValue = 'Entfernung ca. ' + (element.search_distance).toFixed(1) + 'km'
    }
    var html_string = '<div class="item" id="'+angebots_id+'">'
        + '<h3 class="angebot-name">' + name + ' @ ' + locationName + '</h3>'
        + 'Vom '+element.anfang+' bis '+element.ende + ''
    if (element.creator) html_string += ', <span class="username">Info von <em>'+element.creator+'</em></span>'
    if (!is_empty(element.kontakt)) html_string += '<br/><span class="contact">Kontakt: ' + element.kontakt + '</span>'
    html_string += '<br/><span class="air-distance">'+distanceValue+'</span>'
    html_string += '<br/><a href="/angebote/'+ angebots_id +'"><i class="icon caret right"></i>mehr Infos</a>'
    html_string += '</div>'
    return html_string
}

/** Utility Methods **/

function scroll_to(custom_anchor) {
    if (custom_anchor) {
        document.getElementById(custom_anchor).scrollIntoView()
    }
}

function focus_location_input_field() {
    showNearbySearch()
    scroll_to('query')
    $('#streetnr').focus()
}

function load_district_data(handleResults) {
    if (!districts) {
        karestc.load_districts(function(results) {
            districts = results.sort(karestc.value_sort_asc)
            if (handleResults) handleResults()
        })
    } else {
        handleResults()
    }
}

function get_bezirks_topic_by_id(id) {
    for (var i in districts) {
        if (districts[i].id === parseInt(id)) return districts[i]
    }
}

function get_bezirks_topic_by_hash(hash) {
    for (var i in districts) {
        var bezirk = districts[i]
        var anchor_name = '#' + encodeURIComponent(bezirk.value.toLowerCase())
        if (anchor_name === hash) return bezirk
    }
}

function do_logout() {
    throw new Error("Logout not yet migrated...")
    karestc.logout()
    window.document.location.reload()
}


/** --- Administrative UI Page Handlers ---*/

function init_editors_list() {
    $('#listing select.ui.dropdown').dropdown({
        fullTextSearch: true, placeholder: "Benutzer auswählen"
    })
    //list.init_page()
}

function init_filter_list() {
    $('#listing').dataTable({ "lengthMenu": [ 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2000 ] })
}

function refresh_list_filter() {
    var selection = document.getElementById("districts")
    if (selection) {
        var districtId = document.getElementById("districts").value
        window.document.location.href = "/website/list/filter/" + districtId
    }
}

function refresh_comment_list() {
    var selection = document.getElementById("districts")
    if (selection) {
        console.log("Navigating to district comment list...")
        var districtId = document.getElementById("districts").value
        window.document.location.href = "/website/list/hinweise/" + districtId
    }
}

function refresh_regionen_list() {
    var selection = document.getElementById("districts")
    if (selection) {
        console.log("Navigating to district bezirksregionen editors list...")
        var districtId = document.getElementById("districts").value
        window.document.location.href = "/website/list/bezirksregionen/" + districtId
    }
}

function refresh_confirmation_list() {
    var selection = document.getElementById("districts")
    if (selection) {
        console.log("Navigating to district confirmation list...")
        var districtId = document.getElementById("districts").value
        window.document.location.href = "/website/list/freischalten/" + districtId
    }
}
