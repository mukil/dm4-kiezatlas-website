
var results = [],
    MAX_RESULTS = 7,
    from = undefined,
    to = 0,
    searchType = "places", // or "events"
    searchContext = 0 // 0=berlin-wide, otherwise long district or site id

function init_detail_page() {
    init_detail_map() // defined in "website-detail" template
}

function init_page() {
    $('.ui.checkbox').checkbox()
    $('.ui.dropdown').dropdown()
}

function init_map_segment() {
    // fetch and set items to render
    // leafletMap.set_items()
    // hide loading indicator
    // use heatmap visualization first
    // set map mode "angebote" oder "einrichtungen"
    // enable circle search
}

function render_search_results() {
    var $container = $('.result-list .container')
    var count = results.length
    // New from
    from = $('.more-results').data("result-from")
    // New to
    to += MAX_RESULTS
    console.log("render results", from, to)
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
        console.log("Found", results, "Einrichtungen")
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
