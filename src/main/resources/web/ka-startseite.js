
// --- Frontpage State --- //

var results = [],
    MAX_RESULTS = 7,
    from = undefined,
    to = 0,
    searchType = "places", // or "events"
    searchContext = 0, // 0=berlin-wide, otherwise number (ID) of district or site topic
    updateURL = true, // If false, updating the url using replaceState is defunct (see text search requests)
    query = undefined, // Search User Input
    parameter = {               // View/Page Parameter
        page: undefined, viewport: undefined
    },
    settings = {
        "webapp_title" : "Kiezatlas 2 Website",
        "history_api_supported" : window.history.pushState
    },
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
    }


// --- Page Methods -- //

function init_page() {
    $('.ui.checkbox').checkbox()
    $('.ui.dropdown').dropdown()
    // init_map_segment()
    kiezatlas.render_page()
}

function init_einrichtungs_page() {
    init_detail_map() // defined in "website-detail" template
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
        rendering:
        for (var r in results) {
            if (r >= from && r < to) {
                var el = results[r]
                // var anschrift = (el.anschrift) ? el.anschrift.replace(' Deutschland', '') + ', ' : ''
                $container.append('<div class="item"><h3 class="thin">' + el.name + '</h3>'
                    + '<div class="subline">' + el.zusatz +'<br/>'
                    + '<a href="/website/geo/redesign/'+ el.link.substr((el.link.lastIndexOf("/")+1)) +'"><i class="icon caret right"></i>mehr Infos</a></div></div>')
            }
        }
        if (to > count) {
            hide_more_results_button()
        } else {
            show_more_results_button(count)
            $('.more-results').data("result-from", to)
        }
    } else {
        // ### Wir konnten keine Suchergebnisse finden
    }
}

function search() {
    // reset search result list container
    to = 0
    $('.more-results').data("result-from", to)
    // ### show loading indicator
    // fire query
    var text = get_search_input()
    var queryUrl = '/website/search/autocomplete?query='+text
    /** if (_self.get_site_id()) {
        queryUrl = '/website/search/' + _self.get_site_id() + '/?search=' + text
    } **/
    $.getJSON(queryUrl, function (geo_objects) {
        results = geo_objects.results.cat1.results // Einrichtungen
        render_search_results()
    })
    // ### update query parameter
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

/** -- UI Handlers -- **/

function einrichtungenChecked() {
    console.log("einrichtungenChecked")
    $('.ui.grid.filter .column.angebote-tags').addClass('hidden')
    searchType = "places"
}

function angeboteChecked() {
    console.log("angeboteChecked")
    $('.ui.grid.filter .column.angebote-tags').removeClass('hidden')
    searchType = "events"
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

function handleSearchInput() {
    if (event.keyCode === 13) {
        search(render_search_results)
    }
}
