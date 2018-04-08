
// --- Frontpage State --- //
// See website-detail, website-grid and "dm4-kiezatlas-angebote/detail"
// for all global state vars

var results = [],
    MAX_RESULTS = 7,
    from = undefined,
    to = 0,
    updateURL = true, // If false, updating the url using replaceState is defunct (see text search requests)
    parameter = { // View/Page Parameter
        page: undefined, viewport: undefined,
        searchType: undefined, searchMethod: undefined, // "place", or "event" method: "quick", // or "fulltext"
        searchNearby: undefined, searchContext: undefined, //  "berlin", "nearby" or some "Street Nr" // 0=berlin-wide, otherwise number (ID) of district or site topic‚
        search: undefined, from: undefined, to: undefined // search user input, search result starting from, render to
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
    bezirksTopic = undefined

var $sidebarUi = undefined

// --- Page Methods -- //

function init_page(page) {
    // Build up UI handlers
    $('.ui.checkbox').checkbox()
    $('.ui.menu .dropdown').dropdown()
    // init new search dropdown component according to searchType
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
                selected : (searchType === "event") ? true : false
            }
        ]
    })
    // $('.ui.sidebar').sidebar()
    // init_map_segment()
    if (page === "gesamt") {
        // initialize data on districts
        load_district_data(function() {
            console.log("Initialized district topics on page", page)
            render_district_topic()
        })
        // Register historyState API
        kiezatlas.init_page_navigation()
        parameter = kiezatlas.get_page_parameter_from_url()
        kiezatlas.render_page("#gesamt")
    } else if (page === "place") {
        init_einrichtungs_page()
    }
}

function init_einrichtungs_page() {
    init_detail_map() // function defined in "website-detail" template
    if (districtId !== -1) {
        searchContext = districtId
        load_district_data(function(e) {
            bezirksTopic = get_bezirks_topic_by_id(districtId)
            if (bezirksTopic) {
                show_context_subline()
            } else {
                console.warn("Bezirks Topic could not be loaded")
            }
        })
    }
    update_search_criteria_dialog()
}

function init_angebots_page() {
    console.warn("Not yet implemented..")
}

function render_district_topic() {
    // ### Make rendering page parameter dynamic again
    bezirksTopic = get_bezirks_topic_by_hash("#mitte")
    if (bezirksTopic) { // Renders BEZIRKSPAGE
        searchContext = bezirksTopic.id
        set_site_info(bezirksTopic)
        show_district_frontpage()
        // load_marker_cluster_scripts()
        // render_map(false, parameter.viewport, false, true) // detectLocation=false
        // sets district filter
        // show_district_page(_self.get_site_info().id)
        // render_district_menu(bezirksTopic)
    } else {
        kiezatlas.render_gesamtstadtplan() // Renders GESAMTSTADTPLAN
        console.warn("Entschudligung, die Bezirksseite "+parameter.page+" konnte nicht geladen werden. ")
    }
}

function show_district_frontpage() {
    // var bezirk_html = bezirksTopic.html
    var bezirk_name = bezirksTopic.value
    var bezirk_feed_url = bezirksTopic.newsfeed
    $('.teaser .header b').text(bezirk_name)
    kiezatlas.show_message("<em>Die Volltextsuche liefert ab jetzt nur Ergebnisse aus dem Bezirk</em> <b>"
        + bezirk_name + "</b><em>. W&auml;hlen sie <em>Bezirksfilter aufheben</em> um wieder Berlinweit"
        + " Einrichtungen zu finden.</em>", 7000)
    show_context_subline()
    show_newsfeed_area(searchContext, bezirk_feed_url)
    update_search_criteria_dialog()
    /**
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
    _self.update_document_title(undefined, bezirk_name)
    _self.show_spinning_wheel()
    // Load Newsfeed in District
    kiezatlas.show_newsfeed_area(topic_id, bezirk_feed_url)
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
    }) **/
}

function update_search_criteria_dialog() {
    // Well, semantic ui does neither update dom properly nor does it wrap the correct element.
    // This is a workaround to let our (form) HTML reflect the state of the currentsearch criterias.
    // $('[name="area"]').removeAttr("checked")
    if (searchContext) {
        $(".ui.checkbox." + searchContext).checkbox("check")
        $(".ui.checkbox." + searchContext + " input").attr("checked", "checked")   
    } else {
        console.log("No search context available...")
    }
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
        // load news feed
        restc.load_news_items(contextId, function(results) {
            // construct news items
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
}

function load_district_data(handleResults) {
    if (!districts) {
        restc.load_districts(function(results) {
            districts = results.sort(restc.value_sort_asc)
            if (handleResults) handleResults()
        })
    } else {
        handleResults()
    }
}

function get_bezirks_topic_by_id(id) {
    for (var i in districts) {
        if (districts[i].id === id) return districts[i]
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
    restc.logout()
    window.document.location.reload()
}

// --- Leaflet Map Dialog Functionality -- //

function init_map_segment() {
    // ### get page parameter
    // enable circle search
    kiezatlas.render_map(false, false, true, true, false)
    kiezatlas.do_circle_search(undefined, undefined)
    kiezatlas.render_current_location_label()
    var radiusM = leafletMap.get_circle_control_radius()
    console.log("Im Umkreis von", radiusM, " Metern")
    // hide loading indicator
    // use heatmap visualization first
    // set map mode "angebote" oder "einrichtungen"
}

// --- Search Dialog Functionality --- //

function render_search_results() {
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
        console.log("Render search results for searchType", searchType)
        if (searchType === "place") {
            render_place_search_results(from, to, count, $container)
        } else if (searchType === "event") {
             render_event_search_results(from, to, count, $container)
        }
    } else  {
        // ### Wir konnten keine Suchergebnisse finden
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
                + '<a href="/website/geo/'+ el.link.substr((el.link.lastIndexOf("/")+1)) +'"><i class="icon caret right"></i>mehr Infos</a></div></div>')
        }
    }
    if (to > count) {
        hide_more_results_button()
    } else {
        show_more_results_button(count)
        $('.more-results').data("result-from", to)
    }
}

function render_event_search_results(from, to, count, $container) {
    rendering:
    for (var r in results) {
        if (r >= from && r < to) {
            var el = results[r]
            // var anschrift = (el.anschrift) ? el.anschrift.replace(' Deutschland', '') + ', ' : ''
            $container.append(get_event_list_item_html(el))
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
    var location_count = element.locations.length
    var first_assignment = element.locations[get_random_int_inclusive(1, location_count+1)]
    if (!first_assignment) first_assignment = element.locations[0]
    if (first_assignment) {// Angebote werden nur angezeigt wenn sie mindestens ein "Assignment" haben
        var standort_html = (location_count > 1) ? location_count + ' Standorten' : ' einem Standort'
        var zb_html = (location_count > 1) ? 'z.B. vom' : 'Vom'
        var html_string = '<div class="item"><h3 class="thin">' + element.name + '</h3>'
                + '<div class="subline">wird an ' + standort_html + ' angeboten, '
                + zb_html +' <i>'+first_assignment.anfang+'</i> bis </i>'+first_assignment.ende+'</i>, <b>' + first_assignment.name + '</b><br/>'
        if (!is_empty(element.kontakt)) html_string += '<span class="contact">Kontakt: ' + element.kontakt + '</span>'
        // if (element.creator) html_string += '<br/><span class="username">Info von <em>'+element.creator+'</em></span>'
        html_string += '<br/><a href="/angebote/'+ element.id +'"><i class="icon caret right"></i>mehr Infos</a></div></div>'
        return html_string
    }
    return ""
}

function search() {
    // reset search result list container
    to = 0
    $('.more-results').data("result-from", to)
    // ### show loading indicator
    // fire query
    searchText = get_search_input()
    // place search
    // var queryUrl = '/website/search/autocomplete?query=' + encodeURIComponent(searchText)
    var queryUrl = '/website/search/autocomplete?query=' + searchText
    if (searchType === "event") {
        fire_angebote_search(searchText, function(events) {
            results = events.fulltext
            render_search_results()
        })
    } else {
        /** if (_self.get_site_id()) {
            queryUrl = '/website/search/' + _self.get_site_id() + '/?search=' + text
        } **/
        $.getJSON(queryUrl, function (geo_objects) {
            results = geo_objects.results.cat1.results // Einrichtungen
            render_search_results()
        })   
    }
    replace_page_parameters()
}

function get_search_input() {
    return $('#query').val()
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

function hide_more_results_button(count) {
    $('.segment.more-button').addClass('hidden')
    $('.more-results .count').text(count)
}

function replace_page_parameters() {
    parameter.search = searchText
    parameter.searchType = searchType
    parameter.searchMethod = searchMethod
    parameter.searchContext = searchContext
    parameter.searchNearby = searchNearby
    parameter.from = from
    parameter.to = to
    var url = window.document.location.origin + window.document.location.pathname
    url += "?search=" + searchText + "&type=" + searchType + "&method=" + searchMethod + "&context=" + searchContext
            + "&nearby=" + encodeURIComponent(searchNearby)
    /** if (frontpage) {
        url += create_viewport_parameter()
    } **/
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
        viewportState = "&koordinate=" + mapView.center.lat.toFixed(5) + "," + mapView.center.lng.toFixed(5) + "&zoomstufe=" + mapView.zoom
    }
    return viewportState
}

/** --- UI Handlers --- **/

/** function einrichtungenChecked() {
    console.log("einrichtungenChecked")
    $('.ui.grid.filter .column.angebote-tags').addClass('hidden')
    searchType = "places"
}

function angeboteChecked() {
    console.log("angeboteChecked")
    $('.ui.grid.filter .column.angebote-tags').removeClass('hidden')
    searchType = "events"
} **/

function search_menu_changed(value, text, $selectedItem) {
    searchType = value
    console.log("searchType menu changed to", searchType)
    replace_page_parameters()
}

function quickSearchChecked() {
    console.log("quickSearchChecked")
    searchMethod = "quick" // or "fulltext"
    replace_page_parameters()
    return true
}

function fulltextSearchChecked() {
    console.log("fulltextSearchChecked")
    searchMethod = "fulltext" // or "quick"
    replace_page_parameters()
    return true
}

function nearbySearchChecked() {
    console.log("nearbySearchChecked")
    $('.ui.grid.filter .column.nearby').removeClass('hidden')
    searchNearby = "" // Clearing for user input
    replace_page_parameters()
    return true
}

function berlinSearchChecked(e) {
    console.log("berlinSearchChecked", e.id)
    $('.ui.grid.filter .column.nearby').addClass('hidden')
    searchNearby = e.id
    replace_page_parameters()
    return true
}

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

function handleSearchInput(e) {
    if (event.keyCode === 13) {
        if (e.id === "query") {
            search(render_search_results)
        } else if (e.id === "streetnr") {
            searchNearby = e.value.trim()
            console.log("Updated search nearby value", searchNearby)
            search(render_search_results)
        }
    }
}
